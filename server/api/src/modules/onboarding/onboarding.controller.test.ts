import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQuery, mockRes } from "../../test/mocks.ts";

const OnboardingPacket = vi.hoisted(() => ({
  find: vi.fn(),
  findById: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  upload: vi.fn(),
}));

vi.mock("./onboarding.model.ts", () => ({ default: OnboardingPacket }));
vi.mock("../../integrations/index.ts", () => ({
  integrations: { storage },
}));

describe("onboarding.controller — list / checklist / verify / upload", () => {
  beforeEach(() => vi.clearAllMocks());
  const next = vi.fn();

  it("list packets", async () => {
    OnboardingPacket.find.mockReturnValue(mockQuery([{ _id: "ob1" }]));
    const { list } = await import("./onboarding.controller.ts");
    const res = mockRes();
    await list({} as never, res as never, next as never);
    expect(res.body).toHaveLength(1);
  });

  it("toggleChecklist marks completed when all done", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    OnboardingPacket.findById.mockResolvedValue({
      checklist: [{ item: "A", done: false }],
      status: "in_progress",
      save,
    });
    const { toggleChecklist } = await import("./onboarding.controller.ts");
    const res = mockRes();
    await toggleChecklist(
      { params: { id: "ob1" }, body: { index: 0, done: true } } as never,
      res as never,
      next as never,
    );
    expect(res.body).toMatchObject({ status: "completed" });
  });

  it("verifyDocument updates status", async () => {
    const doc = { status: "uploaded", notes: undefined as string | undefined };
    const save = vi.fn().mockResolvedValue(undefined);
    OnboardingPacket.findById.mockResolvedValue({
      documents: { id: vi.fn().mockReturnValue(doc) },
      save,
    });
    const { verifyDocument } = await import("./onboarding.controller.ts");
    const res = mockRes();
    await verifyDocument(
      {
        params: { id: "ob1" },
        body: { documentId: "d1", status: "verified" },
      } as never,
      res as never,
      next as never,
    );
    expect(doc.status).toBe("verified");
  });

  it("uploadDocument stores file", async () => {
    const doc = { status: "requested", fileKey: undefined as string | undefined };
    const save = vi.fn().mockResolvedValue(undefined);
    OnboardingPacket.findById.mockResolvedValue({
      documents: { id: vi.fn().mockReturnValue(doc) },
      save,
    });
    storage.upload.mockResolvedValue({ key: "onboarding/x.pdf", path: "/tmp/x" });
    const { uploadDocument } = await import("./onboarding.controller.ts");
    const res = mockRes();
    await uploadDocument(
      {
        params: { id: "ob1" },
        body: { documentId: "d1" },
        file: {
          buffer: Buffer.from("x"),
          originalname: "id.pdf",
          mimetype: "application/pdf",
        },
      } as never,
      res as never,
      next as never,
    );
    expect(doc.status).toBe("uploaded");
    expect(doc.fileKey).toBe("onboarding/x.pdf");
  });
});
