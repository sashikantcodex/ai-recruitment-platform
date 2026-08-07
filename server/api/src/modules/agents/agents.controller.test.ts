import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockRes } from "../../test/mocks.ts";

const ai = vi.hoisted(() => ({
  runAgent: vi.fn(),
}));

vi.mock("../ai-clients/ai.client.ts", () => ai);

describe("agents.controller — POST /agents/:name/run", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs recruiter agent", async () => {
    ai.runAgent.mockResolvedValue({ agent: "recruiter", result: { shortlist: [] } });
    const { run } = await import("./agents.controller.ts");
    const res = mockRes();
    await run(
      { params: { name: "recruiter" }, body: { jdText: "React" } } as never,
      res as never,
      vi.fn() as never,
    );
    expect(res.body).toMatchObject({ agent: "recruiter" });
  });
});
