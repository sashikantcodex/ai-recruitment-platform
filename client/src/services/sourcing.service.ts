import type { Prospect, ProspectStatus, SourcingCampaign } from "../types";
import { http } from "./http.service";

export async function listCampaigns(jobId?: string) {
  const { data } = await http.get<SourcingCampaign[]>("/sourcing/campaigns", {
    params: jobId ? { jobId } : undefined,
  });
  return data;
}

export async function getCampaign(id: string) {
  const { data } = await http.get<SourcingCampaign>(`/sourcing/campaigns/${id}`);
  return data;
}

export async function createCampaign(payload: {
  jobId: string;
  name?: string;
  sources?: string[];
  minMatchScore?: number;
}) {
  const { data } = await http.post<SourcingCampaign>("/sourcing/campaigns", payload);
  return data;
}

/** Match the internal talent pool against the campaign's job. */
export async function searchProspects(id: string) {
  const { data } = await http.post<{
    campaign: SourcingCampaign;
    added: number;
    scanned: number;
  }>(`/sourcing/campaigns/${id}/search`);
  return data;
}

export async function addProspect(
  id: string,
  payload: { name: string; email: string; skills?: string[]; location?: string },
) {
  const { data } = await http.post<SourcingCampaign>(
    `/sourcing/campaigns/${id}/prospects`,
    payload,
  );
  return data;
}

export async function contactProspect(id: string, prospectId: string) {
  const { data } = await http.post<SourcingCampaign>(
    `/sourcing/campaigns/${id}/prospects/${prospectId}/contact`,
  );
  return data;
}

export async function updateProspectStatus(
  id: string,
  prospectId: string,
  status: ProspectStatus,
) {
  const { data } = await http.patch<SourcingCampaign>(
    `/sourcing/campaigns/${id}/prospects/${prospectId}/status`,
    { status },
  );
  return data;
}

export async function convertProspect(id: string, prospectId: string) {
  const { data } = await http.post<{
    campaign: SourcingCampaign;
    application: { _id: string };
  }>(`/sourcing/campaigns/${id}/prospects/${prospectId}/convert`);
  return data;
}

export type { Prospect };
