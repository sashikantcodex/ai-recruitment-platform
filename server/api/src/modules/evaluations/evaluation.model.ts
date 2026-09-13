import { Schema, model, Types } from "mongoose";

export const EVALUATION_DECISIONS = ["hire", "hold", "reject"] as const;
export type EvaluationDecision = (typeof EVALUATION_DECISIONS)[number];

const signalSchema = new Schema(
  {
    screeningScore: Number,
    assessmentScore: Number,
    interviewScore: Number,
    interviewCount: Number,
  },
  { _id: false },
);

const evaluationSchema = new Schema(
  {
    applicationId: { type: Types.ObjectId, ref: "Application", required: true },
    candidateId: { type: Types.ObjectId, ref: "Candidate", required: true },
    jobId: { type: Types.ObjectId, ref: "Job", required: true },
    overallScore: { type: Number, required: true },
    /** What the AI recommends from the blended signals. */
    recommendation: { type: String, enum: EVALUATION_DECISIONS, required: true },
    /** What a human actually decided — null until someone signs off. */
    decision: { type: String, enum: EVALUATION_DECISIONS, default: null },
    decidedBy: { type: Types.ObjectId, ref: "User" },
    decidedAt: Date,
    decisionNote: String,
    signals: signalSchema,
    strengths: [String],
    concerns: [String],
    summary: String,
    generatedBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

evaluationSchema.index({ applicationId: 1 }, { unique: true });

export default model("Evaluation", evaluationSchema);
