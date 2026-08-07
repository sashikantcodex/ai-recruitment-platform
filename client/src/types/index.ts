export type Role =
  | "Super Admin"
  | "HR Admin"
  | "Recruiter"
  | "Hiring Manager"
  | "Interviewer"
  | "Candidate";

export const PUBLIC_REGISTER_ROLES = [
  "HR Admin",
  "Recruiter",
  "Hiring Manager",
  "Interviewer",
  "Candidate",
] as const satisfies readonly Role[];

export type PublicRegisterRole = (typeof PUBLIC_REGISTER_ROLES)[number];

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export const APPLICATION_STAGES = [
  "applied",
  "screened",
  "assessment",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export type Job = {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  department?: string;
  status: "draft" | "pending_approval" | "published" | "closed";
  approvalEvents?: Array<{ action: string; at?: string; note?: string }>;
  createdAt?: string;
};

export type Application = {
  _id: string;
  stage: ApplicationStage | string;
  aiScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  aiRationale?: string;
  candidateId?: { _id?: string; name: string; email: string; skills?: string[] };
  jobId?: { _id?: string; title: string; status: string };
  createdAt?: string;
};

export type Candidate = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  summary?: string;
  skills?: string[];
};

export type Interview = {
  _id: string;
  status: string;
  scheduledAt?: string;
  meetingUrl?: string;
  calendarLink?: string;
  questions?: string[];
  notes?: string;
  scorecard?: {
    technical?: number;
    communication?: number;
    culture?: number;
    notes?: string;
    recommendation?: string;
  };
  candidateId?: { _id?: string; name: string; email: string };
  jobId?: { _id?: string; title: string };
  applicationId?: string;
};

export type Offer = {
  _id: string;
  salary: number;
  currency: string;
  status: string;
  signingUrl?: string;
  benchmark?: { min: number; mid: number; max: number; rationale?: string };
  candidateId?: { _id?: string; name: string; email: string };
  jobId?: { _id?: string; title: string };
  applicationId?: string;
};

export type OnboardingPacket = {
  _id: string;
  status: string;
  checklist: Array<{ item?: string; done?: boolean }>;
  documents: Array<{ _id?: string; name: string; status: string; notes?: string }>;
  candidateId?: { name: string; email: string };
};
