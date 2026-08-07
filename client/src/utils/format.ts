import { APPLICATION_STAGES, type ApplicationStage } from "../types";

export function formatScore(score?: number) {
  return typeof score === "number" ? `${score}` : "—";
}

export function joinList(items?: string[]) {
  return items?.length ? items.join(", ") : "—";
}

export function stageLabel(stage: string) {
  return stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isApplicationStage(value: string): value is ApplicationStage {
  return (APPLICATION_STAGES as readonly string[]).includes(value);
}

/** Allowed forward moves (mirrors API application.pipeline). */
const FORWARD: Record<ApplicationStage, ApplicationStage[]> = {
  applied: ["screened", "rejected"],
  screened: ["assessment", "interview", "rejected"],
  assessment: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [],
  rejected: [],
};

/** Current stage + valid next stages for the Advance dropdown. */
export function selectableStages(current: string): ApplicationStage[] {
  if (!isApplicationStage(current)) return [...APPLICATION_STAGES];
  return [current, ...FORWARD[current]];
}
