import { Types } from "mongoose";
import { integrations } from "../../integrations/index.ts";
import { AppError } from "../../utils/App.Error.ts";
import Application from "../applications/application.model.ts";
import Job from "./job.model.ts";
import {
  assertCanPost,
  buildSlug,
  isAcceptingApplications,
  normalizeChannels,
} from "./jobPosting.ts";
import {
  assertCanApprove,
  assertCanClose,
  assertCanSubmit,
  type JobStatus,
} from "./jobWorkflow.ts";

type CreateJobInput = {
  title: string;
  description: string;
  skills?: string[];
  department?: string;
  departmentId?: string;
  templateId?: string;
  createdBy: string;
};

type UpdateJobInput = Partial<{
  title: string;
  description: string;
  skills: string[];
  department: string;
  departmentId: string;
  status: JobStatus;
}>;

export async function createJob(jobData: CreateJobInput) {
  return Job.create({
    title: jobData.title,
    description: jobData.description,
    createdBy: jobData.createdBy,
    status: "draft",
    ...(jobData.skills !== undefined ? { skills: jobData.skills } : {}),
    ...(jobData.department !== undefined ? { department: jobData.department } : {}),
    ...(jobData.departmentId
      ? { departmentId: new Types.ObjectId(jobData.departmentId) }
      : {}),
    ...(jobData.templateId ? { templateId: new Types.ObjectId(jobData.templateId) } : {}),
  });
}

export async function getJobs(status?: JobStatus) {
  const filter = status ? { status } : {};
  return Job.find(filter)
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email")
    .populate("approvedBy", "name email");
}

export async function getJobById(id: string) {
  const job = await Job.findById(id)
    .populate("createdBy", "name email")
    .populate("approvedBy", "name email")
    .populate("approvalEvents.by", "name email");

  if (!job) {
    throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
  }

  return job;
}

export async function updateJob(id: string, jobData: UpdateJobInput) {
  const job = await Job.findByIdAndUpdate(id, jobData, { new: true })
    .populate("createdBy", "name email")
    .populate("approvedBy", "name email");

  if (!job) {
    throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
  }

  return job;
}

export async function deleteJob(id: string) {
  const job = await Job.findByIdAndDelete(id);
  if (!job) {
    throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
  }
}

export async function submitJob(id: string, actorId: string) {
  const job = await Job.findById(id);
  if (!job) {
    throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
  }

  assertCanSubmit(job.status as JobStatus);
  job.status = "pending_approval";
  job.approvalEvents.push({
    action: "submitted",
    by: new Types.ObjectId(actorId),
    at: new Date(),
  });
  await job.save();
  return job;
}

export async function approveJob(id: string, approverId: string) {
  const job = await getJobById(id);
  assertCanApprove(job.status as JobStatus);

  job.status = "published";
  job.approvedBy = new Types.ObjectId(approverId);
  job.approvalEvents.push({
    action: "approved",
    by: new Types.ObjectId(approverId),
    at: new Date(),
  });
  await job.save();
  return job;
}

export async function closeJob(id: string, actorId: string) {
  const job = await Job.findById(id);
  if (!job) {
    throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
  }

  assertCanClose(job.status as JobStatus);
  job.status = "closed";
  job.approvalEvents.push({
    action: "closed",
    by: new Types.ObjectId(actorId),
    at: new Date(),
  });
  await job.save();
  return job;
}

/** Publish an approved job to the careers page (and any distribution channels). */
export async function postJob(
  id: string,
  input: {
    location?: string | undefined;
    employmentType?:
      | "full_time"
      | "part_time"
      | "contract"
      | "internship"
      | undefined;
    openings?: number | undefined;
    salaryRange?: string | undefined;
    channels?: string[] | undefined;
    closesAt?: string | undefined;
  },
) {
  const job = await Job.findById(id);
  if (!job) throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
  assertCanPost(job.status as JobStatus);

  const channels = normalizeChannels(input.channels);
  job.set("posting", {
    // Keep the slug stable across re-posts so shared links never break.
    slug: job.posting?.slug ?? buildSlug(job.title, job._id.toString()),
    location: input.location ?? job.posting?.location ?? "Remote",
    employmentType: input.employmentType ?? job.posting?.employmentType ?? "full_time",
    openings: input.openings ?? job.posting?.openings ?? 1,
    ...(input.salaryRange !== undefined ? { salaryRange: input.salaryRange } : {}),
    channels,
    postedAt: job.posting?.postedAt ?? new Date(),
    ...(input.closesAt ? { closesAt: new Date(input.closesAt) } : {}),
  });
  await job.save();

  for (const channel of channels) {
    await integrations.email.sendEmail({
      to: `postings+${channel}@stub.local`,
      subject: `New posting: ${job.title}`,
      body: `${job.title} is live at /careers/${job.posting?.slug}`,
    });
  }

  return job;
}

/** Published jobs that are live on the public careers page. */
export async function listPublicPostings(search?: string) {
  const jobs = await Job.find({ status: "published", "posting.slug": { $exists: true } })
    // `status` must be projected — isAcceptingApplications reads it.
    .select("title description skills department posting status createdAt")
    .sort({ "posting.postedAt": -1 });

  const live = jobs.filter((job) => isAcceptingApplications(job));
  if (!search) return live;
  const needle = search.toLowerCase();
  return live.filter(
    (job) =>
      job.title.toLowerCase().includes(needle) ||
      (job.skills ?? []).some((s) => s.toLowerCase().includes(needle)),
  );
}

export async function getPublicPostingBySlug(slug: string) {
  const job = await Job.findOne({ "posting.slug": slug }).select(
    "title description skills department posting status",
  );
  if (!job || !isAcceptingApplications(job)) {
    throw new AppError("Posting not found or closed", 404, "POSTING_NOT_FOUND");
  }
  return job;
}

/** Rank applications for a job by AI score (desc). */
export async function getJobRankings(jobId: string) {
  await getJobById(jobId);
  return Application.find({ jobId })
    .populate("candidateId", "name email skills")
    .populate("resumeId", "originalName status")
    .sort({ aiScore: -1, createdAt: -1 });
}
