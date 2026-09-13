import { describe, expect, it } from "vitest";
import {
  bestAttemptScore,
  decisionToStage,
  hasSignal,
  scorecardPercent,
} from "./evaluation.helpers.ts";

describe("evaluation helpers", () => {
  it("averages a 0-5 scorecard onto a 0-100 scale", () => {
    expect(scorecardPercent({ technical: 5, communication: 5, culture: 5 })).toBe(100);
    expect(scorecardPercent({ technical: 4, communication: 3, culture: 2 })).toBe(60);
  });

  it("ignores missing scorecard dimensions", () => {
    expect(scorecardPercent({ technical: 4 })).toBe(80);
    expect(scorecardPercent({})).toBeNull();
    expect(scorecardPercent({ technical: null, communication: null })).toBeNull();
  });

  it("takes the best graded attempt and ignores ungraded ones", () => {
    expect(
      bestAttemptScore([
        { status: "graded", score: 55 },
        { status: "graded", score: 82 },
        { status: "in_progress", score: 99 },
      ]),
    ).toBe(82);
    expect(bestAttemptScore([{ status: "invited" }])).toBeNull();
    expect(bestAttemptScore([])).toBeNull();
  });

  it("maps a decision onto the application stage it forces", () => {
    expect(decisionToStage("hire")).toBe("offer");
    expect(decisionToStage("reject")).toBe("rejected");
    expect(decisionToStage("hold")).toBeNull();
  });

  it("requires at least one real signal", () => {
    expect(hasSignal({ screeningScore: 70 })).toBe(true);
    expect(hasSignal({ assessmentScore: 0 })).toBe(true);
    expect(hasSignal({ screeningScore: null, interviewScore: null })).toBe(false);
    expect(hasSignal({})).toBe(false);
  });
});
