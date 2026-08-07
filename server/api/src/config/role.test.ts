import { describe, expect, it } from "vitest";
import { PUBLIC_REGISTER_ROLES, ROLES } from "./role.ts";

describe("roles", () => {
  it("includes all platform roles", () => {
    expect(ROLES).toContain("Super Admin");
    expect(ROLES).toContain("Candidate");
    expect(ROLES.length).toBe(6);
  });

  it("excludes Super Admin from public registration", () => {
    expect(PUBLIC_REGISTER_ROLES).not.toContain("Super Admin");
    expect(PUBLIC_REGISTER_ROLES).toContain("Recruiter");
    expect(PUBLIC_REGISTER_ROLES).toContain("HR Admin");
  });
});
