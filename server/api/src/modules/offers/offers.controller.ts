import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import * as service from "./offers.service.ts";

function id(param: string | string[] | undefined) {
  if (typeof param !== "string") throw new AppError("Invalid id", 400, "INVALID_ID");
  return param;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = z
    .object({ applicationId: z.string(), salary: z.number().optional() })
    .parse(req.body);
  res.status(201).json(
    await service.createOffer({
      applicationId: body.applicationId,
      createdBy: req.user.id,
      ...(body.salary !== undefined ? { salary: body.salary } : {}),
    }),
  );
});

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.listOffers());
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.getOffer(id(req.params.id)));
});

export const send = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.sendOffer(id(req.params.id)));
});

export const respond = asyncHandler(async (req: Request, res: Response) => {
  const body = z.object({ decision: z.enum(["accepted", "declined"]) }).parse(req.body);
  res.json(await service.respondToOffer(id(req.params.id), body.decision));
});
