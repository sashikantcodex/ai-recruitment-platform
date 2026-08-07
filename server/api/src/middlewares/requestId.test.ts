import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

describe("requestId middleware", () => {
  it("assigns requestId and header", async () => {
    const { requestId } = await import("./requestId.ts");
    const req = { headers: {} } as Request;
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;
    requestId(req, res, next);
    expect(req.requestId).toBeTruthy();
    expect(res.setHeader).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});
