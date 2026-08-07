import { describe, expect, it } from "vitest";
import { asyncHandler } from "./asyncHandler.ts";
import type { Request, Response, NextFunction } from "express";

describe("asyncHandler", () => {
  it("forwards resolved handlers", async () => {
    const handler = asyncHandler(async (_req: Request, res: Response) => {
      res.status(200).json({ ok: true });
    });

    let statusCode = 0;
    let body: unknown;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        body = payload;
        return this;
      },
    } as unknown as Response;

    await handler({} as Request, res, (() => undefined) as NextFunction);
    expect(statusCode).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("forwards rejected errors to next", async () => {
    const error = new Error("boom");
    const handler = asyncHandler(async () => {
      throw error;
    });

    let captured: unknown;
    await handler({} as Request, {} as Response, ((err?: unknown) => {
      captured = err;
    }) as NextFunction);

    expect(captured).toBe(error);
  });
});
