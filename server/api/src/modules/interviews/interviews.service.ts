import { Types } from "mongoose";
import { integrations } from "../../integrations/index.ts";
import { AppError } from "../../utils/App.Error.ts";
import {
  generateInterviewQuestions,
  summarizeInterviewNotes,
} from "../ai-clients/ai.client.ts";
import Application from "../applications/application.model.ts";
import Job from "../jobs/job.model.ts";
import {
  buildInterviewTopic,
  computeEndTime,
} from "./interview.schedule.ts";
import Interview from "./interview.model.ts";

export async function createInterview(input: {
  applicationId: string;
  createdBy: string;
  panelists?: string[];
}) {
  const application = await Application.findById(input.applicationId);
  if (!application) throw new AppError("Application not found", 404, "NOT_FOUND");

  const interview = await Interview.create({
    applicationId: application._id,
    jobId: application.jobId,
    candidateId: application.candidateId,
    createdBy: input.createdBy,
    panelists: (input.panelists ?? []).map((id) => new Types.ObjectId(id)),
    status: "draft",
  });

  await Application.findByIdAndUpdate(application._id, { stage: "interview" });
  return interview;
}

export async function listInterviews() {
  return Interview.find()
    .populate("candidateId", "name email")
    .populate("jobId", "title")
    .populate("applicationId")
    .sort({ scheduledAt: -1, createdAt: -1 });
}

export async function getInterview(id: string) {
  const interview = await Interview.findById(id)
    .populate("candidateId", "name email")
    .populate("jobId", "title description skills")
    .populate("panelists", "name email");
  if (!interview) throw new AppError("Interview not found", 404, "NOT_FOUND");
  return interview;
}

export async function scheduleInterview(input: {
  id: string;
  scheduledAt: string;
  durationMinutes?: number;
}) {
  const interview = await getInterview(input.id);
  const startsAt = new Date(input.scheduledAt);
  const duration = input.durationMinutes ?? 60;
  const endsAt = computeEndTime(startsAt, duration);

  const job = await Job.findById(interview.jobId);
  const topic = buildInterviewTopic(job?.title);

  const calendar = await integrations.calendar.createEvent({
    title: topic,
    description: "ATS scheduled interview",
    startsAt,
    endsAt,
    attendees: [],
  });

  const meeting = await integrations.meeting.createMeeting({
    topic,
    startsAt,
    durationMinutes: duration,
  });

  interview.scheduledAt = startsAt;
  interview.durationMinutes = duration;
  interview.status = "scheduled";
  interview.calendarEventId = calendar.eventId;
  interview.calendarLink = calendar.htmlLink;
  interview.meetingId = meeting.meetingId;
  interview.meetingUrl = meeting.joinUrl;
  await interview.save();

  await integrations.email.sendEmail({
    to: "candidate@stub.local",
    subject: `Interview scheduled: ${topic}`,
    body: `Join: ${meeting.joinUrl}\nCalendar: ${calendar.htmlLink}`,
  });

  return interview;
}

export async function rescheduleInterview(input: {
  id: string;
  scheduledAt: string;
  durationMinutes?: number;
}) {
  const interview = await getInterview(input.id);
  if (!interview.calendarEventId) {
    return scheduleInterview(input);
  }

  const startsAt = new Date(input.scheduledAt);
  const duration = input.durationMinutes ?? interview.durationMinutes ?? 60;
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);
  const topic = "Rescheduled interview";

  await integrations.calendar.updateEvent(interview.calendarEventId, {
    title: topic,
    startsAt,
    endsAt,
    attendees: [],
  });

  interview.scheduledAt = startsAt;
  interview.durationMinutes = duration;
  interview.status = "scheduled";
  await interview.save();

  await integrations.email.sendEmail({
    to: "candidate@stub.local",
    subject: "Interview rescheduled",
    body: `New time: ${startsAt.toISOString()}`,
  });

  return interview;
}

export async function cancelInterview(id: string) {
  const interview = await getInterview(id);
  if (interview.calendarEventId) {
    await integrations.calendar.deleteEvent(interview.calendarEventId);
  }
  if (interview.meetingId) {
    await integrations.meeting.cancelMeeting(interview.meetingId);
  }
  interview.status = "cancelled";
  await interview.save();
  return interview;
}

export async function sendReminder(id: string) {
  const interview = await getInterview(id);
  const result = await integrations.email.sendEmail({
    to: "candidate@stub.local",
    subject: "Interview reminder",
    body: `Reminder for interview at ${interview.scheduledAt?.toISOString() ?? "TBD"}. Join: ${interview.meetingUrl ?? "N/A"}`,
  });
  return { interview, messageId: result.messageId };
}

export async function generateQuestions(id: string) {
  const interview = await getInterview(id);
  const job = await Job.findById(interview.jobId);
  if (!job) throw new AppError("Job not found", 404, "NOT_FOUND");

  const questions = await generateInterviewQuestions({
    jdText: `${job.title}\n${job.description}`,
    skills: job.skills ?? [],
  });

  interview.questions = questions;
  await interview.save();
  return interview;
}

export async function saveScorecard(
  id: string,
  scorecard: {
    technical: number;
    communication: number;
    culture: number;
    notes?: string;
    recommendation: "strong_yes" | "yes" | "no" | "strong_no";
  },
  userId: string,
) {
  const interview = await getInterview(id);
  interview.scorecard = { ...scorecard, scoredBy: new Types.ObjectId(userId) };
  interview.status = "completed";
  if (scorecard.notes) interview.notes = scorecard.notes;
  await interview.save();
  return interview;
}

export async function summarizeNotes(id: string) {
  const interview = await getInterview(id);
  const summary = await summarizeInterviewNotes({
    notes: interview.notes ?? interview.scorecard?.notes ?? "",
    questions: interview.questions ?? [],
  });
  return { summary, interviewId: id };
}
