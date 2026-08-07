import type { Role, User } from "../types";

/** Maps Express `/auth/me` payload to the client User shape. */
export function mapMeUser(raw: {
  _id: string;
  name: string;
  email: string;
  role: Role;
}): User {
  return {
    id: raw._id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
  };
}

/** Builds FormData for resume application uploads. */
export function buildApplyFormData(input: {
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  resume: File;
}): FormData {
  const form = new FormData();
  form.append("jobId", input.jobId);
  form.append("name", input.name);
  form.append("email", input.email);
  if (input.phone) form.append("phone", input.phone);
  form.append("resume", input.resume);
  return form;
}

/** Sort applications by AI score descending (client-side ranking helper). */
export function rankByAiScore<T extends { aiScore?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1));
}
