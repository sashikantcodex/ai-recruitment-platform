/** Pure offer salary recommendation helpers. */
export function clampOfferToBand(
  salary: number,
  band: { min: number; mid: number; max: number },
): number {
  if (salary < band.min) return band.min;
  if (salary > band.max) return band.max;
  return salary;
}

export function recommendSalary(
  benchmarkMid: number,
  override?: number,
): number {
  return typeof override === "number" ? override : benchmarkMid;
}

export function offerDecisionStage(decision: "accepted" | "declined") {
  return decision === "accepted" ? "hired" : "rejected";
}
