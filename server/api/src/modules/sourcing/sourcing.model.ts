import { Schema, model, Types } from "mongoose";

export const PROSPECT_STATUSES = [
  "sourced",
  "contacted",
  "responded",
  "converted",
  "rejected",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const SOURCING_SOURCES = [
  "internal_pool",
  "referral",
  "linkedin",
  "job_board",
] as const;

export type SourcingSource = (typeof SOURCING_SOURCES)[number];

const prospectSchema = new Schema(
  {
    candidateId: { type: Types.ObjectId, ref: "Candidate", required: true },
    name: String,
    email: String,
    matchScore: Number,
    matchedSkills: [String],
    missingSkills: [String],
    rationale: String,
    status: { type: String, enum: PROSPECT_STATUSES, default: "sourced" },
    outreachSubject: String,
    outreachBody: String,
    contactedAt: Date,
    applicationId: { type: Types.ObjectId, ref: "Application" },
  },
  { _id: true },
);

const campaignSchema = new Schema(
  {
    jobId: { type: Types.ObjectId, ref: "Job", required: true },
    name: { type: String, required: true },
    /** Where prospects come from — only `internal_pool` is wired to a real search today. */
    sources: [{ type: String, enum: SOURCING_SOURCES, default: "internal_pool" }],
    status: {
      type: String,
      enum: ["active", "paused", "closed"],
      default: "active",
    },
    minMatchScore: { type: Number, default: 40 },
    prospects: [prospectSchema],
    createdBy: { type: Types.ObjectId, ref: "User" },
    lastSearchedAt: Date,
  },
  { timestamps: true },
);

export default model("SourcingCampaign", campaignSchema);
