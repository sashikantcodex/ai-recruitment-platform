import { Schema, model, Types } from "mongoose";

const documentRequestSchema = new Schema(
  {
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ["requested", "uploaded", "verified", "rejected"],
      default: "requested",
    },
    fileKey: String,
    notes: String,
  },
  { _id: true },
);

const onboardingSchema = new Schema(
  {
    offerId: { type: Types.ObjectId, ref: "Offer", required: true },
    candidateId: { type: Types.ObjectId, ref: "Candidate", required: true },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    checklist: [
      {
        item: String,
        done: { type: Boolean, default: false },
      },
    ],
    documents: [documentRequestSchema],
  },
  { timestamps: true },
);

export default model("OnboardingPacket", onboardingSchema);
