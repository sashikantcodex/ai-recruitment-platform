import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./http.service", () => ({ http }));

describe("jobs.service — all job endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("covers CRUD + workflow + rankings", async () => {
    http.get
      .mockResolvedValueOnce({ data: [{ _id: "j1" }] })
      .mockResolvedValueOnce({ data: { _id: "j1" } })
      .mockResolvedValueOnce({ data: [{ aiScore: 90 }] });
    http.post
      .mockResolvedValueOnce({ data: { _id: "j1" } })
      .mockResolvedValueOnce({ data: { message: "submitted" } })
      .mockResolvedValueOnce({ data: { message: "approved" } })
      .mockResolvedValueOnce({ data: { message: "closed" } });
    http.put.mockResolvedValue({ data: { _id: "j1", title: "Updated" } });
    http.delete.mockResolvedValue({});

    const svc = await import("./jobs.service");
    expect(await svc.getJobs("published")).toHaveLength(1);
    expect((await svc.getJobById("j1"))._id).toBe("j1");
    expect(
      (
        await svc.createJob({
          title: "Eng",
          description: "Long enough description here",
        })
      )._id,
    ).toBe("j1");
    await svc.updateJob("j1", { title: "Updated", description: "Long enough description here" });
    await svc.deleteJob("j1");
    await svc.submitJob("j1");
    await svc.approveJob("j1");
    await svc.closeJob("j1");
    expect(await svc.getJobRankings("j1")).toEqual([{ aiScore: 90 }]);
  });
});
