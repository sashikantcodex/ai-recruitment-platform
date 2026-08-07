import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/App.Error.ts";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { runAgentOrchestrated } from "./agents.service.ts";

export const run = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const agent = z.enum(["recruiter", "interview", "hr"]).parse(req.params.name);
  const payload = z.record(z.string(), z.unknown()).parse(req.body ?? {});
  res.json(
    await runAgentOrchestrated({
      agent,
      payload,
      userId: req.user.id,
    }),
  );
});
