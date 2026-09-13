/** Pure helpers for turning an approved job into a public posting. */
import { AppError } from "../../utils/App.Error.ts";
import type { JobStatus } from "./jobWorkflow.ts";

/** Channels a posting can be distributed to. */
export const POSTING_CHANNELS = [
  "careers_site",
  "linkedin",
  "indeed",
  "internal",
  "referral",
] as const;

export type PostingChannel = (typeof POSTING_CHANNELS)[number];

/** URL-safe slug from a job title, suffixed so two identical titles never collide. */
export function buildSlug(title: string, suffix: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "job"}-${suffix.toLowerCase().slice(-6)}`;
}

/** Only an approved (published) job may be posted publicly. */
export function assertCanPost(status: JobStatus): void {
  if (status !== "published") {
    throw new AppError(
      "Only approved (published) jobs can be posted",
      400,
      "JOB_NOT_APPROVED",
    );
  }
}

/** A posting accepts applications while it is live and inside its window. */
export function isAcceptingApplications(
  job: {
    status: string;
    posting?: { postedAt?: Date | null; closesAt?: Date | null } | null;
  },
  now: Date = new Date(),
): boolean {
  if (job.status !== "published") return false;
  if (!job.posting?.postedAt) return false;
  if (job.posting.closesAt && job.posting.closesAt.getTime() <= now.getTime()) {
    return false;
  }
  return true;
}

export function normalizeChannels(channels?: string[]): PostingChannel[] {
  const allowed = new Set<string>(POSTING_CHANNELS);
  const picked = (channels ?? []).filter((c): c is PostingChannel => allowed.has(c));
  return picked.length ? [...new Set(picked)] : ["careers_site"];
}
