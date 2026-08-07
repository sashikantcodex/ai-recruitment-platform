import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQuery } from "../../test/mocks.ts";

const Job = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
}));

const Application = vi.hoisted(() => ({
  find: vi.fn(),
}));

vi.mock("./job.model.ts", () => ({ default: Job }));
vi.mock("../applications/application.model.ts", () => ({ default: Application }));

describe("jobs.service — CRUD + submit/approve/close + rankings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createJob creates draft", async () => {
    Job.create.mockResolvedValue({ _id: "j1", status: "draft" });
    const { createJob } = await import("./jobs.service.ts");
    const job = await createJob({
      title: "Eng",
      description: "Build things well",
      createdBy: "507f1f77bcf86cd799439011",
    });
    expect(job.status).toBe("draft");
  });

  it("getJobs lists with populate chain", async () => {
    Job.find.mockReturnValue(mockQuery([{ _id: "j1" }]));
    const { getJobs } = await import("./jobs.service.ts");
    const jobs = await getJobs();
    expect(jobs).toHaveLength(1);
  });

  it("getJobById throws when missing", async () => {
    Job.findById.mockReturnValue(mockQuery(null));
    const { getJobById } = await import("./jobs.service.ts");
    await expect(getJobById("missing")).rejects.toMatchObject({ code: "JOB_NOT_FOUND" });
  });

  it("updateJob and deleteJob", async () => {
    Job.findByIdAndUpdate.mockReturnValue(mockQuery({ _id: "j1", title: "X" }));
    Job.findByIdAndDelete.mockResolvedValue({ _id: "j1" });
    const { updateJob, deleteJob } = await import("./jobs.service.ts");
    expect((await updateJob("j1", { title: "X" })).title).toBe("X");
    await deleteJob("j1");
    expect(Job.findByIdAndDelete).toHaveBeenCalledWith("j1");
  });

  it("submitJob moves draft → pending_approval", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    Job.findById.mockResolvedValue({
      status: "draft",
      approvalEvents: [] as unknown[],
      save,
    });
    const { submitJob } = await import("./jobs.service.ts");
    const job = await submitJob("j1", "507f1f77bcf86cd799439011");
    expect(job.status).toBe("pending_approval");
    expect(save).toHaveBeenCalled();
  });

  it("approveJob publishes", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    Job.findById.mockReturnValue(
      mockQuery({
        status: "pending_approval",
        approvalEvents: [],
        save,
      }),
    );
    const { approveJob } = await import("./jobs.service.ts");
    const job = await approveJob("j1", "507f1f77bcf86cd799439011");
    expect(job.status).toBe("published");
  });

  it("closeJob closes published job", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    Job.findById.mockResolvedValue({
      status: "published",
      approvalEvents: [],
      save,
    });
    const { closeJob } = await import("./jobs.service.ts");
    const job = await closeJob("j1", "507f1f77bcf86cd799439011");
    expect(job.status).toBe("closed");
  });

  it("getJobRankings sorts by aiScore", async () => {
    Job.findById.mockReturnValue(mockQuery({ _id: "j1" }));
    Application.find.mockReturnValue(mockQuery([{ aiScore: 90 }]));
    const { getJobRankings } = await import("./jobs.service.ts");
    const rankings = await getJobRankings("j1");
    expect(rankings[0].aiScore).toBe(90);
  });
});
