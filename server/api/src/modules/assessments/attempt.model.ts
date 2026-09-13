import { Schema, model, Types } from "mongoose";

export const ATTEMPT_STATUSES = [
  "invited",
  "in_progress",
  "submitted",
  "graded",
  "expired",
] as const;

export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

const answerSchema = new Schema(
  {
    questionIndex: { type: Number, required: true },
    selectedIndex: Number,
    response: String,
  },
  { _id: false },
);

const gradedSchema = new Schema(
  {
    questionIndex: Number,
    awarded: Number,
    max: Number,
    correct: Boolean,
    feedback: String,
  },
  { _id: false },
);

const attemptSchema = new Schema(
  {
    assessmentId: { type: Types.ObjectId, ref: "Assessment", required: true },
    applicationId: { type: Types.ObjectId, ref: "Application", required: true },
    candidateId: { type: Types.ObjectId, ref: "Candidate", required: true },
    /** Opaque token the candidate uses to take the test without an account. */
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ATTEMPT_STATUSES, default: "invited" },
    answers: [answerSchema],
    score: Number,
    passed: Boolean,
    grading: [gradedSchema],
    gradingSummary: String,
    invitedAt: { type: Date, default: Date.now },
    startedAt: Date,
    submittedAt: Date,
    /** Invite link expiry — separate from the in-test timer. */
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

attemptSchema.index({ applicationId: 1, assessmentId: 1 });

export default model("AssessmentAttempt", attemptSchema);
