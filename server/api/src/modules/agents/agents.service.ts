import {
  canTransition,
} from "../applications/application.pipeline.ts";
import type { ApplicationStage } from "../applications/application.model.ts";
import * as applicationsService from "../applications/applications.service.ts";
import Application from "../applications/application.model.ts";
import * as interviewsService from "../interviews/interviews.service.ts";
import Job from "../jobs/job.model.ts";
import * as jobsService from "../jobs/jobs.service.ts";
import * as offersService from "../offers/offers.service.ts";
import { AppError } from "../../utils/App.Error.ts";
import { runAgent as runAiAgent } from "../ai-clients/ai.client.ts";

export type AgentName = "recruiter" | "interview" | "hr";

type RunInput = {
  agent: AgentName;
  payload: Record<string, unknown>;
  userId: string;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBool(value: unknown): boolean {
  return value === true || value === "true";
}

/** Walk forward one legal step at a time toward a target stage. */
async function advanceToward(applicationId: string, target: ApplicationStage) {
  const steps: ApplicationStage[] = [];
  let current = await Application.findById(applicationId);
  if (!current) throw new AppError("Application not found", 404, "NOT_FOUND");

  let from = current.stage as ApplicationStage;
  const guard = 8;
  for (let i = 0; i < guard && from !== target; i += 1) {
    if (canTransition(from, target)) {
      await applicationsService.updateApplicationStage(applicationId, target);
      steps.push(target);
      from = target;
      break;
    }
    const order: ApplicationStage[] = [
      "applied",
      "screened",
      "assessment",
      "interview",
      "offer",
      "hired",
    ];
    const fromIdx = order.indexOf(from);
    const next = order[fromIdx + 1];
    if (!next || !canTransition(from, next)) break;
    await applicationsService.updateApplicationStage(applicationId, next);
    steps.push(next);
    from = next;
  }

  return { applicationId, stage: from, steps };
}

async function executeRecruiter(payload: Record<string, unknown>, _userId: string) {
  const jobId = asString(payload.jobId);
  if (!jobId) throw new AppError("jobId is required to execute recruiter agent", 400, "JOB_ID_REQUIRED");

  const rankings = await jobsService.getJobRankings(jobId);
  const ranked = rankings.map((row) => {
    const doc = row as {
      _id: { toString(): string };
      aiScore?: number;
      stage?: string;
      candidateId?: { name?: string; email?: string };
    };
    return {
      applicationId: doc._id.toString(),
      aiScore: doc.aiScore ?? 0,
      stage: doc.stage,
      name: doc.candidateId?.name,
      email: doc.candidateId?.email,
    };
  });

  const preferred = asString(payload.applicationId);
  const top = preferred
    ? ranked.find((r) => r.applicationId === preferred)
    : ranked[0];

  if (!top) {
    return {
      action: "shortlist",
      message: "No applications found for this job",
      rankedCandidates: ranked,
      advanced: null,
    };
  }

  const advanced = await advanceToward(top.applicationId, "screened");
  // Prefer interview-ready shortlist when already screened
  if (advanced.stage === "screened" || advanced.stage === "assessment") {
    // leave at screened / assessment — interview agent will take over
  }

  return {
    action: "shortlist",
    rankedCandidates: ranked.slice(0, 10),
    selectedApplicationId: top.applicationId,
    advanced,
  };
}

async function executeInterview(payload: Record<string, unknown>, userId: string) {
  const applicationId = asString(payload.applicationId);
  if (!applicationId) {
    throw new AppError(
      "applicationId is required to execute interview agent",
      400,
      "APPLICATION_ID_REQUIRED",
    );
  }

  // Ensure stage can reach interview (createInterview also sets stage)
  await advanceToward(applicationId, "interview");

  const interview = await interviewsService.createInterview({
    applicationId,
    createdBy: userId,
  });

  const withQuestions = await interviewsService.generateQuestions(interview._id.toString());

  let scheduled = null as Awaited<ReturnType<typeof interviewsService.scheduleInterview>> | null;
  const scheduledAt = asString(payload.scheduledAt);
  if (scheduledAt) {
    scheduled = await interviewsService.scheduleInterview({
      id: interview._id.toString(),
      scheduledAt,
      durationMinutes: typeof payload.durationMinutes === "number" ? payload.durationMinutes : 60,
    });
  }

  return {
    action: "prepare_interview",
    interviewId: interview._id.toString(),
    questions: withQuestions.questions,
    scheduled: scheduled
      ? {
          status: scheduled.status,
          scheduledAt: scheduled.scheduledAt,
          meetingUrl: scheduled.meetingUrl,
          calendarLink: scheduled.calendarLink,
        }
      : null,
  };
}

async function executeHr(payload: Record<string, unknown>, userId: string) {
  const applicationId = asString(payload.applicationId);
  if (!applicationId) {
    throw new AppError("applicationId is required to execute HR agent", 400, "APPLICATION_ID_REQUIRED");
  }

  const salary =
    typeof payload.salary === "number"
      ? payload.salary
      : typeof payload.salary === "string" && payload.salary
        ? Number(payload.salary)
        : undefined;

  const offer = await offersService.createOffer({
    applicationId,
    createdBy: userId,
    ...(salary !== undefined && !Number.isNaN(salary) ? { salary } : {}),
  });

  let sent = null as Awaited<ReturnType<typeof offersService.sendOffer>> | null;
  if (asBool(payload.send) || asBool(payload.accept)) {
    sent = await offersService.sendOffer(offer._id.toString());
  }

  let responded = null as Awaited<ReturnType<typeof offersService.respondToOffer>> | null;
  if (asBool(payload.accept)) {
    responded = await offersService.respondToOffer(
      (sent ?? offer)._id.toString(),
      "accepted",
    );
  }

  return {
    action: "draft_offer",
    offerId: offer._id.toString(),
    salary: offer.salary,
    currency: offer.currency,
    status: responded?.status ?? sent?.status ?? offer.status,
    signingUrl: sent?.signingUrl,
    onboardingCreated: Boolean(responded && responded.status === "accepted"),
  };
}

/**
 * Run AI advisory, optionally execute real pipeline mutations.
 * FastAPI stays advisory; Express owns DB side effects.
 */
export async function runAgentOrchestrated(input: RunInput) {
  const execute = asBool(input.payload.execute);
  const jobId = asString(input.payload.jobId);

  // Enrich recruiter advisory with live rankings when jobId present
  let advisoryPayload = { ...input.payload };
  if (input.agent === "recruiter" && jobId) {
    const job = await Job.findById(jobId);
    const rankings = await jobsService.getJobRankings(jobId);
    advisoryPayload = {
      ...advisoryPayload,
      jdText:
        asString(advisoryPayload.jdText) ??
        (job ? `${job.title}\n${job.description}` : "Software Engineer"),
      title: asString(advisoryPayload.title) ?? job?.title,
      candidates: rankings.map((row) => {
        const doc = row as {
          _id: { toString(): string };
          aiScore?: number;
          candidateId?: { name?: string; email?: string };
        };
        return {
          applicationId: doc._id.toString(),
          aiScore: doc.aiScore ?? 0,
          name: doc.candidateId?.name,
          email: doc.candidateId?.email,
        };
      }),
    };
  }

  if (input.agent === "interview" && jobId && !asString(advisoryPayload.jdText)) {
    const job = await Job.findById(jobId);
    if (job) {
      advisoryPayload.jdText = `${job.title}\n${job.description}`;
      advisoryPayload.skills = job.skills ?? [];
    }
  }

  if (input.agent === "hr" && jobId && !asString(advisoryPayload.title)) {
    const job = await Job.findById(jobId);
    if (job) advisoryPayload.title = job.title;
  }

  const advisory = await runAiAgent({ agent: input.agent, payload: advisoryPayload });

  if (!execute) {
    return { advisory, executed: null };
  }

  let executed: unknown;
  switch (input.agent) {
    case "recruiter":
      executed = await executeRecruiter(input.payload, input.userId);
      break;
    case "interview":
      executed = await executeInterview(input.payload, input.userId);
      break;
    case "hr":
      executed = await executeHr(input.payload, input.userId);
      break;
    default:
      throw new AppError("Unknown agent", 400, "INVALID_AGENT");
  }

  return { advisory, executed };
}
