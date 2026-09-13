import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { QUESTION_TYPES } from "./assessment.model.ts";
import * as service from "./assessments.service.ts";

function id(param: string | string[] | undefined, label = "id"): string {
  if (typeof param !== "string" || !param) {
    throw new AppError(`Invalid ${label}`, 400, "INVALID_ID");
  }
  return param;
}

const questionSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(QUESTION_TYPES).optional(),
  options: z.array(z.string()).optional(),
  correctIndex: z.number().int().min(0).optional(),
  expected: z.string().optional(),
  weight: z.number().positive().optional(),
  skill: z.string().optional(),
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = z
    .object({
      title: z.string().min(1),
      jobId: z.string().optional(),
      skills: z.array(z.string()).optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      durationMinutes: z.number().int().positive().optional(),
      passingScore: z.number().min(0).max(100).optional(),
      questions: z.array(questionSchema).min(1),
    })
    .parse(req.body);

  res.status(201).json(await service.createAssessment({ ...body, createdBy: req.user.id }));
});

export const generate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = z
    .object({
      jobId: z.string().min(1),
      numQuestions: z.number().int().min(1).max(30).optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    })
    .parse(req.body);

  res.status(201).json(await service.generateForJob({ ...body, createdBy: req.user.id }));
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const jobId = typeof req.query.jobId === "string" ? req.query.jobId : undefined;
  res.json(await service.listAssessments(jobId));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getAssessment(id(req.params.id, "assessment id")));
});

export const invite = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      applicationId: z.string().min(1),
      validDays: z.number().int().min(1).max(60).optional(),
    })
    .parse(req.body);

  res.status(201).json(
    await service.inviteCandidate({
      assessmentId: id(req.params.id, "assessment id"),
      ...body,
    }),
  );
});

export const listAttempts = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    await service.listAttempts({
      ...(typeof req.query.applicationId === "string"
        ? { applicationId: req.query.applicationId }
        : {}),
      ...(typeof req.query.status === "string" ? { status: req.query.status } : {}),
    }),
  );
});

export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getAttempt(id(req.params.attemptId, "attempt id")));
});

// --- Candidate-facing (token auth, no login) ---------------------------

export const publicGetAttempt = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getAttemptByToken(id(req.params.token, "token")));
});

export const publicStart = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.startAttempt(id(req.params.token, "token")));
});

export const publicSubmit = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      answers: z
        .array(
          z.object({
            questionIndex: z.number().int().min(0),
            selectedIndex: z.number().int().min(0).optional(),
            response: z.string().optional(),
          }),
        )
        .min(1),
    })
    .parse(req.body);

  res.json(await service.submitAttempt(id(req.params.token, "token"), body.answers));
});
