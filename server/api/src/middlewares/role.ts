import type { NextFunction, Request, Response } from "express";
import type { Role } from "../config/role.ts";
import { AppError } from "../utils/App.Error.ts";

export function requiredRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }

    next();
  };
}
