import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockRes } from "../../test/mocks.ts";

const service = vi.hoisted(() => ({
  createOffer: vi.fn(),
  listOffers: vi.fn(),
  getOffer: vi.fn(),
  sendOffer: vi.fn(),
  respondToOffer: vi.fn(),
}));

vi.mock("./offers.service.ts", () => service);

describe("offers.controller — create/send/respond", () => {
  beforeEach(() => vi.clearAllMocks());
  const next = vi.fn();
  const user = { id: "u1" };

  it("covers all handlers", async () => {
    service.createOffer.mockResolvedValue({ _id: "o1" });
    service.listOffers.mockResolvedValue([]);
    service.getOffer.mockResolvedValue({ _id: "o1" });
    service.sendOffer.mockResolvedValue({ _id: "o1", status: "sent" });
    service.respondToOffer.mockResolvedValue({ _id: "o1", status: "accepted" });
    const ctrl = await import("./offers.controller.ts");
    const res = mockRes();

    await ctrl.create(
      { user, body: { applicationId: "a1", salary: 140000 } } as never,
      res as never,
      next as never,
    );
    expect(res.statusCode).toBe(201);
    await ctrl.list({} as never, res as never, next as never);
    await ctrl.get({ params: { id: "o1" } } as never, res as never, next as never);
    await ctrl.send({ params: { id: "o1" } } as never, res as never, next as never);
    await ctrl.respond(
      { params: { id: "o1" }, body: { decision: "accepted" } } as never,
      res as never,
      next as never,
    );
    expect(service.respondToOffer).toHaveBeenCalledWith("o1", "accepted");
  });
});
