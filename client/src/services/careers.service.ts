import type { CandidateInterviewSession, PublicPosting } from "../types";
import { http } from "./http.service";

/** Public careers board — no auth required on any call in this file. */
export async function listPostings(query?: string) {
  const { data } = await http.get<PublicPosting[]>("/public/jobs", {
    params: query ? { q: query } : undefined,
  });
  return data;
}

export async function getPosting(slug: string) {
  const { data } = await http.get<PublicPosting>(`/public/jobs/${slug}`);
  return data;
}

export async function applyToPosting(
  slug: string,
  payload: { name: string; email: string; phone?: string; resume: File },
) {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("email", payload.email);
  if (payload.phone) form.append("phone", payload.phone);
  form.append("resume", payload.resume);

  const { data } = await http.post<{
    message: string;
    applicationId?: string;
    jobTitle: string;
  }>(`/public/jobs/${slug}/apply`, form);
  return data;
}

// --- Candidate AI interview (token in the link) -------------------------

export async function getInterviewSession(token: string) {
  const { data } = await http.get<CandidateInterviewSession>(
    `/public/interviews/${token}`,
  );
  return data;
}

export async function startInterviewSession(token: string) {
  const { data } = await http.post<CandidateInterviewSession>(
    `/public/interviews/${token}/start`,
  );
  return data;
}

export async function answerInterviewSession(token: string, answer: string) {
  const { data } = await http.post<CandidateInterviewSession>(
    `/public/interviews/${token}/answer`,
    { answer },
  );
  return data;
}
