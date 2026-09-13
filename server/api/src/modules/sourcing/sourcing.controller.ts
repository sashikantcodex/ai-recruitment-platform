import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { PROSPECT_STATUSES, SOURCING_SOURCES } from "./sourcing.model.ts";
import * as service from "./sourcing.service.ts";

function id(param: string | string[] | undefined, label = "id"): string {
  if (typeof param !== "string" || !param) {
    throw new AppError(`Invalid ${label}`, 400, "INVALID_ID");
  }
  return param;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = z
    .object({
      jobId: z.string().min(1),
      name: z.string().optional(),
      sources: z.array(z.enum(SOURCING_SOURCES)).optional(),
      minMatchScore: z.number().min(0).max(100).optional(),
    })
    .parse(req.body);

  const campaign = await service.createCampaign({ ...body, createdBy: req.user.id });
  res.status(201).json(campaign);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const jobId = typeof req.query.jobId === "string" ? req.query.jobId : undefined;
  res.json(await service.listCampaigns(jobId));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getCampaign(id(req.params.id, "campaign id")));
});

export const search = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.searchProspects(id(req.params.id, "campaign id")));
});

export const addProspect = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      skills: z.array(z.string()).optional(),
      location: z.string().optional(),
    })
    .parse(req.body);
  res.status(201).json(
    await service.addProspect(id(req.params.id, "campaign id"), body),
  );
});

export const contact = asyncHandler(async (req: Request, res: Response) => {
  res.json(
    await service.contactProspect(
      id(req.params.id, "campaign id"),
      id(req.params.prospectId, "prospect id"),
    ),
  );
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const body = z.object({ status: z.enum(PROSPECT_STATUSES) }).parse(req.body);
  res.json(
    await service.updateProspectStatus(
      id(req.params.id, "campaign id"),
      id(req.params.prospectId, "prospect id"),
      body.status,
    ),
  );
});

export const convert = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(
    await service.convertProspect(
      id(req.params.id, "campaign id"),
      id(req.params.prospectId, "prospect id"),
    ),
  );
});
