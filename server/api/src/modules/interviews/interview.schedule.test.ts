import { describe, expect, it } from "vitest";
import {
  buildInterviewTopic,
  computeEndTime,
  isFutureSchedule,
} from "./interview.schedule.ts";

describe("interview.schedule", () => {
  it("computes end time from duration", () => {
    const start = new Date("2026-08-10T10:00:00.000Z");
    expect(computeEndTime(start, 60).toISOString()).toBe("2026-08-10T11:00:00.000Z");
  });

  it("rejects non-positive duration", () => {
    expect(() => computeEndTime(new Date(), 0)).toThrow(/positive/);
  });

  it("builds topic with fallback", () => {
    expect(buildInterviewTopic("Frontend Engineer")).toBe("Interview: Frontend Engineer");
    expect(buildInterviewTopic("")).toBe("Interview: Role");
  });

  it("detects future schedules", () => {
    const now = new Date("2026-08-01T00:00:00.000Z");
    expect(isFutureSchedule(new Date("2026-08-02T00:00:00.000Z"), now)).toBe(true);
    expect(isFutureSchedule(new Date("2026-07-01T00:00:00.000Z"), now)).toBe(false);
  });
});
