import type { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../utils/asyncHandler.ts";
import { ragIngest, ragQuery } from "../ai-clients/ai.client.ts";

export const ingest = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      title: z.string().min(1),
      content: z.string().min(10),
      category: z.string().optional(),
    })
    .parse(req.body);
  res.status(201).json(await ragIngest(body));
});

export const query = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      query: z.string().min(1),
      topK: z.number().int().min(1).max(20).optional(),
    })
    .parse(req.body);
  res.json(await ragQuery(body));
});
