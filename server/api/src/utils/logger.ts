import pino from "pino";
import { env } from "../config/config.ts";

/** Structured logger used by server bootstrap and error middleware. */
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  ...(env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});
