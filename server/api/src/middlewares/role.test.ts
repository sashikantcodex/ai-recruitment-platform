import { describe, expect, it } from "vitest";
import { requiredRole } from "./role.ts";
import type { Request, Response } from "express";
import { AppError } from "../utils/App.Error.ts";

function mockReq(role?: string): Request {
  return {
    user: role ? { id: "u1", email: "a@b.com", role } : undefined,
  } as unknown as Request;
}

describe("requiredRole middleware", () => {
  it("rejects missing user", () => {
    const mw = requiredRole("Recruiter");
    let captured: unknown;
    mw(mockReq(), {} as Response, (err) => {
      captured = err;
    });
    expect(captured).toBeInstanceOf(AppError);
    expect((captured as AppError).statusCode).toBe(401);
  });

  it("rejects wrong role", () => {
    const mw = requiredRole("Recruiter", "HR Admin");
    let captured: unknown;
    mw(mockReq("Candidate"), {} as Response, (err) => {
      captured = err;
    });
    expect(captured).toBeInstanceOf(AppError);
    expect((captured as AppError).statusCode).toBe(403);
  });

  it("allows matching role", () => {
    const mw = requiredRole("Recruiter");
    let nextCalled = false;
    mw(mockReq("Recruiter"), {} as Response, (err) => {
      nextCalled = err === undefined;
    });
    expect(nextCalled).toBe(true);
  });
});
