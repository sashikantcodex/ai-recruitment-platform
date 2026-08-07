import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQuery } from "../../test/mocks.ts";

const Job = vi.hoisted(() => ({ findById: vi.fn() }));
const Candidate = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn(),
  findByIdAndUpdate: vi.fn(),
}));
const Resume = vi.hoisted(() => ({
  create: vi.fn(),
  findByIdAndUpdate: vi.fn(),
}));
const Application = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
}));

const ai = vi.hoisted(() => ({
  parseResume: vi.fn(),
  scoreCandidate: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  upload: vi.fn(),
}));

vi.mock("../jobs/job.model.ts", () => ({ default: Job }));
vi.mock("../candidates/candidate.model.ts", () => ({ default: Candidate }));
vi.mock("../resumes/resume.model.ts", () => ({ default: Resume }));
vi.mock("./application.model.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./application.model.ts")>();
  return {
    ...actual,
    default: Application,
  };
});
vi.mock("../ai-clients/ai.client.ts", () => ai);
vi.mock("../../integrations/index.ts", () => ({
  integrations: { storage },
}));

describe("applications.service — apply / list / stage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("applyWithResume creates application with AI score", async () => {
    Job.findById.mockResolvedValue({
      _id: "j1",
      description: "React engineer needed",
    });
    Candidate.findOne.mockResolvedValue(null);
    Candidate.create.mockResolvedValue({ _id: "c1" });
    storage.upload.mockResolvedValue({ path: "/tmp/r.pdf", key: "resumes/r.pdf" });
    Resume.create.mockResolvedValue({ _id: "r1" });
    Resume.findByIdAndUpdate.mockResolvedValue({});
    Candidate.findByIdAndUpdate.mockResolvedValue({});
    ai.parseResume.mockResolvedValue({ skills: ["React"], summary: "Good" });
    ai.scoreCandidate.mockResolvedValue({
      score: 88,
      matchedSkills: ["React"],
      missingSkills: [],
      rationale: "Strong match",
    });
    Application.create.mockResolvedValue({ _id: "a1" });
    Application.findById.mockReturnValue(mockQuery({ _id: "a1", stage: "screened" }));

    const { applyWithResume } = await import("./applications.service.ts");
    const app = await applyWithResume({
      jobId: "j1",
      name: "Sam",
      email: "sam@example.com",
      file: {
        buffer: Buffer.from("pdf"),
        originalname: "cv.pdf",
        mimetype: "application/pdf",
      } as Express.Multer.File,
    });
    expect(app?.stage).toBe("screened");
  });

  it("listApplications and getApplicationById", async () => {
    Application.find.mockReturnValue(mockQuery([{ _id: "a1" }]));
    Application.findById.mockReturnValue(mockQuery({ _id: "a1" }));
    const svc = await import("./applications.service.ts");
    expect(await svc.listApplications("j1")).toHaveLength(1);
    expect((await svc.getApplicationById("a1"))._id).toBe("a1");
  });

  it("updateApplicationStage validates transitions", async () => {
    Application.findById.mockResolvedValue({ _id: "a1", stage: "applied" });
    Application.findByIdAndUpdate.mockReturnValue(
      mockQuery({ _id: "a1", stage: "screened" }),
    );
    const { updateApplicationStage } = await import("./applications.service.ts");
    const updated = await updateApplicationStage("a1", "screened");
    expect(updated.stage).toBe("screened");
  });

  it("updateApplicationStage rejects invalid transition", async () => {
    Application.findById.mockResolvedValue({ _id: "a1", stage: "applied" });
    const { updateApplicationStage } = await import("./applications.service.ts");
    await expect(updateApplicationStage("a1", "hired")).rejects.toMatchObject({
      code: "INVALID_STAGE_TRANSITION",
    });
  });
});
