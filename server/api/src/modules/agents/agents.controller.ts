import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { runAgent } from "../ai-clients/ai.client.ts";

export const run = asyncHandler(async (req: Request, res: Response) => {
  const agent = z.enum(["recruiter", "interview", "hr"]).parse(req.params.name);
  const payload = z.record(z.string(), z.unknown()).parse(req.body ?? {});
  res.json(await runAgent({ agent, payload }));
});
