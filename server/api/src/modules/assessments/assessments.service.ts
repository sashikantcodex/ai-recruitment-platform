import { Types } from "mongoose";
import { integrations } from "../../integrations/index.ts";
import { AppError } from "../../utils/App.Error.ts";
import {
  gradeAssessment as aiGradeAssessment,
  generateAssessment,
} from "../ai-clients/ai.client.ts";
import Application from "../applications/application.model.ts";
import { canTransition } from "../applications/application.pipeline.ts";
import type { ApplicationStage } from "../applications/application.model.ts";
import Candidate from "../candidates/candidate.model.ts";
import Job from "../jobs/job.model.ts";
import Assessment, { type QuestionType } from "./assessment.model.ts";
import Attempt, { type AttemptStatus } from "./attempt.model.ts";
import {
  attemptExpiry,
  canAdvanceAttempt,
  didPass,
  generateAttemptToken,
  isExpired,
  remainingMinutes,
  toCandidateQuestion,
} from "./assessment.helpers.ts";

type QuestionInput = {
  prompt: string;
  type?: QuestionType | undefined;
  options?: string[] | undefined;
  correctIndex?: number | undefined;
  expected?: string | undefined;
  weight?: number | undefined;
  skill?: string | undefined;
};

export async function createAssessment(input: {
  title: string;
  jobId?: string | undefined;
  skills?: string[] | undefined;
  difficulty?: "easy" | "medium" | "hard" | undefined;
  durationMinutes?: number | undefined;
  passingScore?: number | undefined;
  questions: QuestionInput[];
  createdBy: string;
}) {
  if (!input.questions.length) {
    throw new AppError("An assessment needs at least one question", 400, "NO_QUESTIONS");
  }
  return Assessment.create({
    title: input.title,
    ...(input.jobId ? { jobId: new Types.ObjectId(input.jobId) } : {}),
    ...(input.skills ? { skills: input.skills } : {}),
    ...(input.difficulty ? { difficulty: input.difficulty } : {}),
    ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
    ...(input.passingScore !== undefined ? { passingScore: input.passingScore } : {}),
    questions: input.questions,
    createdBy: new Types.ObjectId(input.createdBy),
  });
}

/** Build a job-specific assessment with the AI service and save it. */
export async function generateForJob(input: {
  jobId: string;
  numQuestions?: number | undefined;
  difficulty?: "easy" | "medium" | "hard" | undefined;
  createdBy: string;
}) {
  const job = await Job.findById(input.jobId);
  if (!job) throw new AppError("Job not found", 404, "JOB_NOT_FOUND");

  const generated = await generateAssessment({
    jobTitle: job.title,
    jdText: job.description,
    skills: job.skills ?? [],
    ...(input.numQuestions ? { numQuestions: input.numQuestions } : {}),
    ...(input.difficulty ? { difficulty: input.difficulty } : {}),
  });

  return Assessment.create({
    title: generated.title,
    jobId: job._id,
    skills: job.skills ?? [],
    difficulty: input.difficulty ?? "medium",
    durationMinutes: generated.durationMinutes,
    passingScore: generated.passingScore,
    questions: generated.questions.map((q) => ({
      prompt: q.prompt,
      type: q.type,
      options: q.options,
      ...(q.correctIndex !== null ? { correctIndex: q.correctIndex } : {}),
      expected: q.expected,
      weight: q.weight,
      skill: q.skill,
    })),
    createdBy: new Types.ObjectId(input.createdBy),
  });
}

export async function listAssessments(jobId?: string) {
  const filter = jobId ? { jobId } : {};
  return Assessment.find(filter).populate("jobId", "title").sort({ createdAt: -1 });
}

export async function getAssessment(id: string) {
  const assessment = await Assessment.findById(id).populate("jobId", "title");
  if (!assessment) throw new AppError("Assessment not found", 404, "NOT_FOUND");
  return assessment;
}

/** Invite a candidate to take an assessment and email them the link. */
export async function inviteCandidate(input: {
  assessmentId: string;
  applicationId: string;
  validDays?: number | undefined;
}) {
  const assessment = await getAssessment(input.assessmentId);
  const application = await Application.findById(input.applicationId);
  if (!application) throw new AppError("Application not found", 404, "NOT_FOUND");

  const open = await Attempt.findOne({
    applicationId: application._id,
    assessmentId: assessment._id,
    status: { $in: ["invited", "in_progress"] },
  });
  if (open) {
    throw new AppError(
      "This candidate already has an open invite for this assessment",
      409,
      "DUPLICATE_INVITE",
    );
  }

  const now = new Date();
  const attempt = await Attempt.create({
    assessmentId: assessment._id,
    applicationId: application._id,
    candidateId: application.candidateId,
    token: generateAttemptToken(),
    status: "invited",
    invitedAt: now,
    expiresAt: attemptExpiry(now, input.validDays ?? 7),
  });

  const stage = application.stage as ApplicationStage;
  if (canTransition(stage, "assessment")) {
    await Application.findByIdAndUpdate(application._id, { stage: "assessment" });
  }

  const candidate = await Candidate.findById(application.candidateId);
  await integrations.email.sendEmail({
    to: candidate?.email ?? "candidate@stub.local",
    subject: `Assessment invite: ${assessment.title}`,
    body:
      `You have been invited to complete "${assessment.title}" ` +
      `(${assessment.durationMinutes} minutes).\n` +
      `Start here: /assessment/${attempt.token}\n` +
      `This link expires ${attempt.expiresAt.toISOString()}.`,
  });

  return attempt;
}

export async function listAttempts(filter: { applicationId?: string; status?: string }) {
  const query: Record<string, unknown> = {};
  if (filter.applicationId) query.applicationId = filter.applicationId;
  if (filter.status) query.status = filter.status;
  return Attempt.find(query)
    .populate("assessmentId", "title passingScore durationMinutes")
    .populate("candidateId", "name email")
    .sort({ createdAt: -1 });
}

async function loadAttemptByToken(token: string) {
  const attempt = await Attempt.findOne({ token });
  if (!attempt) throw new AppError("Assessment link is not valid", 404, "NOT_FOUND");
  const assessment = await Assessment.findById(attempt.assessmentId);
  if (!assessment) throw new AppError("Assessment not found", 404, "NOT_FOUND");
  return { attempt, assessment };
}

/** Candidate-facing view of an attempt — questions with the answer key stripped. */
export async function getAttemptByToken(token: string) {
  const { attempt, assessment } = await loadAttemptByToken(token);

  if (isExpired(attempt, assessment.durationMinutes ?? 45)) {
    if (attempt.status !== "expired") {
      attempt.status = "expired";
      await attempt.save();
    }
    throw new AppError("This assessment link has expired", 410, "ATTEMPT_EXPIRED");
  }

  return {
    token: attempt.token,
    status: attempt.status,
    title: assessment.title,
    durationMinutes: assessment.durationMinutes,
    remainingMinutes: remainingMinutes(attempt, assessment.durationMinutes ?? 45),
    questions: assessment.questions.map(toCandidateQuestion),
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
  };
}

/** Start the in-test timer. Idempotent — re-starting keeps the original clock. */
export async function startAttempt(token: string) {
  const { attempt, assessment } = await loadAttemptByToken(token);

  if (attempt.status === "invited") {
    if (!canAdvanceAttempt(attempt.status as AttemptStatus, "in_progress")) {
      throw new AppError("Assessment cannot be started", 400, "INVALID_ATTEMPT_STATUS");
    }
    attempt.status = "in_progress";
    attempt.startedAt = new Date();
    await attempt.save();
  } else if (attempt.status !== "in_progress") {
    throw new AppError(
      `Assessment is ${attempt.status} and cannot be started`,
      400,
      "INVALID_ATTEMPT_STATUS",
    );
  }

  return {
    token: attempt.token,
    status: attempt.status,
    startedAt: attempt.startedAt,
    remainingMinutes: remainingMinutes(attempt, assessment.durationMinutes ?? 45),
  };
}

/**
 * Submit answers, grade them via the AI service, and move the application
 * forward to interview on a pass.
 */
export async function submitAttempt(
  token: string,
  answers: Array<{
    questionIndex: number;
    selectedIndex?: number | undefined;
    response?: string | undefined;
  }>,
) {
  const { attempt, assessment } = await loadAttemptByToken(token);

  if (isExpired(attempt, assessment.durationMinutes ?? 45)) {
    attempt.status = "expired";
    await attempt.save();
    throw new AppError("Time is up for this assessment", 410, "ATTEMPT_EXPIRED");
  }
  if (attempt.status !== "in_progress" && attempt.status !== "invited") {
    throw new AppError(
      `Assessment already ${attempt.status}`,
      400,
      "INVALID_ATTEMPT_STATUS",
    );
  }

  // Drop absent keys so an unanswered MCQ never reads as "selected index 0".
  const normalized = answers.map((a) => ({
    questionIndex: a.questionIndex,
    ...(a.selectedIndex !== undefined ? { selectedIndex: a.selectedIndex } : {}),
    ...(a.response !== undefined ? { response: a.response } : {}),
  }));

  const graded = await aiGradeAssessment({
    questions: assessment.questions.map((q) => ({
      prompt: q.prompt,
      type: (q.type ?? "mcq") as QuestionType,
      options: q.options ?? [],
      correctIndex: q.correctIndex ?? null,
      expected: q.expected ?? "",
      weight: q.weight ?? 1,
    })),
    answers: normalized,
  });

  const passed = didPass(graded.score, assessment.passingScore ?? 60);
  attempt.set("answers", normalized);
  attempt.status = "graded";
  attempt.submittedAt = new Date();
  attempt.score = graded.score;
  attempt.passed = passed;
  attempt.set("grading", graded.perQuestion);
  attempt.gradingSummary = graded.summary;
  await attempt.save();

  const application = await Application.findById(attempt.applicationId);
  if (application && passed) {
    const stage = application.stage as ApplicationStage;
    if (canTransition(stage, "interview")) {
      await Application.findByIdAndUpdate(application._id, { stage: "interview" });
    }
  }

  return {
    token: attempt.token,
    status: attempt.status,
    score: graded.score,
    passed,
    passingScore: assessment.passingScore,
    summary: graded.summary,
  };
}

/** Recruiter-facing attempt detail, including per-question grading. */
export async function getAttempt(id: string) {
  const attempt = await Attempt.findById(id)
    .populate("assessmentId", "title passingScore durationMinutes questions")
    .populate("candidateId", "name email");
  if (!attempt) throw new AppError("Attempt not found", 404, "NOT_FOUND");
  return attempt;
}
