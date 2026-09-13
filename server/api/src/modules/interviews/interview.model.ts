import { Schema, model, Types } from "mongoose";

const scorecardSchema = new Schema(
  {
    technical: { type: Number, min: 0, max: 5 },
    communication: { type: Number, min: 0, max: 5 },
    culture: { type: Number, min: 0, max: 5 },
    notes: String,
    recommendation: {
      type: String,
      enum: ["strong_yes", "yes", "no", "strong_no"],
    },
    scoredBy: { type: Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const transcriptTurnSchema = new Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, default: "" },
    askedAt: { type: Date, default: Date.now },
    answeredAt: Date,
  },
  { _id: false },
);

/** AI-conducted interview session: an async Q&A the candidate takes by link. */
const aiSessionSchema = new Schema(
  {
    token: String,
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "expired"],
      default: "not_started",
    },
    maxQuestions: { type: Number, default: 8 },
    transcript: [transcriptTurnSchema],
    startedAt: Date,
    completedAt: Date,
    expiresAt: Date,
    evaluation: {
      technical: Number,
      communication: Number,
      culture: Number,
      recommendation: {
        type: String,
        enum: ["strong_yes", "yes", "no", "strong_no"],
      },
      strengths: [String],
      concerns: [String],
      summary: String,
    },
  },
  { _id: false },
);

const interviewSchema = new Schema(
  {
    applicationId: { type: Types.ObjectId, ref: "Application", required: true },
    jobId: { type: Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: Types.ObjectId, ref: "Candidate", required: true },
    panelists: [{ type: Types.ObjectId, ref: "User" }],
    /** `ai` interviews are conducted by the AI service; `live` are panel-run. */
    mode: { type: String, enum: ["live", "ai"], default: "live" },
    scheduledAt: Date,
    durationMinutes: { type: Number, default: 60 },
    status: {
      type: String,
      enum: ["draft", "scheduled", "completed", "cancelled"],
      default: "draft",
    },
    aiSession: aiSessionSchema,
    questions: [String],
    notes: String,
    scorecard: scorecardSchema,
    calendarEventId: String,
    calendarLink: String,
    meetingId: String,
    meetingUrl: String,
    createdBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

interviewSchema.index({ "aiSession.token": 1 }, { unique: true, sparse: true });

export default model("Interview", interviewSchema);
