import { describe, expect, it } from "vitest";
import {
  canAdvanceProspect,
  existingProspectIds,
  shortlistMatches,
} from "./sourcing.pipeline.ts";

describe("sourcing pipeline", () => {
  it("walks prospects forward only", () => {
    expect(canAdvanceProspect("sourced", "contacted")).toBe(true);
    expect(canAdvanceProspect("contacted", "responded")).toBe(true);
    expect(canAdvanceProspect("responded", "converted")).toBe(true);
    expect(canAdvanceProspect("sourced", "converted")).toBe(false);
    expect(canAdvanceProspect("converted", "contacted")).toBe(false);
  });

  it("treats a no-op transition as allowed", () => {
    expect(canAdvanceProspect("contacted", "contacted")).toBe(true);
  });

  it("allows rejecting from any open state", () => {
    for (const status of ["sourced", "contacted", "responded"] as const) {
      expect(canAdvanceProspect(status, "rejected")).toBe(true);
    }
  });

  it("filters below the threshold and sorts best first", () => {
    const matches = [
      { score: 40, id: "a" },
      { score: 90, id: "b" },
      { score: 65, id: "c" },
    ];
    expect(shortlistMatches(matches, 50).map((m) => m.id)).toEqual(["b", "c"]);
    expect(shortlistMatches(matches, 40).map((m) => m.id)).toEqual(["b", "c", "a"]);
  });

  it("collects tracked candidate ids for de-duplication", () => {
    const ids = existingProspectIds([
      { candidateId: "abc" },
      { candidateId: { toString: () => "def" } },
    ]);
    expect(ids.has("abc")).toBe(true);
    expect(ids.has("def")).toBe(true);
    expect(ids.has("ghi")).toBe(false);
  });
});
