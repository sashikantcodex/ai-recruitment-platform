import { Schema, model, Types } from "mongoose";

const approvalEventSchema = new Schema(
  {
    action: {
      type: String,
      enum: ["submitted", "approved", "rejected", "closed"],
      required: true,
    },
    by: { type: Types.ObjectId, ref: "User", required: true },
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const jobSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    skills: [{ type: String }],
    department: { type: String },
    departmentId: { type: Types.ObjectId, ref: "Department" },
    templateId: { type: Types.ObjectId, ref: "JdTemplate" },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "published", "closed"],
      default: "draft",
    },
    createdBy: { type: Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Types.ObjectId, ref: "User" },
    approvalEvents: [approvalEventSchema],
  },
  { timestamps: true },
);

export default model("Job", jobSchema);
