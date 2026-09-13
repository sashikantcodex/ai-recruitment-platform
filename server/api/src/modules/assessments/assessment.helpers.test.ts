import { describe, expect, it } from "vitest";
import {
  attemptExpiry,
  canAdvanceAttempt,
  didPass,
  generateAttemptToken,
  isExpired,
  remainingMinutes,
  toCandidateQuestion,
} from "./assessment.helpers.ts";

describe("assessment helpers", () => {
  it("generates distinct url-safe tokens", () => {
    const a = generateAttemptToken();
    const b = generateAttemptToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("expires the invite link after the validity window", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(attemptExpiry(now, 7).toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });

  it("treats a started attempt past its timer as expired", () => {
    const now = new Date("2026-01-01T02:00:00Z");
    const expiresAt = new Date("2026-01-08T00:00:00Z");

    expect(
      isExpired(
        { status: "in_progress", expiresAt, startedAt: new Date("2026-01-01T01:00:00Z") },
        45,
        now,
      ),
    ).toBe(true);
    expect(
      isExpired(
        { status: "in_progress", expiresAt, startedAt: new Date("2026-01-01T01:50:00Z") },
        45,
        now,
      ),
    ).toBe(false);
  });

  it("never expires a submitted or graded attempt", () => {
    const past = new Date("2020-01-01T00:00:00Z");
    expect(isExpired({ status: "graded", expiresAt: past }, 45)).toBe(false);
    expect(isExpired({ status: "submitted", expiresAt: past }, 45)).toBe(false);
    expect(isExpired({ status: "invited", expiresAt: past }, 45)).toBe(true);
  });

  it("reports remaining minutes, floored at zero", () => {
    const now = new Date("2026-01-01T01:00:00Z");
    expect(remainingMinutes({}, 45, now)).toBe(45);
    expect(
      remainingMinutes({ startedAt: new Date("2026-01-01T00:30:00Z") }, 45, now),
    ).toBe(15);
    expect(
      remainingMinutes({ startedAt: new Date("2026-01-01T00:00:00Z") }, 45, now),
    ).toBe(0);
  });

  it("only allows forward attempt transitions", () => {
    expect(canAdvanceAttempt("invited", "in_progress")).toBe(true);
    expect(canAdvanceAttempt("in_progress", "submitted")).toBe(true);
    expect(canAdvanceAttempt("submitted", "graded")).toBe(true);
    expect(canAdvanceAttempt("graded", "in_progress")).toBe(false);
    expect(canAdvanceAttempt("expired", "submitted")).toBe(false);
  });

  it("passes only at or above the threshold", () => {
    expect(didPass(60, 60)).toBe(true);
    expect(didPass(59.99, 60)).toBe(false);
  });

  it("strips the answer key from candidate-facing questions", () => {
    const candidateView = toCandidateQuestion({
      prompt: "Pick one",
      type: "mcq",
      options: ["a", "b"],
      weight: 2,
      skill: "python",
      // Fields below must not survive the projection.
      correctIndex: 0,
      expected: "the secret rubric",
    } as never);

    expect(candidateView).toEqual({
      prompt: "Pick one",
      type: "mcq",
      options: ["a", "b"],
      weight: 2,
      skill: "python",
    });
    expect(JSON.stringify(candidateView)).not.toContain("secret");
  });
});
