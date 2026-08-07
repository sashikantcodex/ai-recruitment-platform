import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import Resume from "../resumes/resume.model.ts";
import Candidate from "./candidate.model.ts";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedIn: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

export const listCandidates = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await Candidate.find().sort({ createdAt: -1 }));
});

export const getCandidate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (typeof id !== "string") throw new AppError("Invalid id", 400, "INVALID_ID");
  const candidate = await Candidate.findById(id);
  if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");
  const resumes = await Resume.find({ candidateId: id }).sort({ createdAt: -1 });
  res.json({ candidate, resumes });
});

export const updateCandidate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (typeof id !== "string") throw new AppError("Invalid id", 400, "INVALID_ID");
  const body = updateSchema.parse(req.body);
  const candidate = await Candidate.findByIdAndUpdate(id, body, { new: true });
  if (!candidate) throw new AppError("Candidate not found", 404, "NOT_FOUND");
  res.json(candidate);
});
