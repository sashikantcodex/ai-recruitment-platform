/** Pure helpers for application pipeline transitions (unit-testable). */
import { APPLICATION_STAGES, type ApplicationStage } from "../applications/application.model.ts";

const FORWARD: Record<ApplicationStage, ApplicationStage[]> = {
  applied: ["screened", "rejected"],
  screened: ["assessment", "interview", "rejected"],
  assessment: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [],
  rejected: [],
};

export function canTransition(from: ApplicationStage, to: ApplicationStage): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

export function assertValidStage(stage: string): asserts stage is ApplicationStage {
  if (!(APPLICATION_STAGES as readonly string[]).includes(stage)) {
    throw new Error(`Invalid stage: ${stage}`);
  }
}

/** Rank applications by aiScore descending; missing scores sink to bottom. */
export function rankApplicationsByScore<T extends { aiScore?: number | null }>(
  apps: T[],
): T[] {
  return [...apps].sort((a, b) => {
    const left = typeof a.aiScore === "number" ? a.aiScore : -1;
    const right = typeof b.aiScore === "number" ? b.aiScore : -1;
    return right - left;
  });
}
