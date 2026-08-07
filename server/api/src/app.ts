import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorMiddleware } from "./middlewares/error.ts";
import { requestId } from "./middlewares/requestId.ts";
import v1 from "./routes/v1/index.ts";

/** Express application factory — exported so tests / Docker entry share one app. */
export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(requestId);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ats-api", version: "v1" });
});

// Versioned REST surface consumed by the Next.js client.
app.use("/api/v1", v1);
app.use(errorMiddleware);
