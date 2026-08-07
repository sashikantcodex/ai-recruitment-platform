import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const get = vi.fn();

vi.mock("axios", async () => {
  const actual = await vi.importActual<typeof import("axios")>("axios");
  return {
    ...actual,
    default: {
      ...actual.default,
      create: () => ({ post, get }),
    },
    AxiosError: actual.AxiosError,
  };
});

describe("ai.client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parseResume / scoreCandidate / rag / salary / agents", async () => {
    post
      .mockResolvedValueOnce({ data: { skills: ["React"], summary: "", experience: [], education: [], totalYears: 1 } })
      .mockResolvedValueOnce({ data: { score: 80, matchedSkills: [], missingSkills: [], rationale: "ok" } })
      .mockResolvedValueOnce({ data: { questions: ["Q1"] } })
      .mockResolvedValueOnce({ data: { summary: "notes" } })
      .mockResolvedValueOnce({ data: { id: "k1" } })
      .mockResolvedValueOnce({ data: { answer: "a", hits: [] } })
      .mockResolvedValueOnce({ data: { min: 1, mid: 2, max: 3, currency: "USD", rationale: "x" } })
      .mockResolvedValueOnce({ data: { agent: "hr", result: {} } });
    get.mockResolvedValue({ data: { status: "ok" } });

    const client = await import("./ai.client.ts");
    expect(await client.checkAiHealth()).toMatchObject({ status: "ok" });
    expect((await client.parseResume({ resumeId: "r1", filePath: "/tmp/r", mimeType: "text/plain" })).skills).toContain("React");
    expect((await client.scoreCandidate({ jobId: "j1", jdText: "React", parsedResume: { skills: [], summary: "", experience: [], education: [], totalYears: 0 } })).score).toBe(80);
    expect(await client.generateInterviewQuestions({ jdText: "x", skills: [] })).toEqual(["Q1"]);
    expect(await client.summarizeInterviewNotes({ notes: "n", questions: [] })).toBe("notes");
    await client.ragIngest({ title: "t", content: "long enough content here" });
    await client.ragQuery({ query: "q" });
    await client.salaryBenchmark({ title: "Eng" });
    await client.runAgent({ agent: "hr", payload: {} });
  });

  it("maps AxiosError to AppError", async () => {
    const err = new AxiosError("boom");
    err.response = { data: { detail: "bad" }, status: 500, statusText: "err", headers: {}, config: {} as never };
    post.mockRejectedValue(err);
    const client = await import("./ai.client.ts");
    await expect(client.ragQuery({ query: "q" })).rejects.toMatchObject({ code: "AI_UPSTREAM_ERROR" });
  });
});
