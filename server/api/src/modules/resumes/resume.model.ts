import { Schema, model, Types } from "mongoose";

const resumeSchema = new Schema(
  {
    candidateId: { type: Types.ObjectId, ref: "Candidate", required: true },
    originalName: String,
    mimeType: String,
    filePath: { type: String, required: true },
    storageKey: String,
    status: {
      type: String,
      enum: ["pending", "processing", "parsed", "failed"],
      default: "pending",
    },
    parsedJson: Schema.Types.Mixed,
    errorMessage: String,
  },
  { timestamps: true },
);

export default model("Resume", resumeSchema);
