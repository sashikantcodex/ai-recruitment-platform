import type { Role } from "../../config/role.ts";
import { PUBLIC_REGISTER_ROLES } from "../../config/role.ts";
import { AppError } from "../../utils/App.Error.ts";

/** Job lifecycle states used by submit / approve / close. */
export type JobStatus = "draft" | "pending_approval" | "published" | "closed";

/**
 * Pure workflow transitions — kept free of DB so unit tests can cover RBAC-adjacent rules.
 * Invalid transitions throw AppError with INVALID_JOB_STATUS.
 */
export function assertCanSubmit(status: JobStatus): void {
  if (status !== "draft") {
    throw new AppError("Only draft jobs can be submitted", 400, "INVALID_JOB_STATUS");
  }
}

export function assertCanApprove(status: JobStatus): void {
  if (status !== "pending_approval") {
    throw new AppError("Job is not pending approval", 400, "INVALID_JOB_STATUS");
  }
}

export function assertCanClose(status: JobStatus): void {
  if (status === "closed") {
    throw new AppError("Job is already closed", 400, "INVALID_JOB_STATUS");
  }
}

/** True when role is allowed on public /auth/register. */
export function isPublicRegisterRole(role: string): role is Role {
  return (PUBLIC_REGISTER_ROLES as readonly string[]).includes(role);
}
