import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockQuery } from "../../test/mocks.ts";

const Application = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
}));
const Job = vi.hoisted(() => ({ findById: vi.fn() }));
const Interview = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findById: vi.fn(),
}));
const ai = vi.hoisted(() => ({
  generateInterviewQuestions: vi.fn(),
  summarizeInterviewNotes: vi.fn(),
}));
const integrations = vi.hoisted(() => ({
  calendar: {
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  },
  meeting: {
    createMeeting: vi.fn(),
    cancelMeeting: vi.fn(),
  },
  email: { sendEmail: vi.fn() },
}));

vi.mock("../applications/application.model.ts", () => ({ default: Application }));
vi.mock("../jobs/job.model.ts", () => ({ default: Job }));
vi.mock("./interview.model.ts", () => ({ default: Interview }));
vi.mock("../ai-clients/ai.client.ts", () => ai);
vi.mock("../../integrations/index.ts", () => ({ integrations }));

function interviewDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: "i1",
    jobId: "j1",
    status: "draft",
    questions: [] as string[],
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("interviews.service — create/schedule/questions/scorecard/reminder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createInterview", async () => {
    Application.findById.mockResolvedValue({
      _id: "a1",
      jobId: "j1",
      candidateId: "c1",
    });
    Interview.create.mockResolvedValue({ _id: "i1", status: "draft" });
    Application.findByIdAndUpdate.mockResolvedValue({});
    const { createInterview } = await import("./interviews.service.ts");
    const interview = await createInterview({
      applicationId: "a1",
      createdBy: "507f1f77bcf86cd799439011",
    });
    expect(interview.status).toBe("draft");
  });

  it("listInterviews / getInterview", async () => {
    Interview.find.mockReturnValue(mockQuery([{ _id: "i1" }]));
    Interview.findById.mockReturnValue(mockQuery(interviewDoc()));
    const svc = await import("./interviews.service.ts");
    expect(await svc.listInterviews()).toHaveLength(1);
    expect((await svc.getInterview("i1"))._id).toBe("i1");
  });

  it("scheduleInterview + reminder", async () => {
    const doc = interviewDoc();
    Interview.findById.mockReturnValue(mockQuery(doc));
    Job.findById.mockResolvedValue({ title: "Engineer" });
    integrations.calendar.createEvent.mockResolvedValue({
      eventId: "cal1",
      htmlLink: "http://cal",
    });
    integrations.meeting.createMeeting.mockResolvedValue({
      meetingId: "m1",
      joinUrl: "http://meet",
    });
    integrations.email.sendEmail.mockResolvedValue({ messageId: "msg1" });

    const svc = await import("./interviews.service.ts");
    const scheduled = await svc.scheduleInterview({
      id: "i1",
      scheduledAt: new Date().toISOString(),
      durationMinutes: 45,
    });
    expect(scheduled.status).toBe("scheduled");

    Interview.findById.mockReturnValue(
      mockQuery(interviewDoc({ scheduledAt: new Date(), meetingUrl: "http://meet" })),
    );
    const reminder = await svc.sendReminder("i1");
    expect(reminder.messageId).toBe("msg1");
  });

  it("generateQuestions + saveScorecard", async () => {
    const doc = interviewDoc();
    Interview.findById.mockReturnValue(mockQuery(doc));
    Job.findById.mockResolvedValue({
      title: "Eng",
      description: "Build",
      skills: ["React"],
    });
    ai.generateInterviewQuestions.mockResolvedValue(["Q1", "Q2"]);
    const svc = await import("./interviews.service.ts");
    const withQs = await svc.generateQuestions("i1");
    expect(withQs.questions).toEqual(["Q1", "Q2"]);

    Interview.findById.mockReturnValue(mockQuery(interviewDoc()));
    const scored = await svc.saveScorecard(
      "i1",
      {
        technical: 4,
        communication: 5,
        culture: 4,
        recommendation: "yes",
        notes: "Solid",
      },
      "507f1f77bcf86cd799439011",
    );
    expect(scored.status).toBe("completed");
  });

  it("rescheduleInterview / cancelInterview / summarizeNotes", async () => {
    const doc = interviewDoc({
      calendarEventId: "cal1",
      meetingId: "m1",
      durationMinutes: 60,
      notes: "Good",
      questions: ["Q1"],
    });
    Interview.findById.mockReturnValue(mockQuery(doc));
    integrations.calendar.updateEvent.mockResolvedValue({});
    integrations.email.sendEmail.mockResolvedValue({ messageId: "m2" });
    integrations.calendar.deleteEvent.mockResolvedValue({});
    integrations.meeting.cancelMeeting.mockResolvedValue({});
    ai.summarizeInterviewNotes.mockResolvedValue("Summary text");

    const svc = await import("./interviews.service.ts");
    const rescheduled = await svc.rescheduleInterview({
      id: "i1",
      scheduledAt: new Date().toISOString(),
    });
    expect(rescheduled.status).toBe("scheduled");

    Interview.findById.mockReturnValue(mockQuery(interviewDoc({ calendarEventId: "cal1", meetingId: "m1" })));
    const cancelled = await svc.cancelInterview("i1");
    expect(cancelled.status).toBe("cancelled");

    Interview.findById.mockReturnValue(
      mockQuery(interviewDoc({ notes: "Good", questions: ["Q1"] })),
    );
    const summary = await svc.summarizeNotes("i1");
    expect(summary.summary).toBe("Summary text");
  });
});
