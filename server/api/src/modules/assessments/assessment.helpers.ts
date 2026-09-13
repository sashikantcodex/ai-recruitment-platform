/** Pure helpers for assessment attempts (unit-testable, DB-free). */
import { randomBytes } from "node:crypto";
import type { AttemptStatus } from "./attempt.model.ts";

/** URL-safe invite token. */
export function generateAttemptToken(): string {
  return randomBytes(24).toString("base64url");
}

export function attemptExpiry(from: Date, validDays = 7): Date {
  return new Date(from.getTime() + validDays * 24 * 60 * 60 * 1000);
}

export function isExpired(
  attempt: { status: string; expiresAt: Date; startedAt?: Date | null },
  durationMinutes: number,
  now: Date = new Date(),
): boolean {
  if (attempt.status === "graded" || attempt.status === "submitted") return false;
  if (attempt.expiresAt.getTime() <= now.getTime()) return true;
  // Once started, the in-test timer is the tighter deadline.
  if (attempt.startedAt) {
    const deadline = attempt.startedAt.getTime() + durationMinutes * 60_000;
    return deadline <= now.getTime();
  }
  return false;
}

/** Minutes left on a started attempt; full duration before it starts. */
export function remainingMinutes(
  attempt: { startedAt?: Date | null },
  durationMinutes: number,
  now: Date = new Date(),
): number {
  if (!attempt.startedAt) return durationMinutes;
  const elapsed = (now.getTime() - attempt.startedAt.getTime()) / 60_000;
  return Math.max(0, Math.round(durationMinutes - elapsed));
}

const FORWARD: Record<AttemptStatus, AttemptStatus[]> = {
  invited: ["in_progress", "expired"],
  in_progress: ["submitted", "expired"],
  submitted: ["graded"],
  graded: [],
  expired: [],
};

export function canAdvanceAttempt(from: AttemptStatus, to: AttemptStatus): boolean {
  return FORWARD[from]?.includes(to) ?? false;
}

export function didPass(score: number, passingScore: number): boolean {
  return score >= passingScore;
}

/** Strip the answer key before a question ever reaches the candidate. */
export function toCandidateQuestion(question: {
  prompt: string;
  type: string;
  options?: string[] | null | undefined;
  weight?: number | null | undefined;
  skill?: string | null | undefined;
}) {
  return {
    prompt: question.prompt,
    type: question.type,
    options: question.options ?? [],
    weight: question.weight ?? 1,
    skill: question.skill ?? "",
  };
}
