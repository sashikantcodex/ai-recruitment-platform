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

export const POSTING_CHANNELS = [
  "careers_site",
  "linkedin",
  "indeed",
  "internal",
  "referral",
] as const;

export type PostingChannel = (typeof POSTING_CHANNELS)[number];

export type JobPosting = {
  slug: string;
  location?: string;
  employmentType?: "full_time" | "part_time" | "contract" | "internship";
  openings?: number;
  salaryRange?: string;
  channels?: PostingChannel[];
  postedAt?: string;
  closesAt?: string;
};

export type Job = {
  _id: string;
  title: string;
  description: string;
  skills: string[];
  department?: string;
  status: "draft" | "pending_approval" | "published" | "closed";
  approvalEvents?: Array<{ action: string; at?: string; note?: string }>;
  posting?: JobPosting;
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

export type TranscriptTurn = { question: string; answer?: string };

export type AiInterviewSession = {
  token?: string;
  status: "not_started" | "in_progress" | "completed" | "expired";
  maxQuestions?: number;
  transcript?: TranscriptTurn[];
  evaluation?: {
    technical?: number;
    communication?: number;
    culture?: number;
    recommendation?: string;
    strengths?: string[];
    concerns?: string[];
    summary?: string;
  };
};

export type Interview = {
  _id: string;
  status: string;
  mode?: "live" | "ai";
  aiSession?: AiInterviewSession;
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

// --- Candidate sourcing -------------------------------------------------

export const PROSPECT_STATUSES = [
  "sourced",
  "contacted",
  "responded",
  "converted",
  "rejected",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export type Prospect = {
  _id: string;
  name?: string;
  email?: string;
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
  rationale?: string;
  status: ProspectStatus;
  outreachSubject?: string;
  outreachBody?: string;
  applicationId?: string;
};

export type SourcingCampaign = {
  _id: string;
  name: string;
  status: string;
  minMatchScore?: number;
  sources?: string[];
  prospects: Prospect[];
  lastSearchedAt?: string;
  jobId?: { _id?: string; title: string; status?: string };
};

// --- Assessments --------------------------------------------------------

export type AssessmentQuestion = {
  prompt: string;
  type: "mcq" | "short" | "code";
  options?: string[];
  weight?: number;
  skill?: string;
};

export type Assessment = {
  _id: string;
  title: string;
  skills?: string[];
  difficulty?: string;
  durationMinutes: number;
  passingScore: number;
  questions: AssessmentQuestion[];
  jobId?: { _id?: string; title: string };
  createdAt?: string;
};

export type AssessmentAttempt = {
  _id: string;
  status: "invited" | "in_progress" | "submitted" | "graded" | "expired";
  token?: string;
  score?: number;
  passed?: boolean;
  gradingSummary?: string;
  grading?: Array<{
    questionIndex: number;
    awarded: number;
    max: number;
    correct: boolean;
    feedback: string;
  }>;
  expiresAt?: string;
  submittedAt?: string;
  candidateId?: { _id?: string; name: string; email: string };
  assessmentId?: { _id?: string; title: string; passingScore?: number };
  applicationId?: string;
};

/** Candidate-facing attempt view — never carries the answer key. */
export type CandidateAttempt = {
  token: string;
  status: string;
  title: string;
  durationMinutes: number;
  remainingMinutes: number;
  questions: AssessmentQuestion[];
};

// --- Consolidated evaluation --------------------------------------------

export const EVALUATION_DECISIONS = ["hire", "hold", "reject"] as const;
export type EvaluationDecision = (typeof EVALUATION_DECISIONS)[number];

export type Evaluation = {
  _id: string;
  overallScore: number;
  recommendation: EvaluationDecision;
  decision?: EvaluationDecision | null;
  decisionNote?: string;
  decidedAt?: string;
  signals?: {
    screeningScore?: number | null;
    assessmentScore?: number | null;
    interviewScore?: number | null;
    interviewCount?: number;
  };
  strengths?: string[];
  concerns?: string[];
  summary?: string;
  applicationId?: string;
  candidateId?: { _id?: string; name: string; email: string };
  jobId?: { _id?: string; title: string };
};

// --- Public careers surface ---------------------------------------------

export type PublicPosting = {
  _id: string;
  title: string;
  description: string;
  skills?: string[];
  department?: string;
  posting?: JobPosting;
};

export type CandidateInterviewSession = {
  token: string;
  status: string;
  jobTitle?: string;
  question?: string;
  currentQuestion?: string;
  askedCount: number;
  maxQuestions: number;
  transcript?: TranscriptTurn[];
  isFinal?: boolean;
};
