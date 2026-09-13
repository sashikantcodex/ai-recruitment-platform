import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import * as applicationsService from "../applications/applications.service.ts";
import * as jobsService from "../jobs/jobs.service.ts";

/** Public careers board — published, currently-open postings only. */
export const listPostings = asyncHandler(async (req: Request, res: Response) => {
  const search = typeof req.query.q === "string" ? req.query.q : undefined;
  res.json(await jobsService.listPublicPostings(search));
});

export const getPosting = asyncHandler(async (req: Request, res: Response) => {
  const slug = req.params.slug;
  if (typeof slug !== "string" || !slug) {
    throw new AppError("Invalid posting slug", 400, "INVALID_SLUG");
  }
  res.json(await jobsService.getPublicPostingBySlug(slug));
});

/** Candidate self-service application against a live posting. */
export const apply = asyncHandler(async (req: Request, res: Response) => {
  const slug = req.params.slug;
  if (typeof slug !== "string" || !slug) {
    throw new AppError("Invalid posting slug", 400, "INVALID_SLUG");
  }
  if (!req.file) {
    throw new AppError("A resume file is required", 400, "RESUME_REQUIRED");
  }

  const body = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
    })
    .parse(req.body);

  const job = await jobsService.getPublicPostingBySlug(slug);
  const application = await applicationsService.applyWithResume({
    jobId: job._id.toString(),
    name: body.name,
    email: body.email,
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    file: req.file,
  });

  // Never leak internal AI scoring back to the applicant.
  res.status(201).json({
    message: "Application received",
    applicationId: application?._id,
    jobTitle: job.title,
  });
});
