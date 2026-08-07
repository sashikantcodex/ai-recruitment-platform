import { Schema, model, Types } from "mongoose";

export const APPLICATION_STAGES = [
  "applied",
  "screened",
  "assessment",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

const applicationSchema = new Schema(
  {
    jobId: { type: Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: Types.ObjectId, ref: "Candidate", required: true },
    resumeId: { type: Types.ObjectId, ref: "Resume", required: true },
    stage: {
      type: String,
      enum: APPLICATION_STAGES,
      default: "applied",
    },
    aiScore: Number,
    matchedSkills: [String],
    missingSkills: [String],
    aiRationale: String,
  },
  { timestamps: true },
);

applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

export default model("Application", applicationSchema);
