import type { Role } from "../config/role.ts";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        email: string;
      };
      requestId?: string;
    }
  }
}

export {};