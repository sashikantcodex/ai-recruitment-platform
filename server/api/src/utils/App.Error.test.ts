import { describe, expect, it } from "vitest";
import { AppError } from "./App.Error.ts";

describe("AppError", () => {
  it("stores operational error metadata", () => {
    const err = new AppError("User already exists", 400, "USER_ALREADY_EXISTS");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("User already exists");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("USER_ALREADY_EXISTS");
    expect(err.isOperational).toBe(true);
  });

  it("allows marking errors as non-operational", () => {
    const err = new AppError("Boom", 500, "INTERNAL", false);
    expect(err.isOperational).toBe(false);
  });
});
