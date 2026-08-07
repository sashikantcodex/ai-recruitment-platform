import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import * as services from "./applications.service.ts";
import type { ApplicationStage } from "./application.model.ts";

const applySchema = z.object({
  jobId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

const stageSchema = z.object({
  stage: z.enum([
    "applied",
    "screened",
    "assessment",
    "interview",
    "offer",
    "hired",
    "rejected",
  ]),
});

function requireParamId(id: string | string[] | undefined, field = "id"): string {
  if (typeof id !== "string" || !id) {
    throw new AppError(`Invalid ${field}`, 400, "INVALID_ID");
  }
  return id;
}

export const applyWithResume = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError("Resume file is required", 400, "RESUME_REQUIRED");
  }

  const body = applySchema.parse(req.body);
  const application = await services.applyWithResume({
    jobId: body.jobId,
    name: body.name,
    email: body.email,
    file: req.file,
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
  });

  res.status(201).json(application);
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const jobId = typeof req.query.jobId === "string" ? req.query.jobId : undefined;
  res.status(200).json(await services.listApplications(jobId));
});

export const getApplication = asyncHandler(async (req: Request, res: Response) => {
  const applicationId = requireParamId(req.params.applicationId, "applicationId");
  res.status(200).json(await services.getApplicationById(applicationId));
});

export const updateStage = asyncHandler(async (req: Request, res: Response) => {
  const body = stageSchema.parse(req.body);
  const applicationId = requireParamId(req.params.applicationId, "applicationId");
  res.status(200).json(
    await services.updateApplicationStage(applicationId, body.stage as ApplicationStage),
  );
});
