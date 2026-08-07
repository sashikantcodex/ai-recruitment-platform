import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockRes } from "../../test/mocks.ts";

const ai = vi.hoisted(() => ({
  ragIngest: vi.fn(),
  ragQuery: vi.fn(),
}));

vi.mock("../ai-clients/ai.client.ts", () => ai);

describe("knowledge.controller — ingest / query", () => {
  beforeEach(() => vi.clearAllMocks());
  const next = vi.fn();

  it("ingest documents", async () => {
    ai.ragIngest.mockResolvedValue({ id: "k1", title: "Policy" });
    const { ingest } = await import("./knowledge.controller.ts");
    const res = mockRes();
    await ingest(
      {
        body: {
          title: "Hiring Policy",
          content: "We hire fairly and without bias always.",
          category: "policy",
        },
      } as never,
      res as never,
      next as never,
    );
    expect(res.statusCode).toBe(201);
  });

  it("query knowledge base", async () => {
    ai.ragQuery.mockResolvedValue({ answer: "Use band mid", hits: [] });
    const { query } = await import("./knowledge.controller.ts");
    const res = mockRes();
    await query(
      { body: { query: "salary band", topK: 3 } } as never,
      res as never,
      next as never,
    );
    expect(res.body).toMatchObject({ answer: "Use band mid" });
  });
});
