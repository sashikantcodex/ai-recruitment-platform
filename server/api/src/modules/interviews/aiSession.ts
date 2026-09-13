/** Pure helpers for AI-conducted interview sessions (DB-free, unit-testable). */
import { randomBytes } from "node:crypto";

export function generateSessionToken(): string {
  return randomBytes(24).toString("base64url");
}

export function sessionExpiry(from: Date, validDays = 7): Date {
  return new Date(from.getTime() + validDays * 24 * 60 * 60 * 1000);
}

export function isSessionExpired(
  session: { status?: string; expiresAt?: Date | null },
  now: Date = new Date(),
): boolean {
  if (session.status === "completed") return false;
  if (!session.expiresAt) return false;
  return session.expiresAt.getTime() <= now.getTime();
}

/** The question awaiting an answer, or "" when every turn is answered. */
export function currentQuestion(
  transcript: Array<{ question: string; answer?: string | null }>,
): string {
  const last = transcript[transcript.length - 1];
  if (!last) return "";
  return last.answer ? "" : last.question;
}

/** AI evaluation scores are already 0-5; clamp defensively before storing. */
export function toFiveScale(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(5, value)) * 100) / 100;
}
