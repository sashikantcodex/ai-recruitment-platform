import bcrypt from "bcryptjs";
import { connectDB } from "../config/dbConnect.ts";
import { User } from "../modules/auth/user.model.ts";

async function seed() {
  await connectDB();

  // Default accounts for local/dev; password is the same for convenience.
  const users = [
    { name: "Super Admin", email: "admin@aiats.local", password: "Password1!", role: "Super Admin" },
    { name: "HR Admin", email: "hr@aiats.local", password: "Password1!", role: "HR Admin" },
    { name: "Recruiter", email: "recruiter@aiats.local", password: "Password1!", role: "Recruiter" },
    { name: "Hiring Manager", email: "hm@aiats.local", password: "Password1!", role: "Hiring Manager" },
    { name: "Interviewer", email: "interviewer@aiats.local", password: "Password1!", role: "Interviewer" },
    { name: "Candidate", email: "candidate@aiats.local", password: "Password1!", role: "Candidate" },
  ] as const;

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) continue;
    await User.create({
      name: u.name,
      email: u.email,
      role: u.role,
      passwordHash: await bcrypt.hash(u.password, 10),
    });
  }

  console.log("Seed complete");
  process.exit(0);
}

seed();