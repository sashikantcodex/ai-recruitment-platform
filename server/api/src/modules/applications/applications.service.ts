import { AppError } from "../../utils/App.Error.ts";
import { integrations } from "../../integrations/index.ts";
import { parseResume, scoreCandidate } from "../ai-clients/ai.client.ts";
import Candidate from "../candidates/candidate.model.ts";
import Job from "../jobs/job.model.ts";
import Resume from "../resumes/resume.model.ts";
import Application, {
  type ApplicationStage,
} from "./application.model.ts";
import {
  assertValidStage,
  canTransition,
} from "./application.pipeline.ts";

type ApplyInput = {
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  file: Express.Multer.File;
};

export async function applyWithResume(input: ApplyInput) {
  const { jobId, name, email, phone, file } = input;

  const job = await Job.findById(jobId);
  if (!job) throw new AppError("Job not found", 404, "JOB_NOT_FOUND");

  let candidate = await Candidate.findOne({ email: email.toLowerCase() });
  if (!candidate) {
    candidate = await Candidate.create({
      name,
      email,
      ...(phone !== undefined ? { phone } : {}),
    });
  }

  const uploaded = await integrations.storage.upload({
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    folder: "resumes",
  });

  const resume = await Resume.create({
    candidateId: candidate._id,
    originalName: file.originalname,
    mimeType: file.mimetype,
    filePath: uploaded.path,
    storageKey: uploaded.key,
    status: "processing",
  });

  let aiScore: number | undefined;
  let matchedSkills: string[] | undefined;
  let missingSkills: string[] | undefined;
  let aiRationale: string | undefined;

  try {
    const parsed = await parseResume({
      resumeId: resume._id.toString(),
      filePath: uploaded.path,
      mimeType: file.mimetype,
    });

    await Resume.findByIdAndUpdate(resume._id, {
      status: "parsed",
      parsedJson: parsed,
    });

    if (parsed.skills?.length) {
      await Candidate.findByIdAndUpdate(candidate._id, {
        skills: parsed.skills,
        summary: parsed.summary,
      });
    }

    const score = await scoreCandidate({
      jobId,
      jdText: job.description,
      parsedResume: parsed,
    });

    aiScore = score.score;
    matchedSkills = score.matchedSkills;
    missingSkills = score.missingSkills;
    aiRationale = score.rationale;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI processing failed";
    await Resume.findByIdAndUpdate(resume._id, {
      status: "failed",
      errorMessage: message,
    });
  }

  const application = await Application.create({
    jobId,
    candidateId: candidate._id,
    resumeId: resume._id,
    stage: "applied",
    ...(aiScore !== undefined ? { aiScore, stage: "screened" } : {}),
    ...(matchedSkills ? { matchedSkills } : {}),
    ...(missingSkills ? { missingSkills } : {}),
    ...(aiRationale ? { aiRationale } : {}),
  });

  return Application.findById(application._id)
    .populate("candidateId", "name email phone skills")
    .populate("resumeId", "originalName status mimeType")
    .populate("jobId", "title status");
}

export async function listApplications(jobId?: string) {
  const filter = jobId ? { jobId } : {};
  return Application.find(filter)
    .populate("candidateId", "name email phone skills")
    .populate("resumeId", "originalName status")
    .populate("jobId", "title status")
    .sort({ createdAt: -1 });
}

export async function getApplicationById(applicationId: string) {
  const application = await Application.findById(applicationId)
    .populate("candidateId", "name email phone skills")
    .populate("resumeId", "originalName status mimeType")
    .populate("jobId", "title status");

  if (!application) {
    throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  }

  return application;
}

export async function updateApplicationStage(
  applicationId: string,
  stage: ApplicationStage,
) {
  assertValidStage(stage);
  const current = await Application.findById(applicationId);
  if (!current) {
    throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  }

  const from = current.stage as ApplicationStage;
  if (!canTransition(from, stage)) {
    throw new AppError(
      `Cannot move application from ${from} to ${stage}`,
      400,
      "INVALID_STAGE_TRANSITION",
    );
  }

  const application = await Application.findByIdAndUpdate(
    applicationId,
    { stage },
    { new: true },
  )
    .populate("candidateId", "name email phone")
    .populate("jobId", "title status");

  if (!application) {
    throw new AppError("Application not found", 404, "APPLICATION_NOT_FOUND");
  }
  return application;
}
