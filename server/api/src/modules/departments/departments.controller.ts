import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import Department from "./department.model.ts";

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const body = schema.parse(req.body);
  const dept = await Department.create({
    name: body.name,
    code: body.code,
    ...(body.description !== undefined ? { description: body.description } : {}),
  });
  res.status(201).json(dept);
});

export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await Department.find().sort({ name: 1 }));
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (typeof id !== "string") throw new AppError("Invalid id", 400, "INVALID_ID");
  const body = schema.partial().parse(req.body);
  const dept = await Department.findByIdAndUpdate(
    id,
    {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    },
    { new: true },
  );
  if (!dept) throw new AppError("Department not found", 404, "NOT_FOUND");
  res.json(dept);
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  if (typeof id !== "string") throw new AppError("Invalid id", 400, "INVALID_ID");
  await Department.findByIdAndDelete(id);
  res.status(204).send();
});
