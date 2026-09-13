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

/** Public-facing posting details, set when a published job goes live on the careers page. */
const postingSchema = new Schema(
  {
    slug: { type: String, required: true },
    location: { type: String, default: "Remote" },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship"],
      default: "full_time",
    },
    openings: { type: Number, default: 1 },
    salaryRange: String,
    channels: [{ type: String }],
    postedAt: { type: Date, default: Date.now },
    closesAt: Date,
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
    posting: postingSchema,
  },
  { timestamps: true },
);

jobSchema.index({ "posting.slug": 1 }, { unique: true, sparse: true });

export default model("Job", jobSchema);
