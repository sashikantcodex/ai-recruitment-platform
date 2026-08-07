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
