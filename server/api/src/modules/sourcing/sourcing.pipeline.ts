/** Pure helpers for sourcing prospect state (unit-testable, DB-free). */
import type { ProspectStatus } from "./sourcing.model.ts";

const FORWARD: Record<ProspectStatus, ProspectStatus[]> = {
  sourced: ["contacted", "rejected"],
  contacted: ["responded", "rejected"],
  responded: ["converted", "rejected"],
  converted: [],
  rejected: [],
};

export function canAdvanceProspect(from: ProspectStatus, to: ProspectStatus): boolean {
  if (from === to) return true;
  return FORWARD[from]?.includes(to) ?? false;
}

/** Keep only matches at or above the campaign threshold, best first. */
export function shortlistMatches<T extends { score: number }>(
  matches: T[],
  minMatchScore: number,
): T[] {
  return matches
    .filter((m) => m.score >= minMatchScore)
    .sort((a, b) => b.score - a.score);
}

/** Candidate ids already tracked on a campaign, so a re-search never duplicates. */
export function existingProspectIds(
  prospects: Array<{ candidateId: { toString(): string } }>,
): Set<string> {
  return new Set(prospects.map((p) => p.candidateId.toString()));
}
