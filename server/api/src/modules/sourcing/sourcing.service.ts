import { Types } from "mongoose";
import { integrations } from "../../integrations/index.ts";
import { AppError } from "../../utils/App.Error.ts";
import { draftOutreach, matchSourcingCandidates } from "../ai-clients/ai.client.ts";
import Application from "../applications/application.model.ts";
import Candidate from "../candidates/candidate.model.ts";
import Job from "../jobs/job.model.ts";
import Resume from "../resumes/resume.model.ts";
import SourcingCampaign, {
  type ProspectStatus,
  type SourcingSource,
} from "./sourcing.model.ts";
import {
  canAdvanceProspect,
  existingProspectIds,
  shortlistMatches,
} from "./sourcing.pipeline.ts";

async function loadCampaign(id: string) {
  const campaign = await SourcingCampaign.findById(id);
  if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
  return campaign;
}

export async function createCampaign(input: {
  jobId: string;
  name?: string | undefined;
  sources?: SourcingSource[] | undefined;
  minMatchScore?: number | undefined;
  createdBy: string;
}) {
  const job = await Job.findById(input.jobId);
  if (!job) throw new AppError("Job not found", 404, "JOB_NOT_FOUND");

  return SourcingCampaign.create({
    jobId: job._id,
    name: input.name ?? `Sourcing — ${job.title}`,
    sources: input.sources?.length ? input.sources : ["internal_pool"],
    ...(input.minMatchScore !== undefined ? { minMatchScore: input.minMatchScore } : {}),
    createdBy: new Types.ObjectId(input.createdBy),
    status: "active",
  });
}

export async function listCampaigns(jobId?: string) {
  const filter = jobId ? { jobId } : {};
  return SourcingCampaign.find(filter)
    .populate("jobId", "title status posting")
    .sort({ createdAt: -1 });
}

export async function getCampaign(id: string) {
  const campaign = await SourcingCampaign.findById(id)
    .populate("jobId", "title description skills posting")
    .populate("prospects.candidateId", "name email skills location");
  if (!campaign) throw new AppError("Campaign not found", 404, "NOT_FOUND");
  return campaign;
}

/**
 * Search the internal talent pool for the campaign's job and add new prospects.
 * Candidates already on the campaign are skipped so re-running is idempotent.
 */
export async function searchProspects(id: string) {
  const campaign = await loadCampaign(id);
  const job = await Job.findById(campaign.jobId);
  if (!job) throw new AppError("Job not found", 404, "JOB_NOT_FOUND");

  const alreadyApplied = await Application.find({ jobId: job._id }).select("candidateId");
  const excluded = new Set([
    ...existingProspectIds(campaign.prospects),
    ...alreadyApplied.map((a) => a.candidateId.toString()),
  ]);

  const pool = await Candidate.find().select("name email skills summary location").limit(500);
  const searchable = pool.filter((c) => !excluded.has(c._id.toString()));

  if (searchable.length === 0) {
    campaign.lastSearchedAt = new Date();
    await campaign.save();
    return { campaign, added: 0, scanned: 0 };
  }

  const matches = await matchSourcingCandidates({
    jdText: `${job.title}\n${job.description}`,
    skills: job.skills ?? [],
    location: job.posting?.location ?? "",
    candidates: searchable.map((c) => ({
      candidateId: c._id.toString(),
      name: c.name,
      skills: c.skills ?? [],
      summary: c.summary ?? "",
      location: c.location ?? "",
      totalYears: 0,
    })),
  });

  const byId = new Map(searchable.map((c) => [c._id.toString(), c]));
  const shortlisted = shortlistMatches(matches, campaign.minMatchScore ?? 40);

  for (const match of shortlisted) {
    const candidate = byId.get(match.candidateId);
    if (!candidate) continue;
    campaign.prospects.push({
      candidateId: candidate._id,
      name: candidate.name,
      email: candidate.email,
      matchScore: match.score,
      matchedSkills: match.matchedSkills,
      missingSkills: match.missingSkills,
      rationale: match.rationale,
      status: "sourced",
    });
  }

  campaign.lastSearchedAt = new Date();
  await campaign.save();
  return { campaign, added: shortlisted.length, scanned: searchable.length };
}

/** Add an external prospect by hand (referral, LinkedIn, anything off-platform). */
export async function addProspect(
  id: string,
  input: {
    name: string;
    email: string;
    skills?: string[] | undefined;
    location?: string | undefined;
  },
) {
  const campaign = await loadCampaign(id);

  let candidate = await Candidate.findOne({ email: input.email.toLowerCase() });
  if (!candidate) {
    candidate = await Candidate.create({
      name: input.name,
      email: input.email,
      ...(input.skills ? { skills: input.skills } : {}),
      ...(input.location ? { location: input.location } : {}),
    });
  }

  if (existingProspectIds(campaign.prospects).has(candidate._id.toString())) {
    throw new AppError("Prospect already on this campaign", 409, "DUPLICATE_PROSPECT");
  }

  campaign.prospects.push({
    candidateId: candidate._id,
    name: candidate.name,
    email: candidate.email,
    status: "sourced",
  });
  await campaign.save();
  return campaign;
}

function requireProspect(
  campaign: Awaited<ReturnType<typeof loadCampaign>>,
  prospectId: string,
) {
  const prospect = campaign.prospects.id(prospectId);
  if (!prospect) throw new AppError("Prospect not found", 404, "NOT_FOUND");
  return prospect;
}

/** Draft an AI outreach email and send it to the prospect. */
export async function contactProspect(id: string, prospectId: string) {
  const campaign = await loadCampaign(id);
  const prospect = requireProspect(campaign, prospectId);
  const job = await Job.findById(campaign.jobId);
  if (!job) throw new AppError("Job not found", 404, "JOB_NOT_FOUND");

  if (!canAdvanceProspect(prospect.status as ProspectStatus, "contacted")) {
    throw new AppError(
      `Cannot contact a prospect in status ${prospect.status}`,
      400,
      "INVALID_PROSPECT_STATUS",
    );
  }

  const draft = await draftOutreach({
    candidateName: prospect.name ?? "there",
    jobTitle: job.title,
    matchedSkills: prospect.matchedSkills ?? [],
    ...(job.posting?.slug ? { applyUrl: `/careers/${job.posting.slug}` } : {}),
  });

  await integrations.email.sendEmail({
    to: prospect.email ?? "prospect@stub.local",
    subject: draft.subject,
    body: draft.body,
  });

  prospect.status = "contacted";
  prospect.outreachSubject = draft.subject;
  prospect.outreachBody = draft.body;
  prospect.contactedAt = new Date();
  await campaign.save();
  return campaign;
}

export async function updateProspectStatus(
  id: string,
  prospectId: string,
  status: ProspectStatus,
) {
  const campaign = await loadCampaign(id);
  const prospect = requireProspect(campaign, prospectId);
  if (!canAdvanceProspect(prospect.status as ProspectStatus, status)) {
    throw new AppError(
      `Cannot move prospect from ${prospect.status} to ${status}`,
      400,
      "INVALID_PROSPECT_STATUS",
    );
  }
  prospect.status = status;
  await campaign.save();
  return campaign;
}

/**
 * Turn a responded prospect into a real application.
 * Uses the candidate's most recent resume when one exists.
 */
export async function convertProspect(id: string, prospectId: string) {
  const campaign = await loadCampaign(id);
  const prospect = requireProspect(campaign, prospectId);

  if (!canAdvanceProspect(prospect.status as ProspectStatus, "converted")) {
    throw new AppError(
      `Prospect must be contacted before converting (currently ${prospect.status})`,
      400,
      "INVALID_PROSPECT_STATUS",
    );
  }

  const existing = await Application.findOne({
    jobId: campaign.jobId,
    candidateId: prospect.candidateId,
  });
  if (existing) {
    prospect.status = "converted";
    prospect.applicationId = existing._id;
    await campaign.save();
    return { campaign, application: existing };
  }

  const resume = await Resume.findOne({ candidateId: prospect.candidateId }).sort({
    createdAt: -1,
  });
  if (!resume) {
    throw new AppError(
      "Prospect has no resume on file — ask them to apply via the careers page",
      400,
      "RESUME_REQUIRED",
    );
  }

  const application = await Application.create({
    jobId: campaign.jobId,
    candidateId: prospect.candidateId,
    resumeId: resume._id,
    stage: "applied",
  });

  prospect.status = "converted";
  prospect.applicationId = application._id;
  await campaign.save();
  return { campaign, application };
}
