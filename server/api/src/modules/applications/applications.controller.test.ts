import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockRes } from "../../test/mocks.ts";

const services = vi.hoisted(() => ({
  applyWithResume: vi.fn(),
  listApplications: vi.fn(),
  getApplicationById: vi.fn(),
  updateApplicationStage: vi.fn(),
}));

vi.mock("./applications.service.ts", () => services);

describe("applications.controller — POST apply / GET / PATCH stage", () => {
  beforeEach(() => vi.clearAllMocks());
  const next = vi.fn();

  it("applyWithResume requires file", async () => {
    const { applyWithResume } = await import("./applications.controller.ts");
    const nextFn = vi.fn();
    await applyWithResume(
      { body: { jobId: "j1", name: "Sam", email: "s@e.com" } } as never,
      mockRes() as never,
      nextFn as never,
    );
    expect(nextFn.mock.calls[0]?.[0]).toMatchObject({ code: "RESUME_REQUIRED" });
  });

  it("applyWithResume / list / get / updateStage", async () => {
    services.applyWithResume.mockResolvedValue({ _id: "a1" });
    services.listApplications.mockResolvedValue([]);
    services.getApplicationById.mockResolvedValue({ _id: "a1" });
    services.updateApplicationStage.mockResolvedValue({ _id: "a1", stage: "interview" });
    const ctrl = await import("./applications.controller.ts");
    const res = mockRes();

    await ctrl.applyWithResume(
      {
        body: { jobId: "j1", name: "Sam", email: "sam@example.com" },
        file: { buffer: Buffer.from("x") },
      } as never,
      res as never,
      next as never,
    );
    expect(res.statusCode).toBe(201);

    await ctrl.listApplications(
      { query: { jobId: "j1" } } as never,
      res as never,
      next as never,
    );
    await ctrl.getApplication(
      { params: { applicationId: "a1" } } as never,
      res as never,
      next as never,
    );
    await ctrl.updateStage(
      { params: { applicationId: "a1" }, body: { stage: "interview" } } as never,
      res as never,
      next as never,
    );
    expect(services.updateApplicationStage).toHaveBeenCalledWith("a1", "interview");
  });
});
