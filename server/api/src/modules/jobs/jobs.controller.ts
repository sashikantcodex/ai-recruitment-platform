import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import * as jobsService from "./jobs.service.ts";

const jobSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  skills: z.array(z.string()).optional(),
  department: z.string().optional(),
  departmentId: z.string().optional(),
  templateId: z.string().optional(),
});

function requireParamId(id: string | string[] | undefined): string {
  if (typeof id !== "string" || !id) {
    throw new AppError("Invalid job id", 400, "INVALID_JOB_ID");
  }
  return id;
}

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const body = jobSchema.parse(req.body);
  const job = await jobsService.createJob({
    title: body.title,
    description: body.description,
    createdBy: req.user.id,
    ...(body.skills !== undefined ? { skills: body.skills } : {}),
    ...(body.department !== undefined ? { department: body.department } : {}),
    ...(body.departmentId !== undefined ? { departmentId: body.departmentId } : {}),
    ...(body.templateId !== undefined ? { templateId: body.templateId } : {}),
  });
  res.status(201).json(job);
});

export const getJobs = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(await jobsService.getJobs());
});

export const getJobById = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(await jobsService.getJobById(requireParamId(req.params.id)));
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const body = jobSchema.parse(req.body);
  const job = await jobsService.updateJob(requireParamId(req.params.id), {
    title: body.title,
    description: body.description,
    ...(body.skills !== undefined ? { skills: body.skills } : {}),
    ...(body.department !== undefined ? { department: body.department } : {}),
    ...(body.departmentId !== undefined ? { departmentId: body.departmentId } : {}),
  });
  res.status(200).json(job);
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
  await jobsService.deleteJob(requireParamId(req.params.id));
  res.status(204).send();
});

export const submitJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  await jobsService.submitJob(requireParamId(req.params.id), req.user.id);
  res.status(200).json({ message: "Job submitted successfully" });
});

export const approveJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  await jobsService.approveJob(requireParamId(req.params.id), req.user.id);
  res.status(200).json({ message: "Job approved successfully" });
});

export const closeJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  await jobsService.closeJob(requireParamId(req.params.id), req.user.id);
  res.status(200).json({ message: "Job closed successfully" });
});

export const getRankings = asyncHandler(async (req: Request, res: Response) => {
  const rankings = await jobsService.getJobRankings(requireParamId(req.params.id));
  res.status(200).json(rankings);
});

const postingSchema = z.object({
  location: z.string().optional(),
  employmentType: z
    .enum(["full_time", "part_time", "contract", "internship"])
    .optional(),
  openings: z.number().int().min(1).optional(),
  salaryRange: z.string().optional(),
  channels: z.array(z.string()).optional(),
  closesAt: z.string().optional(),
});

export const postJob = asyncHandler(async (req: Request, res: Response) => {
  const body = postingSchema.parse(req.body ?? {});
  const job = await jobsService.postJob(requireParamId(req.params.id), body);
  res.status(200).json(job);
});
