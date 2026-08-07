/** All roles supported by the platform (RBAC). */
export const ROLES = [
  "Super Admin",
  "HR Admin",
  "Recruiter",
  "Hiring Manager",
  "Interviewer",
  "Candidate",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Roles allowed on the public /auth/register endpoint.
 * Super Admin is seed/admin-provisioned only (not self-service).
 */
export const PUBLIC_REGISTER_ROLES = [
  "HR Admin",
  "Recruiter",
  "Hiring Manager",
  "Interviewer",
  "Candidate",
] as const satisfies readonly Role[];

export type PublicRegisterRole = (typeof PUBLIC_REGISTER_ROLES)[number];