import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import JdTemplate from "./jdTemplate.model.ts";

const schema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(10),
  skills: z.array(z.string()).optional(),
  department: z.string().optional(),
});

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = schema.parse(req.body);
  const template = await JdTemplate.create({ ...body, createdBy: req.user.id });
  res.status(201).json(template);
});

export const listTemplates = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await JdTemplate.find().sort({ createdAt: -1 }));
});

export const getTemplate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (typeof id !== "string") throw new AppError("Invalid id", 400, "INVALID_ID");
  const template = await JdTemplate.findById(id);
  if (!template) throw new AppError("Template not found", 404, "NOT_FOUND");
  res.json(template);
});

export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (typeof id !== "string") throw new AppError("Invalid id", 400, "INVALID_ID");
  await JdTemplate.findByIdAndDelete(id);
  res.status(204).send();
});
