import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { EVALUATION_DECISIONS } from "./evaluation.model.ts";
import * as service from "./evaluations.service.ts";

function id(param: string | string[] | undefined, label = "id"): string {
  if (typeof param !== "string" || !param) {
    throw new AppError(`Invalid ${label}`, 400, "INVALID_ID");
  }
  return param;
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    await service.listEvaluations({
      ...(typeof req.query.jobId === "string" ? { jobId: req.query.jobId } : {}),
      ...(typeof req.query.applicationId === "string"
        ? { applicationId: req.query.applicationId }
        : {}),
    }),
  );
});

export const generate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = z.object({ applicationId: z.string().min(1) }).parse(req.body);
  res.status(201).json(await service.generateEvaluation(body.applicationId, req.user.id));
});

export const getByApplication = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    await service.getEvaluationByApplication(
      id(req.params.applicationId, "application id"),
    ),
  );
});

export const decide = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = z
    .object({
      decision: z.enum(EVALUATION_DECISIONS),
      note: z.string().optional(),
    })
    .parse(req.body);

  res.json(
    await service.decideEvaluation({
      applicationId: id(req.params.applicationId, "application id"),
      decision: body.decision,
      ...(body.note !== undefined ? { note: body.note } : {}),
      userId: req.user.id,
    }),
  );
});
