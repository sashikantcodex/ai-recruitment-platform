import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/config.ts";
import type { Role } from "../config/role.ts";
import { AppError } from "../utils/App.Error.ts";

type AccessPayload = { sub: string; email: string; role: Role };

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Missing access token", 401, "UNAUTHORIZED"));
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new AppError("Invalid or expired access token", 401, "UNAUTHORIZED"));
  }
}