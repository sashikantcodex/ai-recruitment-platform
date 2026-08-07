import { Schema, model, Types } from "mongoose";

const offerSchema = new Schema(
  {
    applicationId: { type: Types.ObjectId, ref: "Application", required: true },
    candidateId: { type: Types.ObjectId, ref: "Candidate", required: true },
    jobId: { type: Types.ObjectId, ref: "Job", required: true },
    salary: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    equity: String,
    startDate: Date,
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "declined", "expired"],
      default: "draft",
    },
    benchmark: Schema.Types.Mixed,
    envelopeId: String,
    signingUrl: String,
    createdBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default model("Offer", offerSchema);
