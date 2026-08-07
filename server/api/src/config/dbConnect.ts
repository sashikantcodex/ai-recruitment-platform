import mongoose from "mongoose";
import { env } from "./config.ts";

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");
}
