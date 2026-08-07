import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQuery } from "../../test/mocks.ts";

const Application = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
}));
const Job = vi.hoisted(() => ({ findById: vi.fn() }));
const Offer = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
}));
const OnboardingPacket = vi.hoisted(() => ({ create: vi.fn() }));
const ai = vi.hoisted(() => ({
  salaryBenchmark: vi.fn(),
}));
const integrations = vi.hoisted(() => ({
  esign: { sendEnvelope: vi.fn() },
  email: { sendEmail: vi.fn() },
}));

vi.mock("../applications/application.model.ts", () => ({ default: Application }));
vi.mock("../jobs/job.model.ts", () => ({ default: Job }));
vi.mock("./offer.model.ts", () => ({ default: Offer }));
vi.mock("../onboarding/onboarding.model.ts", () => ({ default: OnboardingPacket }));
vi.mock("../ai-clients/ai.client.ts", () => ai);
vi.mock("../../integrations/index.ts", () => ({ integrations }));

describe("offers.service — create / send / respond", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createOffer uses salary benchmark", async () => {
    Application.findById.mockReturnValue({
      populate: vi.fn().mockResolvedValue({
        _id: "a1",
        jobId: "j1",
        candidateId: "c1",
      }),
    });
    Job.findById.mockResolvedValue({ _id: "j1", title: "Senior Engineer" });
    ai.salaryBenchmark.mockResolvedValue({
      min: 100,
      mid: 130,
      max: 160,
      currency: "USD",
    });
    Offer.create.mockResolvedValue({ _id: "o1", salary: 130, status: "draft" });
    Application.findByIdAndUpdate.mockResolvedValue({});

    const { createOffer } = await import("./offers.service.ts");
    const offer = await createOffer({
      applicationId: "a1",
      createdBy: "507f1f77bcf86cd799439011",
    });
    expect(offer.status).toBe("draft");
  });

  it("listOffers / getOffer / sendOffer", async () => {
    Offer.find.mockReturnValue(mockQuery([{ _id: "o1" }]));
    const save = vi.fn().mockResolvedValue(undefined);
    Offer.findById.mockReturnValue(
      mockQuery({
        _id: "o1",
        salary: 130,
        currency: "USD",
        candidateId: { name: "Sam", email: "sam@example.com" },
        save,
      }),
    );
    integrations.esign.sendEnvelope.mockResolvedValue({
      envelopeId: "e1",
      signingUrl: "http://sign",
    });
    integrations.email.sendEmail.mockResolvedValue({ messageId: "m1" });

    const svc = await import("./offers.service.ts");
    expect(await svc.listOffers()).toHaveLength(1);
    const sent = await svc.sendOffer("o1");
    expect(sent.status).toBe("sent");
  });

  it("respondToOffer accepted creates onboarding", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    Offer.findById.mockReturnValue(
      mockQuery({
        _id: "o1",
        applicationId: "a1",
        candidateId: "c1",
        save,
      }),
    );
    Application.findByIdAndUpdate.mockResolvedValue({});
    OnboardingPacket.create.mockResolvedValue({ _id: "ob1" });

    const { respondToOffer } = await import("./offers.service.ts");
    const offer = await respondToOffer("o1", "accepted");
    expect(offer.status).toBe("accepted");
    expect(OnboardingPacket.create).toHaveBeenCalled();
  });

  it("respondToOffer declined", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    Offer.findById.mockReturnValue(
      mockQuery({
        _id: "o1",
        applicationId: "a1",
        candidateId: "c1",
        save,
      }),
    );
    Application.findByIdAndUpdate.mockResolvedValue({});
    const { respondToOffer } = await import("./offers.service.ts");
    const offer = await respondToOffer("o1", "declined");
    expect(offer.status).toBe("declined");
    expect(OnboardingPacket.create).not.toHaveBeenCalled();
  });
});
