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

const interviewSchema = new Schema(
  {
    applicationId: { type: Types.ObjectId, ref: "Application", required: true },
    jobId: { type: Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: Types.ObjectId, ref: "Candidate", required: true },
    panelists: [{ type: Types.ObjectId, ref: "User" }],
    scheduledAt: Date,
    durationMinutes: { type: Number, default: 60 },
    status: {
      type: String,
      enum: ["draft", "scheduled", "completed", "cancelled"],
      default: "draft",
    },
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

export default model("Interview", interviewSchema);
