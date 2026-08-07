import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/config.ts";
import { AppError } from "../utils/App.Error.ts";
import { logger } from "../utils/logger.ts";

/** Central error mapper: AppError / Zod → JSON; unexpected → 500. */
export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      requestId: req.requestId,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid request data",
      errors: err.issues,
      requestId: req.requestId,
    });
  }

  logger.error({ err, requestId: req.requestId }, "Unhandled error");

  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong",
    requestId: req.requestId,
    ...(env.NODE_ENV !== "production" && {
      stack: err instanceof Error ? err.stack : undefined,
    }),
  });
};
