import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockRes } from "../../test/mocks.ts";

const orchestrated = vi.hoisted(() => ({
  runAgentOrchestrated: vi.fn(),
}));

vi.mock("./agents.service.ts", () => orchestrated);

describe("agents.controller — orchestrated run", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes userId and payload to orchestrator", async () => {
    orchestrated.runAgentOrchestrated.mockResolvedValue({
      advisory: { agent: "recruiter", status: "ok", result: {} },
      executed: { action: "shortlist" },
    });
    const { run } = await import("./agents.controller.ts");
    const res = mockRes();
    await run(
      {
        user: { id: "u1" },
        params: { name: "recruiter" },
        body: { execute: true, jobId: "j1" },
      } as never,
      res as never,
      vi.fn() as never,
    );
    expect(orchestrated.runAgentOrchestrated).toHaveBeenCalledWith({
      agent: "recruiter",
      payload: { execute: true, jobId: "j1" },
      userId: "u1",
    });
    expect(res.body).toMatchObject({ executed: { action: "shortlist" } });
  });
});
