import { beforeEach, describe, expect, it, vi } from "vitest";

const jobsService = vi.hoisted(() => ({
  getJobRankings: vi.fn(),
}));
const applicationsService = vi.hoisted(() => ({
  updateApplicationStage: vi.fn(),
}));
const interviewsService = vi.hoisted(() => ({
  createInterview: vi.fn(),
  generateQuestions: vi.fn(),
  scheduleInterview: vi.fn(),
}));
const offersService = vi.hoisted(() => ({
  createOffer: vi.fn(),
  sendOffer: vi.fn(),
  respondToOffer: vi.fn(),
}));
const ai = vi.hoisted(() => ({
  runAgent: vi.fn(),
}));
const Application = vi.hoisted(() => ({
  findById: vi.fn(),
}));
const Job = vi.hoisted(() => ({
  findById: vi.fn(),
}));

vi.mock("../jobs/jobs.service.ts", () => jobsService);
vi.mock("../applications/applications.service.ts", () => applicationsService);
vi.mock("../interviews/interviews.service.ts", () => interviewsService);
vi.mock("../offers/offers.service.ts", () => offersService);
vi.mock("../ai-clients/ai.client.ts", () => ai);
vi.mock("../applications/application.model.ts", () => ({ default: Application }));
vi.mock("../jobs/job.model.ts", () => ({ default: Job }));
vi.mock("../applications/application.pipeline.ts", () => ({
  canTransition: (from: string, to: string) => {
    const map: Record<string, string[]> = {
      applied: ["screened", "rejected"],
      screened: ["assessment", "interview", "rejected"],
      assessment: ["interview", "rejected"],
      interview: ["offer", "rejected"],
      offer: ["hired", "rejected"],
    };
    return from === to || (map[from]?.includes(to) ?? false);
  },
}));

describe("agents.service orchestrator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns advisory only when execute is false", async () => {
    ai.runAgent.mockResolvedValue({ agent: "recruiter", status: "ok", result: { ranked: [] } });
    Job.findById.mockResolvedValue(null);
    jobsService.getJobRankings.mockResolvedValue([]);
    const { runAgentOrchestrated } = await import("./agents.service.ts");
    const out = await runAgentOrchestrated({
      agent: "recruiter",
      payload: { execute: false, jobId: "j1" },
      userId: "u1",
    });
    expect(out.executed).toBeNull();
    expect(out.advisory).toMatchObject({ agent: "recruiter" });
  });

  it("interview execute creates interview + questions", async () => {
    ai.runAgent.mockResolvedValue({ agent: "interview", status: "ok", result: {} });
    Application.findById.mockResolvedValue({ stage: "screened" });
    applicationsService.updateApplicationStage.mockResolvedValue({ stage: "interview" });
    interviewsService.createInterview.mockResolvedValue({ _id: { toString: () => "i1" } });
    interviewsService.generateQuestions.mockResolvedValue({
      questions: ["Q1"],
      _id: { toString: () => "i1" },
    });

    const { runAgentOrchestrated } = await import("./agents.service.ts");
    const out = await runAgentOrchestrated({
      agent: "interview",
      payload: {
        execute: true,
        applicationId: "a1",
        scheduledAt: new Date().toISOString(),
      },
      userId: "507f1f77bcf86cd799439011",
    });
    expect(interviewsService.createInterview).toHaveBeenCalled();
    expect(interviewsService.generateQuestions).toHaveBeenCalled();
    expect(interviewsService.scheduleInterview).toHaveBeenCalled();
    expect(out.executed).toMatchObject({ action: "prepare_interview", interviewId: "i1" });
  });

  it("hr execute creates, sends, and accepts offer", async () => {
    ai.runAgent.mockResolvedValue({ agent: "hr", status: "ok", result: {} });
    offersService.createOffer.mockResolvedValue({
      _id: { toString: () => "o1" },
      salary: 140000,
      currency: "USD",
      status: "draft",
    });
    offersService.sendOffer.mockResolvedValue({
      _id: { toString: () => "o1" },
      status: "sent",
      signingUrl: "http://sign",
    });
    offersService.respondToOffer.mockResolvedValue({
      _id: { toString: () => "o1" },
      status: "accepted",
    });

    const { runAgentOrchestrated } = await import("./agents.service.ts");
    const out = await runAgentOrchestrated({
      agent: "hr",
      payload: { execute: true, applicationId: "a1", send: true, accept: true },
      userId: "507f1f77bcf86cd799439011",
    });
    expect(out.executed).toMatchObject({
      action: "draft_offer",
      offerId: "o1",
      onboardingCreated: true,
    });
  });
});
