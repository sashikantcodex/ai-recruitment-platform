import { Schema, model, Types } from "mongoose";

const candidateSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, unique: true },
    phone: String,
    location: String,
    linkedIn: String,
    summary: String,
    skills: [String],
    userId: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default model("Candidate", candidateSchema);
