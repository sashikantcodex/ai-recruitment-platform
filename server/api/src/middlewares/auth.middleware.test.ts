import { describe, expect, it, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

describe("authenticate middleware", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects missing bearer token", async () => {
    const { authenticate } = await import("./auth.middleware.ts");
    const next = vi.fn() as unknown as NextFunction;
    authenticate({ headers: {} } as Request, {} as Response, next);
    expect(next).toHaveBeenCalled();
    const err = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      statusCode: number;
    };
    expect(err.statusCode).toBe(401);
  });

  it("attaches user from valid JWT", async () => {
    const { authenticate } = await import("./auth.middleware.ts");
    const token = jwt.sign(
      { sub: "u1", email: "a@b.com", role: "Recruiter" },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: "15m" },
    );
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const next = vi.fn() as unknown as NextFunction;
    authenticate(req, {} as Response, next);
    expect(req.user).toEqual({ id: "u1", email: "a@b.com", role: "Recruiter" });
    expect(next).toHaveBeenCalledWith();
  });
});
