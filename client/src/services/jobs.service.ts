import type { Job } from "../types";
import { http } from "./http.service";

export type JobInput = {
  title: string;
  description: string;
  skills?: string[];
  department?: string;
  templateId?: string;
};

export async function getJobs(status?: string) {
  const { data } = await http.get<Job[]>("/jobs", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function getJobById(id: string) {
  const { data } = await http.get<Job>(`/jobs/${id}`);
  return data;
}

export async function createJob(payload: JobInput) {
  const { data } = await http.post<Job>("/jobs", payload);
  return data;
}

export async function updateJob(id: string, payload: JobInput) {
  const { data } = await http.put<Job>(`/jobs/${id}`, payload);
  return data;
}

export async function deleteJob(id: string) {
  await http.delete(`/jobs/${id}`);
}

export async function submitJob(id: string) {
  const { data } = await http.post<{ message: string }>(`/jobs/${id}/submit`);
  return data;
}

export async function approveJob(id: string) {
  const { data } = await http.post<{ message: string }>(`/jobs/${id}/approve`);
  return data;
}

export async function closeJob(id: string) {
  const { data } = await http.post<{ message: string }>(`/jobs/${id}/close`);
  return data;
}

/** Publish an approved job to the careers board and distribution channels. */
export async function postJob(
  id: string,
  payload: {
    location?: string;
    employmentType?: "full_time" | "part_time" | "contract" | "internship";
    openings?: number;
    salaryRange?: string;
    channels?: string[];
    closesAt?: string;
  } = {},
) {
  const { data } = await http.post<Job>(`/jobs/${id}/post`, payload);
  return data;
}

export async function getJobRankings(id: string) {
  const { data } = await http.get(`/jobs/${id}/rankings`);
  return data;
}
