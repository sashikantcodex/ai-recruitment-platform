import { Schema, model, Types } from "mongoose";

export const QUESTION_TYPES = ["mcq", "short", "code"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

const questionSchema = new Schema(
  {
    prompt: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, default: "mcq" },
    options: [String],
    /** Answer key — never sent to the candidate. */
    correctIndex: Number,
    expected: String,
    weight: { type: Number, default: 1 },
    skill: String,
  },
  { _id: true },
);

const assessmentSchema = new Schema(
  {
    title: { type: String, required: true },
    jobId: { type: Types.ObjectId, ref: "Job" },
    skills: [String],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    durationMinutes: { type: Number, default: 45 },
    passingScore: { type: Number, default: 60 },
    questions: [questionSchema],
    active: { type: Boolean, default: true },
    createdBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default model("Assessment", assessmentSchema);
