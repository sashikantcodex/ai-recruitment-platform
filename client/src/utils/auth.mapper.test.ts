import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildApplyFormData, mapMeUser, rankByAiScore } from "./auth.mapper";
import { storage } from "./storage";
import { PUBLIC_REGISTER_ROLES } from "../types";

describe("mapMeUser", () => {
  it("maps Mongo _id to client id", () => {
    expect(
      mapMeUser({
        _id: "abc123",
        name: "Ada",
        email: "ada@example.com",
        role: "Recruiter",
      }),
    ).toEqual({
      id: "abc123",
      name: "Ada",
      email: "ada@example.com",
      role: "Recruiter",
    });
  });
});

describe("buildApplyFormData", () => {
  it("includes optional phone only when provided", () => {
    const file = new File(["resume"], "resume.txt", { type: "text/plain" });
    const withPhone = buildApplyFormData({
      jobId: "j1",
      name: "Jane",
      email: "jane@example.com",
      phone: "123",
      resume: file,
    });
    expect(withPhone.get("phone")).toBe("123");
    expect(withPhone.get("jobId")).toBe("j1");

    const withoutPhone = buildApplyFormData({
      jobId: "j1",
      name: "Jane",
      email: "jane@example.com",
      resume: file,
    });
    expect(withoutPhone.get("phone")).toBeNull();
  });
});

describe("rankByAiScore", () => {
  it("sorts descending", () => {
    const ranked = rankByAiScore([
      { name: "a", aiScore: 10 },
      { name: "b", aiScore: 80 },
      { name: "c" },
    ]);
    expect(ranked.map((r) => r.name)).toEqual(["b", "a", "c"]);
  });
});

describe("PUBLIC_REGISTER_ROLES", () => {
  it("excludes Super Admin", () => {
    expect(PUBLIC_REGISTER_ROLES).not.toContain("Super Admin");
    expect(PUBLIC_REGISTER_ROLES).toContain("Candidate");
  });
});

describe("storage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("stores tokens and user", () => {
    storage.setTokens("a", "r");
    storage.setUser({ id: "1" });
    expect(storage.getAccessToken()).toBe("a");
    expect(storage.getRefreshToken()).toBe("r");
    expect(storage.getUser<{ id: string }>()).toEqual({ id: "1" });
    storage.clear();
    expect(storage.getAccessToken()).toBeNull();
  });
});
