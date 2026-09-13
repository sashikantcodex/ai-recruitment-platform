import { Types } from "mongoose";
import { AppError } from "../../utils/App.Error.ts";
import { summarizeEvaluation } from "../ai-clients/ai.client.ts";
import Application from "../applications/application.model.ts";
import { canTransition } from "../applications/application.pipeline.ts";
import type { ApplicationStage } from "../applications/application.model.ts";
import Attempt from "../assessments/attempt.model.ts";
import Interview from "../interviews/interview.model.ts";
import Job from "../jobs/job.model.ts";
import Evaluation, { type EvaluationDecision } from "./evaluation.model.ts";
import {
  bestAttemptScore,
  decisionToStage,
  hasSignal,
  scorecardPercent,
} from "./evaluation.helpers.ts";

/**
 * Blend AI screening, assessment and every interview scorecard into one
 * consolidated evaluation. Re-running refreshes it in place.
 */
export async function generateEvaluation(applicationId: string, userId: string) {
  const application = await Application.findById(applicationId);
  if (!application) throw new AppError("Application not found", 404, "NOT_FOUND");

  const job = await Job.findById(application.jobId);
  if (!job) throw new AppError("Job not found", 404, "JOB_NOT_FOUND");

  const [attempts, interviews] = await Promise.all([
    Attempt.find({ applicationId: application._id }).select("status score"),
    Interview.find({ applicationId: application._id }).select("scorecard mode status"),
  ]);

  const scored = interviews
    .filter((i) => i.scorecard)
    .map((i) => ({
      technical: i.scorecard?.technical ?? 0,
      communication: i.scorecard?.communication ?? 0,
      culture: i.scorecard?.culture ?? 0,
      recommendation: i.scorecard?.recommendation ?? "",
      source: i.mode ?? "live",
    }));

  const interviewPercents = scored
    .map((s) => scorecardPercent(s))
    .filter((v): v is number => v !== null);
  const interviewScore = interviewPercents.length
    ? Math.round(
        (interviewPercents.reduce((sum, v) => sum + v, 0) / interviewPercents.length) * 100,
      ) / 100
    : null;

  const signals = {
    screeningScore: application.aiScore ?? null,
    assessmentScore: bestAttemptScore(attempts),
    interviewScore,
    interviewCount: scored.length,
  };

  if (!hasSignal(signals)) {
    throw new AppError(
      "No screening, assessment or interview signal to evaluate yet",
      400,
      "NO_EVALUATION_SIGNAL",
    );
  }

  const summary = await summarizeEvaluation({
    jobTitle: job.title,
    screeningScore: signals.screeningScore,
    assessmentScore: signals.assessmentScore,
    interviews: scored,
    matchedSkills: application.matchedSkills ?? [],
    missingSkills: application.missingSkills ?? [],
  });

  return Evaluation.findOneAndUpdate(
    { applicationId: application._id },
    {
      applicationId: application._id,
      candidateId: application.candidateId,
      jobId: application.jobId,
      overallScore: summary.overallScore,
      recommendation: summary.recommendation,
      signals,
      strengths: summary.strengths,
      concerns: summary.concerns,
      summary: summary.summary,
      generatedBy: new Types.ObjectId(userId),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

export async function listEvaluations(filter: { jobId?: string; applicationId?: string }) {
  const query: Record<string, unknown> = {};
  if (filter.jobId) query.jobId = filter.jobId;
  if (filter.applicationId) query.applicationId = filter.applicationId;
  return Evaluation.find(query)
    .populate("candidateId", "name email")
    .populate("jobId", "title")
    .sort({ overallScore: -1, createdAt: -1 });
}

export async function getEvaluationByApplication(applicationId: string) {
  const evaluation = await Evaluation.findOne({ applicationId })
    .populate("candidateId", "name email")
    .populate("jobId", "title");
  if (!evaluation) throw new AppError("Evaluation not found", 404, "NOT_FOUND");
  return evaluation;
}

/**
 * Record a human hire/hold/reject decision and move the application with it.
 * `hire` advances toward offer; `reject` closes the application out.
 */
export async function decideEvaluation(input: {
  applicationId: string;
  decision: EvaluationDecision;
  note?: string;
  userId: string;
}) {
  const evaluation = await Evaluation.findOne({ applicationId: input.applicationId });
  if (!evaluation) {
    throw new AppError(
      "Generate an evaluation before recording a decision",
      404,
      "EVALUATION_NOT_FOUND",
    );
  }

  const application = await Application.findById(input.applicationId);
  if (!application) throw new AppError("Application not found", 404, "NOT_FOUND");

  const targetStage = decisionToStage(input.decision);
  if (targetStage) {
    const from = application.stage as ApplicationStage;
    if (!canTransition(from, targetStage)) {
      throw new AppError(
        `Cannot move application from ${from} to ${targetStage}`,
        400,
        "INVALID_STAGE_TRANSITION",
      );
    }
    await Application.findByIdAndUpdate(application._id, { stage: targetStage });
  }

  evaluation.decision = input.decision;
  evaluation.decidedBy = new Types.ObjectId(input.userId);
  evaluation.decidedAt = new Date();
  if (input.note) evaluation.decisionNote = input.note;
  await evaluation.save();

  return { evaluation, stage: targetStage ?? application.stage };
}
