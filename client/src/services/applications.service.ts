import type { Application, ApplicationStage } from "../types";
import { buildApplyFormData } from "../utils/auth.mapper";
import { http } from "./http.service";

export async function listApplications(jobId?: string) {
  const { data } = await http.get<Application[]>("/applications", {
    params: jobId ? { jobId } : undefined,
  });
  return data;
}

export async function getApplication(id: string) {
  const { data } = await http.get<Application>(`/applications/${id}`);
  return data;
}

export async function updateApplicationStage(id: string, stage: ApplicationStage) {
  const { data } = await http.patch<Application>(`/applications/${id}/stage`, { stage });
  return data;
}

/** Multipart apply — FormData built in one place for reuse/tests. */
export async function applyWithResume(input: {
  jobId: string;
  name: string;
  email: string;
  phone?: string;
  resume: File;
}) {
  const { data } = await http.post<Application>(
    "/applications",
    buildApplyFormData(input),
  );
  return data;
}
