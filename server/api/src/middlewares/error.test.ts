import { describe, expect, it, vi } from "vitest";
import { ZodError, z } from "zod";
import { AppError } from "../utils/App.Error.ts";
import { mockRes } from "../test/mocks.ts";

describe("errorMiddleware", () => {
  it("maps AppError / ZodError / unknown", async () => {
    const { errorMiddleware } = await import("./error.ts");
    const req = { requestId: "r1" } as never;

    const res1 = mockRes();
    errorMiddleware(new AppError("nope", 404, "NOT_FOUND"), req, res1 as never, vi.fn() as never);
    expect(res1.statusCode).toBe(404);

    const res2 = mockRes();
    try {
      z.object({ email: z.string().email() }).parse({ email: "bad" });
    } catch (err) {
      errorMiddleware(err as ZodError, req, res2 as never, vi.fn() as never);
    }
    expect(res2.statusCode).toBe(400);

    const res3 = mockRes();
    errorMiddleware(new Error("boom"), req, res3 as never, vi.fn() as never);
    expect(res3.statusCode).toBe(500);
  });
});
