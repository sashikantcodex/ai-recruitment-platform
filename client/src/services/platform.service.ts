import type { Candidate, Interview, Offer, OnboardingPacket } from "../types";
import { http } from "./http.service";

export async function listCandidates() {
  const { data } = await http.get<Candidate[]>("/candidates");
  return data;
}

export async function getCandidate(id: string) {
  const { data } = await http.get<{ candidate: Candidate; resumes: unknown[] }>(
    `/candidates/${id}`,
  );
  return data;
}

export async function updateCandidate(id: string, payload: Partial<Candidate>) {
  const { data } = await http.put<Candidate>(`/candidates/${id}`, payload);
  return data;
}

export async function listInterviews() {
  const { data } = await http.get<Interview[]>("/interviews");
  return data;
}

export async function createInterview(applicationId: string) {
  const { data } = await http.post<Interview>("/interviews", { applicationId });
  return data;
}

export async function scheduleInterview(id: string, scheduledAt: string) {
  const { data } = await http.post<Interview>(`/interviews/${id}/schedule`, {
    scheduledAt,
    durationMinutes: 60,
  });
  return data;
}

export async function generateInterviewQuestions(id: string) {
  const { data } = await http.post<Interview>(`/interviews/${id}/questions`);
  return data;
}

export async function saveInterviewScorecard(
  id: string,
  scorecard: {
    technical: number;
    communication: number;
    culture: number;
    notes?: string;
    recommendation: "strong_yes" | "yes" | "no" | "strong_no";
  },
) {
  const { data } = await http.post<Interview>(`/interviews/${id}/scorecard`, scorecard);
  return data;
}

export async function listOffers() {
  const { data } = await http.get<Offer[]>("/offers");
  return data;
}

export async function createOffer(applicationId: string, salary?: number) {
  const { data } = await http.post<Offer>("/offers", {
    applicationId,
    ...(salary !== undefined ? { salary } : {}),
  });
  return data;
}

export async function sendOffer(id: string) {
  const { data } = await http.post<Offer>(`/offers/${id}/send`);
  return data;
}

export async function respondOffer(id: string, decision: "accepted" | "declined") {
  const { data } = await http.post<Offer>(`/offers/${id}/respond`, { decision });
  return data;
}

export async function listOnboarding() {
  const { data } = await http.get<OnboardingPacket[]>("/onboarding");
  return data;
}

export async function toggleOnboardingChecklist(
  id: string,
  index: number,
  done: boolean,
) {
  const { data } = await http.patch<OnboardingPacket>(`/onboarding/${id}/checklist`, {
    index,
    done,
  });
  return data;
}

export async function verifyOnboardingDoc(
  id: string,
  documentId: string,
  status: "verified" | "rejected",
) {
  const { data } = await http.post<OnboardingPacket>(`/onboarding/${id}/documents/verify`, {
    documentId,
    status,
  });
  return data;
}

export async function knowledgeIngest(input: {
  title: string;
  content: string;
  category?: string;
}) {
  const { data } = await http.post("/knowledge/ingest", input);
  return data;
}

export async function knowledgeQuery(query: string) {
  const { data } = await http.post<{ answer: string; hits: unknown[] }>("/knowledge/query", {
    query,
  });
  return data;
}

export async function runAgent(
  name: "recruiter" | "interview" | "hr",
  payload: Record<string, unknown>,
) {
  const { data } = await http.post(`/agents/${name}/run`, payload);
  return data;
}

export async function listDepartments() {
  const { data } = await http.get("/departments");
  return data as Array<{ _id: string; name: string; code: string }>;
}

export async function listTemplates() {
  const { data } = await http.get("/templates");
  return data as Array<{
    _id: string;
    name: string;
    title: string;
    description: string;
    skills?: string[];
    department?: string;
  }>;
}

export async function createTemplate(payload: {
  name: string;
  title: string;
  description: string;
  skills?: string[];
  department?: string;
}) {
  const { data } = await http.post("/templates", payload);
  return data;
}
