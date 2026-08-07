import { describe, expect, it } from "vitest";
import {
  assertValidStage,
  canTransition,
  rankApplicationsByScore,
} from "./application.pipeline.ts";

describe("application.pipeline", () => {
  it("allows valid forward transitions", () => {
    expect(canTransition("applied", "screened")).toBe(true);
    expect(canTransition("interview", "offer")).toBe(true);
    expect(canTransition("offer", "hired")).toBe(true);
  });

  it("blocks illegal jumps", () => {
    expect(canTransition("applied", "hired")).toBe(false);
    expect(canTransition("hired", "interview")).toBe(false);
  });

  it("validates stage names", () => {
    expect(() => assertValidStage("interview")).not.toThrow();
    expect(() => assertValidStage("nope")).toThrow(/Invalid stage/);
  });

  it("ranks by AI score with nulls last", () => {
    const ranked = rankApplicationsByScore([
      { id: "a", aiScore: 40 },
      { id: "b", aiScore: null },
      { id: "c", aiScore: 90 },
      { id: "d" },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["c", "a", "b", "d"]);
  });
});
