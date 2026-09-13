/** Pure helpers for consolidated candidate evaluation (DB-free). */
import type { EvaluationDecision } from "./evaluation.model.ts";

export type ScorecardLike = {
  technical?: number | null;
  communication?: number | null;
  culture?: number | null;
  recommendation?: string | null;
};

/** Average a 0-5 scorecard onto a 0-100 scale. */
export function scorecardPercent(card: ScorecardLike): number | null {
  const parts = [card.technical, card.communication, card.culture].filter(
    (v): v is number => typeof v === "number",
  );
  if (!parts.length) return null;
  const avg = parts.reduce((sum, v) => sum + v, 0) / parts.length;
  return Math.round((avg / 5) * 10000) / 100;
}

/** Best (highest) graded attempt score, or null when nothing is graded. */
export function bestAttemptScore(
  attempts: Array<{ status: string; score?: number | null }>,
): number | null {
  const scores = attempts
    .filter((a) => a.status === "graded" && typeof a.score === "number")
    .map((a) => a.score as number);
  return scores.length ? Math.max(...scores) : null;
}

/** A hire decision only sticks when the application can still reach `offer`. */
export function decisionToStage(
  decision: EvaluationDecision,
): "offer" | "rejected" | null {
  if (decision === "hire") return "offer";
  if (decision === "reject") return "rejected";
  return null;
}

/** True when at least one real signal exists to evaluate. */
export function hasSignal(signals: {
  screeningScore?: number | null;
  assessmentScore?: number | null;
  interviewScore?: number | null;
}): boolean {
  return [signals.screeningScore, signals.assessmentScore, signals.interviewScore].some(
    (v) => typeof v === "number",
  );
}
