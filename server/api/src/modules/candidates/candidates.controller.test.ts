import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQuery, mockRes } from "../../test/mocks.ts";

const Candidate = vi.hoisted(() => ({
  find: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
}));
const Resume = vi.hoisted(() => ({
  find: vi.fn(),
}));

vi.mock("./candidate.model.ts", () => ({ default: Candidate }));
vi.mock("../resumes/resume.model.ts", () => ({ default: Resume }));

describe("candidates.controller — GET list/get + PUT update", () => {
  beforeEach(() => vi.clearAllMocks());
  const next = vi.fn();

  it("list / get / update", async () => {
    Candidate.find.mockReturnValue(mockQuery([{ _id: "c1", name: "Sam" }]));
    Candidate.findById.mockResolvedValue({ _id: "c1", name: "Sam" });
    Resume.find.mockReturnValue(mockQuery([]));
    Candidate.findByIdAndUpdate.mockResolvedValue({ _id: "c1", name: "Samantha" });
    const ctrl = await import("./candidates.controller.ts");
    const res = mockRes();

    await ctrl.listCandidates({} as never, res as never, next as never);
    expect(res.body).toHaveLength(1);

    await ctrl.getCandidate({ params: { id: "c1" } } as never, res as never, next as never);
    expect(res.body).toMatchObject({ candidate: { name: "Sam" }, resumes: [] });

    await ctrl.updateCandidate(
      { params: { id: "c1" }, body: { name: "Samantha" } } as never,
      res as never,
      next as never,
    );
    expect(res.body).toMatchObject({ name: "Samantha" });
  });
});
