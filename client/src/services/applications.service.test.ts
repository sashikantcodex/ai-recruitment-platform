import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("./http.service", () => ({ http }));

describe("applications.service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("list / get / stage / apply", async () => {
    http.get
      .mockResolvedValueOnce({ data: [{ _id: "a1" }] })
      .mockResolvedValueOnce({ data: { _id: "a1" } });
    http.patch.mockResolvedValue({ data: { _id: "a1", stage: "interview" } });
    http.post.mockResolvedValue({ data: { _id: "a1", stage: "screened" } });

    const svc = await import("./applications.service");
    expect(await svc.listApplications("j1")).toHaveLength(1);
    expect((await svc.getApplication("a1"))._id).toBe("a1");
    expect((await svc.updateApplicationStage("a1", "interview")).stage).toBe("interview");

    const file = new File(["cv"], "cv.pdf", { type: "application/pdf" });
    const applied = await svc.applyWithResume({
      jobId: "j1",
      name: "Sam",
      email: "sam@example.com",
      resume: file,
    });
    expect(applied._id).toBe("a1");
    expect(http.post).toHaveBeenCalledWith("/applications", expect.any(FormData));
  });
});
