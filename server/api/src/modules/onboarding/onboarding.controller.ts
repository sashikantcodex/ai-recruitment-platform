import type { Request, Response } from "express";
import { z } from "zod";
import { integrations } from "../../integrations/index.ts";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import OnboardingPacket from "./onboarding.model.ts";

function id(param: string | string[] | undefined) {
  if (typeof param !== "string") throw new AppError("Invalid id", 400, "INVALID_ID");
  return param;
}

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json(
    await OnboardingPacket.find()
      .populate("candidateId", "name email")
      .populate("offerId")
      .sort({ createdAt: -1 }),
  );
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const packet = await OnboardingPacket.findById(id(req.params.id))
    .populate("candidateId", "name email")
    .populate("offerId");
  if (!packet) throw new AppError("Onboarding not found", 404, "NOT_FOUND");
  res.json(packet);
});

export const toggleChecklist = asyncHandler(async (req: Request, res: Response) => {
  const body = z.object({ index: z.number().int().min(0), done: z.boolean() }).parse(req.body);
  const packet = await OnboardingPacket.findById(id(req.params.id));
  if (!packet) throw new AppError("Onboarding not found", 404, "NOT_FOUND");
  const item = packet.checklist[body.index];
  if (!item) throw new AppError("Checklist item not found", 404, "NOT_FOUND");
  item.done = body.done;
  if (packet.checklist.every((c) => c.done)) packet.status = "completed";
  await packet.save();
  res.json(packet);
});

export const verifyDocument = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      documentId: z.string(),
      status: z.enum(["verified", "rejected"]),
      notes: z.string().optional(),
    })
    .parse(req.body);
  const packet = await OnboardingPacket.findById(id(req.params.id));
  if (!packet) throw new AppError("Onboarding not found", 404, "NOT_FOUND");
  const doc = packet.documents.id(body.documentId);
  if (!doc) throw new AppError("Document not found", 404, "NOT_FOUND");
  doc.status = body.status;
  if (body.notes) doc.notes = body.notes;
  await packet.save();
  res.json(packet);
});

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  const body = z.object({ documentId: z.string() }).parse(req.body);
  if (!req.file) throw new AppError("File required", 400, "FILE_REQUIRED");
  const packet = await OnboardingPacket.findById(id(req.params.id));
  if (!packet) throw new AppError("Onboarding not found", 404, "NOT_FOUND");
  const doc = packet.documents.id(body.documentId);
  if (!doc) throw new AppError("Document not found", 404, "NOT_FOUND");

  const uploaded = await integrations.storage.upload({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    folder: "onboarding",
  });
  doc.fileKey = uploaded.key;
  doc.status = "uploaded";
  await packet.save();
  res.json(packet);
});
