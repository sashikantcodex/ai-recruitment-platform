import type { Evaluation, EvaluationDecision } from "../types";
import { http } from "./http.service";

export async function listEvaluations(params?: {
  jobId?: string;
  applicationId?: string;
}) {
  const { data } = await http.get<Evaluation[]>("/evaluations", { params });
  return data;
}

/** Blend screening, assessment and interview signals into one evaluation. */
export async function generateEvaluation(applicationId: string) {
  const { data } = await http.post<Evaluation>("/evaluations", { applicationId });
  return data;
}

export async function getEvaluation(applicationId: string) {
  const { data } = await http.get<Evaluation>(
    `/evaluations/application/${applicationId}`,
  );
  return data;
}

/** Record the human hire/hold/reject call; moves the application with it. */
export async function decideEvaluation(
  applicationId: string,
  decision: EvaluationDecision,
  note?: string,
) {
  const { data } = await http.post<{ evaluation: Evaluation; stage: string }>(
    `/evaluations/application/${applicationId}/decision`,
    { decision, ...(note ? { note } : {}) },
  );
  return data;
}
