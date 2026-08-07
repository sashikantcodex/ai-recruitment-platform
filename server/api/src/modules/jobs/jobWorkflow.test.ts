import { describe, expect, it } from "vitest";
import { AppError } from "../../utils/App.Error.ts";
import {
  assertCanApprove,
  assertCanClose,
  assertCanSubmit,
  isPublicRegisterRole,
} from "./jobWorkflow.ts";

describe("jobWorkflow", () => {
  it("allows submit only from draft", () => {
    expect(() => assertCanSubmit("draft")).not.toThrow();
    expect(() => assertCanSubmit("published")).toThrow(AppError);
  });

  it("allows approve only from pending_approval", () => {
    expect(() => assertCanApprove("pending_approval")).not.toThrow();
    expect(() => assertCanApprove("draft")).toThrow(AppError);
  });

  it("blocks close when already closed", () => {
    expect(() => assertCanClose("published")).not.toThrow();
    expect(() => assertCanClose("closed")).toThrow(AppError);
  });

  it("validates public register roles", () => {
    expect(isPublicRegisterRole("Recruiter")).toBe(true);
    expect(isPublicRegisterRole("Super Admin")).toBe(false);
    expect(isPublicRegisterRole("unknown")).toBe(false);
  });
});
