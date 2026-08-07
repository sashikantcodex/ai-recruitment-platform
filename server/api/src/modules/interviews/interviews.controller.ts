import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import * as service from "./interviews.service.ts";

function id(param: string | string[] | undefined) {
  if (typeof param !== "string") throw new AppError("Invalid id", 400, "INVALID_ID");
  return param;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = z
    .object({
      applicationId: z.string(),
      panelists: z.array(z.string()).optional(),
    })
    .parse(req.body);
  res.status(201).json(
    await service.createInterview({
      applicationId: body.applicationId,
      createdBy: req.user.id,
      ...(body.panelists ? { panelists: body.panelists } : {}),
    }),
  );
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listInterviews());
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getInterview(id(req.params.id)));
});

export const schedule = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      scheduledAt: z.string(),
      durationMinutes: z.number().optional(),
    })
    .parse(req.body);
  res.json(
    await service.scheduleInterview({
      id: id(req.params.id),
      scheduledAt: body.scheduledAt,
      ...(body.durationMinutes !== undefined
        ? { durationMinutes: body.durationMinutes }
        : {}),
    }),
  );
});

export const reschedule = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      scheduledAt: z.string(),
      durationMinutes: z.number().optional(),
    })
    .parse(req.body);
  res.json(
    await service.rescheduleInterview({
      id: id(req.params.id),
      scheduledAt: body.scheduledAt,
      ...(body.durationMinutes !== undefined
        ? { durationMinutes: body.durationMinutes }
        : {}),
    }),
  );
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.cancelInterview(id(req.params.id)));
});

export const reminder = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.sendReminder(id(req.params.id)));
});

export const questions = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.generateQuestions(id(req.params.id)));
});

export const scorecard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = z
    .object({
      technical: z.number().min(0).max(5),
      communication: z.number().min(0).max(5),
      culture: z.number().min(0).max(5),
      notes: z.string().optional(),
      recommendation: z.enum(["strong_yes", "yes", "no", "strong_no"]),
    })
    .parse(req.body);
  res.json(await service.saveScorecard(id(req.params.id), body, req.user.id));
});

export const notesSummary = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.summarizeNotes(id(req.params.id)));
});
