import type { Assessment, AssessmentAttempt, CandidateAttempt } from "../types";
import { http } from "./http.service";

export async function listAssessments(jobId?: string) {
  const { data } = await http.get<Assessment[]>("/assessments", {
    params: jobId ? { jobId } : undefined,
  });
  return data;
}

export async function getAssessment(id: string) {
  const { data } = await http.get<Assessment>(`/assessments/${id}`);
  return data;
}

/** Build a job-specific test with the AI service. */
export async function generateAssessment(payload: {
  jobId: string;
  numQuestions?: number;
  difficulty?: "easy" | "medium" | "hard";
}) {
  const { data } = await http.post<Assessment>("/assessments/generate", payload);
  return data;
}

export async function inviteToAssessment(
  assessmentId: string,
  applicationId: string,
  validDays?: number,
) {
  const { data } = await http.post<AssessmentAttempt>(
    `/assessments/${assessmentId}/invite`,
    { applicationId, ...(validDays !== undefined ? { validDays } : {}) },
  );
  return data;
}

export async function listAttempts(params?: { applicationId?: string; status?: string }) {
  const { data } = await http.get<AssessmentAttempt[]>("/assessments/attempts", {
    params,
  });
  return data;
}

export async function getAttempt(attemptId: string) {
  const { data } = await http.get<AssessmentAttempt>(
    `/assessments/attempts/${attemptId}`,
  );
  return data;
}

// --- Candidate-facing (token in the link, no login) ---------------------

export async function getCandidateAttempt(token: string) {
  const { data } = await http.get<CandidateAttempt>(`/public/assessments/${token}`);
  return data;
}

export async function startCandidateAttempt(token: string) {
  const { data } = await http.post<{ status: string; remainingMinutes: number }>(
    `/public/assessments/${token}/start`,
  );
  return data;
}

export async function submitCandidateAttempt(
  token: string,
  answers: Array<{ questionIndex: number; selectedIndex?: number; response?: string }>,
) {
  const { data } = await http.post<{
    score: number;
    passed: boolean;
    passingScore: number;
    summary: string;
  }>(`/public/assessments/${token}/submit`, { answers });
  return data;
}
