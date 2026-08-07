import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockRes } from "../../test/mocks.ts";

const service = vi.hoisted(() => ({
  createInterview: vi.fn(),
  listInterviews: vi.fn(),
  getInterview: vi.fn(),
  scheduleInterview: vi.fn(),
  rescheduleInterview: vi.fn(),
  cancelInterview: vi.fn(),
  sendReminder: vi.fn(),
  generateQuestions: vi.fn(),
  saveScorecard: vi.fn(),
  summarizeNotes: vi.fn(),
}));

vi.mock("./interviews.service.ts", () => service);

describe("interviews.controller — schedule/questions/scorecard/reminder", () => {
  beforeEach(() => vi.clearAllMocks());
  const next = vi.fn();
  const user = { id: "u1" };

  it("covers all handlers", async () => {
    service.createInterview.mockResolvedValue({ _id: "i1" });
    service.listInterviews.mockResolvedValue([]);
    service.getInterview.mockResolvedValue({ _id: "i1" });
    service.scheduleInterview.mockResolvedValue({ _id: "i1", status: "scheduled" });
    service.rescheduleInterview.mockResolvedValue({ _id: "i1" });
    service.cancelInterview.mockResolvedValue({ _id: "i1", status: "cancelled" });
    service.sendReminder.mockResolvedValue({ messageId: "m1" });
    service.generateQuestions.mockResolvedValue({ questions: ["Q1"] });
    service.saveScorecard.mockResolvedValue({ status: "completed" });
    service.summarizeNotes.mockResolvedValue({ summary: "ok" });

    const ctrl = await import("./interviews.controller.ts");
    const res = mockRes();
    const params = { id: "i1" };

    await ctrl.create(
      { user, body: { applicationId: "a1" } } as never,
      res as never,
      next as never,
    );
    expect(res.statusCode).toBe(201);
    await ctrl.list({} as never, res as never, next as never);
    await ctrl.get({ params } as never, res as never, next as never);
    await ctrl.schedule(
      { params, body: { scheduledAt: new Date().toISOString(), durationMinutes: 30 } } as never,
      res as never,
      next as never,
    );
    await ctrl.reschedule(
      { params, body: { scheduledAt: new Date().toISOString() } } as never,
      res as never,
      next as never,
    );
    await ctrl.cancel({ params } as never, res as never, next as never);
    await ctrl.reminder({ params } as never, res as never, next as never);
    await ctrl.questions({ params } as never, res as never, next as never);
    await ctrl.scorecard(
      {
        user,
        params,
        body: {
          technical: 4,
          communication: 4,
          culture: 4,
          recommendation: "yes",
        },
      } as never,
      res as never,
      next as never,
    );
    await ctrl.notesSummary({ params } as never, res as never, next as never);
    expect(service.sendReminder).toHaveBeenCalledWith("i1");
  });
});
