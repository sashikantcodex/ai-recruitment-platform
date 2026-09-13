import { describe, expect, it } from "vitest";
import {
  currentQuestion,
  generateSessionToken,
  isSessionExpired,
  sessionExpiry,
  toFiveScale,
} from "./aiSession.ts";

describe("AI interview session helpers", () => {
  it("issues distinct url-safe tokens", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
    expect(generateSessionToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("expires the link after the validity window", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(sessionExpiry(now, 3).toISOString()).toBe("2026-01-04T00:00:00.000Z");
  });

  it("never expires a completed session", () => {
    const past = new Date("2020-01-01T00:00:00Z");
    expect(isSessionExpired({ status: "completed", expiresAt: past })).toBe(false);
    expect(isSessionExpired({ status: "in_progress", expiresAt: past })).toBe(true);
    expect(isSessionExpired({ status: "in_progress" })).toBe(false);
  });

  it("returns the unanswered question, or empty when all are answered", () => {
    expect(currentQuestion([])).toBe("");
    expect(currentQuestion([{ question: "Q1", answer: "A1" }])).toBe("");
    expect(
      currentQuestion([
        { question: "Q1", answer: "A1" },
        { question: "Q2", answer: "" },
      ]),
    ).toBe("Q2");
  });

  it("clamps evaluation scores into the 0-5 scorecard range", () => {
    expect(toFiveScale(3.456)).toBe(3.46);
    expect(toFiveScale(9)).toBe(5);
    expect(toFiveScale(-2)).toBe(0);
    expect(toFiveScale(Number.NaN)).toBe(0);
  });
});
