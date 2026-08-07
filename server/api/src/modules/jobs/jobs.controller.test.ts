import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockRes } from "../../test/mocks.ts";

const jobsService = vi.hoisted(() => ({
  createJob: vi.fn(),
  getJobs: vi.fn(),
  getJobById: vi.fn(),
  updateJob: vi.fn(),
  deleteJob: vi.fn(),
  submitJob: vi.fn(),
  approveJob: vi.fn(),
  closeJob: vi.fn(),
  getJobRankings: vi.fn(),
}));

vi.mock("./jobs.service.ts", () => jobsService);

describe("jobs.controller — all job routes", () => {
  beforeEach(() => vi.clearAllMocks());

  const user = { id: "u1", email: "a@b.com", role: "Recruiter" as const };
  const next = vi.fn();

  it("createJob", async () => {
    jobsService.createJob.mockResolvedValue({ _id: "j1" });
    const { createJob } = await import("./jobs.controller.ts");
    const res = mockRes();
    await createJob(
      {
        user,
        body: { title: "Eng", description: "Long enough description" },
      } as never,
      res as never,
      next as never,
    );
    expect(res.statusCode).toBe(201);
  });

  it("getJobs / getJobById / update / delete", async () => {
    jobsService.getJobs.mockResolvedValue([]);
    jobsService.getJobById.mockResolvedValue({ _id: "j1" });
    jobsService.updateJob.mockResolvedValue({ _id: "j1" });
    jobsService.deleteJob.mockResolvedValue(undefined);
    const ctrl = await import("./jobs.controller.ts");
    const res = mockRes();
    await ctrl.getJobs({} as never, res as never, next as never);
    expect(res.statusCode).toBe(200);
    await ctrl.getJobById({ params: { id: "j1" } } as never, res as never, next as never);
    await ctrl.updateJob(
      {
        params: { id: "j1" },
        body: { title: "Eng", description: "Long enough description" },
      } as never,
      res as never,
      next as never,
    );
    await ctrl.deleteJob({ params: { id: "j1" } } as never, res as never, next as never);
    expect(res.statusCode).toBe(204);
  });

  it("submit / approve / close / rankings", async () => {
    jobsService.submitJob.mockResolvedValue({});
    jobsService.approveJob.mockResolvedValue({});
    jobsService.closeJob.mockResolvedValue({});
    jobsService.getJobRankings.mockResolvedValue([]);
    const ctrl = await import("./jobs.controller.ts");
    const res = mockRes();
    await ctrl.submitJob({ user, params: { id: "j1" } } as never, res as never, next as never);
    await ctrl.approveJob({ user, params: { id: "j1" } } as never, res as never, next as never);
    await ctrl.closeJob({ user, params: { id: "j1" } } as never, res as never, next as never);
    await ctrl.getRankings({ params: { id: "j1" } } as never, res as never, next as never);
    expect(jobsService.getJobRankings).toHaveBeenCalledWith("j1");
  });
});
