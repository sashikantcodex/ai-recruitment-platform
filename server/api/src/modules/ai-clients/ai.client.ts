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
