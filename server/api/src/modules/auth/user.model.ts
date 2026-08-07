import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";
import { ROLES, type Role } from "../../config/role.ts";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ROLES,
      required: true,
    },
    refreshTokens: [{ type: String }],
  },
  { timestamps: true },
);

type UserFields = InferSchemaType<typeof userSchema> & { role: Role };
export type UserDoc = HydratedDocument<UserFields>;

export const User = mongoose.model<UserFields>("User", userSchema);
