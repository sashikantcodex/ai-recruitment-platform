import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("./http.service", () => ({ http }));

describe("platform.service — candidates/interviews/offers/onboarding/knowledge/agents/templates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("candidates", async () => {
    http.get
      .mockResolvedValueOnce({ data: [{ _id: "c1" }] })
      .mockResolvedValueOnce({ data: { candidate: { _id: "c1" }, resumes: [] } });
    http.put.mockResolvedValue({ data: { _id: "c1", name: "Sam" } });
    const svc = await import("./platform.service");
    expect(await svc.listCandidates()).toHaveLength(1);
    expect((await svc.getCandidate("c1")).candidate._id).toBe("c1");
    expect((await svc.updateCandidate("c1", { name: "Sam" })).name).toBe("Sam");
  });

  it("interviews", async () => {
    http.get.mockResolvedValue({ data: [{ _id: "i1" }] });
    http.post
      .mockResolvedValueOnce({ data: { _id: "i1" } })
      .mockResolvedValueOnce({ data: { _id: "i1", status: "scheduled" } })
      .mockResolvedValueOnce({ data: { _id: "i1", questions: ["Q1"] } })
      .mockResolvedValueOnce({ data: { _id: "i1", status: "completed" } });
    const svc = await import("./platform.service");
    expect(await svc.listInterviews()).toHaveLength(1);
    await svc.createInterview("a1");
    await svc.scheduleInterview("i1", new Date().toISOString());
    await svc.generateInterviewQuestions("i1");
    await svc.saveInterviewScorecard("i1", {
      technical: 4,
      communication: 4,
      culture: 4,
      recommendation: "yes",
    });
  });

  it("offers + onboarding + knowledge + agents + templates/departments", async () => {
    http.get
      .mockResolvedValueOnce({ data: [{ _id: "o1" }] })
      .mockResolvedValueOnce({ data: [{ _id: "ob1" }] })
      .mockResolvedValueOnce({ data: [{ _id: "d1", name: "Eng", code: "ENG" }] })
      .mockResolvedValueOnce({
        data: [{ _id: "t1", name: "SE", title: "SE", description: "desc" }],
      });
    http.post
      .mockResolvedValueOnce({ data: { _id: "o1", status: "draft" } })
      .mockResolvedValueOnce({ data: { _id: "o1", status: "sent" } })
      .mockResolvedValueOnce({ data: { _id: "o1", status: "accepted" } })
      .mockResolvedValueOnce({ data: { _id: "ob1" } })
      .mockResolvedValueOnce({ data: { id: "k1" } })
      .mockResolvedValueOnce({ data: { answer: "ok", hits: [] } })
      .mockResolvedValueOnce({ data: { agent: "hr", result: {} } })
      .mockResolvedValueOnce({ data: { _id: "t1" } });
    http.patch.mockResolvedValue({ data: { _id: "ob1" } });

    const svc = await import("./platform.service");
    await svc.listOffers();
    await svc.createOffer("a1", 140000);
    await svc.sendOffer("o1");
    await svc.respondOffer("o1", "accepted");
    await svc.listOnboarding();
    await svc.toggleOnboardingChecklist("ob1", 0, true);
    await svc.verifyOnboardingDoc("ob1", "d1", "verified");
    await svc.knowledgeIngest({
      title: "Policy",
      content: "Hire fairly without bias always.",
    });
    expect((await svc.knowledgeQuery("salary")).answer).toBe("ok");
    await svc.runAgent("hr", { title: "Engineer" });
    expect(await svc.listDepartments()).toHaveLength(1);
    expect(await svc.listTemplates()).toHaveLength(1);
    await svc.createTemplate({
      name: "SE",
      title: "Software Engineer",
      description: "Build scalable systems",
    });
  });
});
