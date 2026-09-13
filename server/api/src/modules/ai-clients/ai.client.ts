import axios, { AxiosError } from "axios";
import { env } from "../../config/config.ts";
import { AppError } from "../../utils/App.Error.ts";

export type ParsedResume = {
  summary: string;
  skills: string[];
  experience: Array<{ title: string; company: string; years: number }>;
  education: Array<{ degree: string; institution: string }>;
  totalYears: number;
};

export type ScoreResult = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  rationale: string;
};

const ai = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 60_000,
  headers: { "X-Service-Token": env.AI_SERVICE_TOKEN },
});

function mapError(err: unknown): never {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail ?? err.message;
    throw new AppError(`AI service error: ${detail}`, 502, "AI_UPSTREAM_ERROR");
  }
  throw err;
}

export async function checkAiHealth() {
  try {
    const { data } = await ai.get("/health");
    return data;
  } catch (err) {
    mapError(err);
  }
}

export async function parseResume(input: {
  resumeId: string;
  filePath: string;
  mimeType: string;
}): Promise<ParsedResume> {
  try {
    const { data } = await ai.post<ParsedResume>("/internal/v1/parse", input);
    return data;
  } catch (err) {
    mapError(err);
  }
}

export async function scoreCandidate(input: {
  jobId: string;
  jdText: string;
  parsedResume: ParsedResume;
}): Promise<ScoreResult> {
  try {
    const { data } = await ai.post<ScoreResult>("/internal/v1/score", input);
    return data;
  } catch (err) {
    mapError(err);
  }
}

export async function generateInterviewQuestions(input: {
  jdText: string;
  skills: string[];
}): Promise<string[]> {
  try {
    const { data } = await ai.post<{ questions: string[] }>(
      "/internal/v1/interview/questions",
      input,
    );
    return data.questions;
  } catch (err) {
    mapError(err);
  }
}

export async function summarizeInterviewNotes(input: {
  notes: string;
  questions: string[];
}): Promise<string> {
  try {
    const { data } = await ai.post<{ summary: string }>(
      "/internal/v1/interview/notes-summary",
      input,
    );
    return data.summary;
  } catch (err) {
    mapError(err);
  }
}

export async function ragIngest(input: {
  title: string;
  content: string;
  category?: string;
}) {
  try {
    const { data } = await ai.post("/internal/v1/rag/ingest", input);
    return data;
  } catch (err) {
    mapError(err);
  }
}

export async function ragQuery(input: { query: string; topK?: number }) {
  try {
    const { data } = await ai.post("/internal/v1/rag/query", input);
    return data;
  } catch (err) {
    mapError(err);
  }
}

export async function salaryBenchmark(input: {
  title: string;
  location?: string;
  years?: number;
}) {
  try {
    const { data } = await ai.post("/internal/v1/salary/benchmark", input);
    return data as {
      min: number;
      mid: number;
      max: number;
      currency: string;
      rationale: string;
    };
  } catch (err) {
    mapError(err);
  }
}

export type SourcingMatch = {
  candidateId: string;
  name: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  rationale: string;
};

export async function matchSourcingCandidates(input: {
  jdText: string;
  skills: string[];
  location?: string;
  candidates: Array<{
    candidateId: string;
    name: string;
    skills: string[];
    summary?: string;
    location?: string;
    totalYears?: number;
  }>;
}): Promise<SourcingMatch[]> {
  try {
    const { data } = await ai.post<{ matches: SourcingMatch[] }>(
      "/internal/v1/sourcing/match",
      input,
    );
    return data.matches;
  } catch (err) {
    mapError(err);
  }
}

export async function draftOutreach(input: {
  candidateName: string;
  jobTitle: string;
  company?: string;
  matchedSkills?: string[];
  applyUrl?: string;
}): Promise<{ subject: string; body: string }> {
  try {
    const { data } = await ai.post<{ subject: string; body: string }>(
      "/internal/v1/sourcing/outreach",
      input,
    );
    return data;
  } catch (err) {
    mapError(err);
  }
}

export type AiAssessmentQuestion = {
  prompt: string;
  type: "mcq" | "short" | "code";
  options: string[];
  correctIndex: number | null;
  expected: string;
  weight: number;
  skill: string;
};

export async function generateAssessment(input: {
  jobTitle: string;
  jdText: string;
  skills: string[];
  numQuestions?: number;
  difficulty?: "easy" | "medium" | "hard";
}): Promise<{
  title: string;
  durationMinutes: number;
  passingScore: number;
  questions: AiAssessmentQuestion[];
}> {
  try {
    const { data } = await ai.post("/internal/v1/assessment/generate", input);
    return data;
  } catch (err) {
    mapError(err);
  }
}

export type GradedQuestion = {
  questionIndex: number;
  awarded: number;
  max: number;
  correct: boolean;
  feedback: string;
};

export async function gradeAssessment(input: {
  questions: Array<{
    prompt: string;
    type: "mcq" | "short" | "code";
    options?: string[];
    correctIndex?: number | null;
    expected?: string;
    weight?: number;
  }>;
  answers: Array<{
    questionIndex: number;
    selectedIndex?: number | null;
    response?: string;
  }>;
}): Promise<{ score: number; perQuestion: GradedQuestion[]; summary: string }> {
  try {
    const { data } = await ai.post("/internal/v1/assessment/grade", input);
    return data;
  } catch (err) {
    mapError(err);
  }
}

export async function nextInterviewTurn(input: {
  jdText: string;
  skills: string[];
  plannedQuestions: string[];
  transcript: Array<{ question: string; answer: string }>;
  maxQuestions?: number;
}): Promise<{ question: string; isFinal: boolean; turnIndex: number }> {
  try {
    const { data } = await ai.post("/internal/v1/interview/ai-turn", input);
    return data;
  } catch (err) {
    mapError(err);
  }
}

export type InterviewEvaluation = {
  technical: number;
  communication: number;
  culture: number;
  recommendation: "strong_yes" | "yes" | "no" | "strong_no";
  strengths: string[];
  concerns: string[];
  summary: string;
};

export async function evaluateInterviewTranscript(input: {
  jdText: string;
  skills: string[];
  transcript: Array<{ question: string; answer: string }>;
}): Promise<InterviewEvaluation> {
  try {
    const { data } = await ai.post<InterviewEvaluation>(
      "/internal/v1/interview/evaluate",
      input,
    );
    return data;
  } catch (err) {
    mapError(err);
  }
}

export type EvaluationSummary = {
  overallScore: number;
  recommendation: "hire" | "hold" | "reject";
  strengths: string[];
  concerns: string[];
  summary: string;
};

export async function summarizeEvaluation(input: {
  jobTitle: string;
  screeningScore?: number | null;
  assessmentScore?: number | null;
  interviews: Array<{
    technical: number;
    communication: number;
    culture: number;
    recommendation: string;
    source: string;
  }>;
  matchedSkills?: string[];
  missingSkills?: string[];
}): Promise<EvaluationSummary> {
  try {
    const { data } = await ai.post<EvaluationSummary>(
      "/internal/v1/evaluation/summary",
      input,
    );
    return data;
  } catch (err) {
    mapError(err);
  }
}

export async function runAgent(input: {
  agent: "recruiter" | "interview" | "hr";
  payload: Record<string, unknown>;
}) {
  try {
    const { data } = await ai.post(`/internal/v1/agents/${input.agent}/run`, input.payload);
    return data;
  } catch (err) {
    mapError(err);
  }
}
