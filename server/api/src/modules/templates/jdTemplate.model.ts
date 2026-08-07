import { Schema, model, Types } from "mongoose";

const jdTemplateSchema = new Schema(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    skills: [String],
    department: String,
    createdBy: { type: Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default model("JdTemplate", jdTemplateSchema);
