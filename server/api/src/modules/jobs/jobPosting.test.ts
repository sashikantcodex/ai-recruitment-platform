import { describe, expect, it } from "vitest";
import {
  assertCanPost,
  buildSlug,
  isAcceptingApplications,
  normalizeChannels,
} from "./jobPosting.ts";

describe("jobPosting", () => {
  it("builds a url-safe slug suffixed with the job id", () => {
    expect(buildSlug("Senior Backend Engineer!", "64b7f0a1c2d3e4f5a6b7c8d9")).toBe(
      "senior-backend-engineer-b7c8d9",
    );
  });

  it("falls back to 'job' when the title has no usable characters", () => {
    expect(buildSlug("!!!", "abcdef")).toBe("job-abcdef");
  });

  it("only allows posting an approved job", () => {
    expect(() => assertCanPost("published")).not.toThrow();
    for (const status of ["draft", "pending_approval", "closed"] as const) {
      expect(() => assertCanPost(status)).toThrow(/approved/i);
    }
  });

  it("accepts applications only for live, unexpired postings", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const postedAt = new Date("2026-01-01T00:00:00Z");

    expect(isAcceptingApplications({ status: "published", posting: { postedAt } }, now)).toBe(
      true,
    );
    expect(isAcceptingApplications({ status: "draft", posting: { postedAt } }, now)).toBe(
      false,
    );
    expect(isAcceptingApplications({ status: "published" }, now)).toBe(false);
    expect(
      isAcceptingApplications(
        { status: "published", posting: { postedAt, closesAt: new Date("2026-01-05Z") } },
        now,
      ),
    ).toBe(false);
  });

  it("drops unknown channels and defaults to the careers site", () => {
    expect(normalizeChannels(["linkedin", "myspace", "linkedin"])).toEqual(["linkedin"]);
    expect(normalizeChannels([])).toEqual(["careers_site"]);
    expect(normalizeChannels()).toEqual(["careers_site"]);
  });
});
