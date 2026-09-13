import { Types } from "mongoose";
import { integrations } from "../../integrations/index.ts";
import { AppError } from "../../utils/App.Error.ts";
import {
  evaluateInterviewTranscript,
  generateInterviewQuestions,
  nextInterviewTurn,
  summarizeInterviewNotes,
} from "../ai-clients/ai.client.ts";
import Application from "../applications/application.model.ts";
import Job from "../jobs/job.model.ts";
import {
  currentQuestion,
  generateSessionToken,
  isSessionExpired,
  sessionExpiry,
  toFiveScale,
} from "./aiSession.ts";
import {
  buildInterviewTopic,
  computeEndTime,
} from "./interview.schedule.ts";
import Interview from "./interview.model.ts";

export async function createInterview(input: {
  applicationId: string;
  createdBy: string;
  panelists?: string[];
  mode?: "live" | "ai";
}) {
  const application = await Application.findById(input.applicationId);
  if (!application) throw new AppError("Application not found", 404, "NOT_FOUND");

  const interview = await Interview.create({
    applicationId: application._id,
    jobId: application.jobId,
    candidateId: application.candidateId,
    createdBy: input.createdBy,
    panelists: (input.panelists ?? []).map((id) => new Types.ObjectId(id)),
    mode: input.mode ?? "live",
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

// --- AI-conducted interview ---------------------------------------------

/**
 * Issue an AI interview link for this interview and email it to the candidate.
 * Re-inviting before the session starts reissues the same token.
 */
export async function inviteAiInterview(
  id: string,
  input: { maxQuestions?: number | undefined; validDays?: number | undefined } = {},
) {
  const interview = await getInterview(id);
  const job = await Job.findById(interview.jobId);
  if (!job) throw new AppError("Job not found", 404, "NOT_FOUND");

  if (interview.aiSession?.status === "completed") {
    throw new AppError(
      "This AI interview has already been completed",
      400,
      "AI_SESSION_COMPLETED",
    );
  }

  // Plan the questions up front so the session is reviewable before it runs.
  const questions =
    interview.questions?.length
      ? interview.questions
      : await generateInterviewQuestions({
          jdText: `${job.title}\n${job.description}`,
          skills: job.skills ?? [],
        });

  interview.mode = "ai";
  interview.questions = questions;
  interview.set("aiSession", {
    token: interview.aiSession?.token ?? generateSessionToken(),
    status: "not_started",
    maxQuestions: input.maxQuestions ?? interview.aiSession?.maxQuestions ?? 8,
    transcript: [],
    expiresAt: sessionExpiry(new Date(), input.validDays ?? 7),
  });
  await interview.save();

  const candidate = interview.candidateId as { name?: string; email?: string };
  await integrations.email.sendEmail({
    to: candidate?.email ?? "candidate@stub.local",
    subject: `AI interview for ${job.title}`,
    body:
      `Complete your AI interview at your convenience: ` +
      `/interview/${interview.aiSession?.token}\n` +
      `Expires ${interview.aiSession?.expiresAt?.toISOString()}.`,
  });

  return interview;
}

async function loadSessionByToken(token: string) {
  const interview = await Interview.findOne({ "aiSession.token": token });
  if (!interview || !interview.aiSession) {
    throw new AppError("Interview link is not valid", 404, "NOT_FOUND");
  }
  return interview;
}

/** Candidate-facing session state — no scores, no answer keys. */
export async function getAiSessionByToken(token: string) {
  const interview = await loadSessionByToken(token);
  const session = interview.aiSession!;

  if (isSessionExpired(session)) {
    if (session.status !== "expired" && session.status !== "completed") {
      session.status = "expired";
      await interview.save();
    }
    throw new AppError("This interview link has expired", 410, "SESSION_EXPIRED");
  }

  const job = await Job.findById(interview.jobId).select("title");
  return {
    token,
    status: session.status,
    jobTitle: job?.title ?? "",
    askedCount: session.transcript.length,
    maxQuestions: session.maxQuestions,
    currentQuestion: currentQuestion(session.transcript),
    transcript: session.transcript.map((t) => ({
      question: t.question,
      answer: t.answer,
    })),
  };
}

/** Start the session and hand back the first question. */
export async function startAiSession(token: string) {
  const interview = await loadSessionByToken(token);
  const session = interview.aiSession!;

  if (isSessionExpired(session)) {
    session.status = "expired";
    await interview.save();
    throw new AppError("This interview link has expired", 410, "SESSION_EXPIRED");
  }
  if (session.status === "completed") {
    throw new AppError("This interview is already complete", 400, "SESSION_COMPLETED");
  }

  if (session.status === "not_started") {
    session.status = "in_progress";
    session.startedAt = new Date();
  }

  // An unanswered question means the candidate reloaded — reissue it, don't skip it.
  if (!currentQuestion(session.transcript)) {
    const job = await Job.findById(interview.jobId);
    const turn = await nextInterviewTurn({
      jdText: `${job?.title ?? ""}\n${job?.description ?? ""}`,
      skills: job?.skills ?? [],
      plannedQuestions: interview.questions ?? [],
      transcript: session.transcript.map((t) => ({
        question: t.question,
        answer: t.answer ?? "",
      })),
      maxQuestions: session.maxQuestions ?? 8,
    });
    if (turn.question) {
      session.transcript.push({ question: turn.question, answer: "", askedAt: new Date() });
    }
  }

  await interview.save();
  return {
    token,
    status: session.status,
    question: currentQuestion(session.transcript),
    askedCount: session.transcript.length,
    maxQuestions: session.maxQuestions,
  };
}

/**
 * Record an answer and return the next question, or finish the session and
 * evaluate the transcript when the plan is exhausted.
 */
export async function answerAiSession(token: string, answer: string) {
  const interview = await loadSessionByToken(token);
  const session = interview.aiSession!;

  if (isSessionExpired(session)) {
    session.status = "expired";
    await interview.save();
    throw new AppError("This interview link has expired", 410, "SESSION_EXPIRED");
  }
  if (session.status !== "in_progress") {
    throw new AppError(
      `Interview is ${session.status}; start it before answering`,
      400,
      "SESSION_NOT_STARTED",
    );
  }

  const pending = session.transcript[session.transcript.length - 1];
  if (!pending || pending.answer) {
    throw new AppError("There is no open question to answer", 400, "NO_OPEN_QUESTION");
  }
  pending.answer = answer;
  pending.answeredAt = new Date();

  const job = await Job.findById(interview.jobId);
  const jdText = `${job?.title ?? ""}\n${job?.description ?? ""}`;
  const skills = job?.skills ?? [];

  const turn = await nextInterviewTurn({
    jdText,
    skills,
    plannedQuestions: interview.questions ?? [],
    transcript: session.transcript.map((t) => ({
      question: t.question,
      answer: t.answer ?? "",
    })),
    maxQuestions: session.maxQuestions ?? 8,
  });

  if (turn.question) {
    session.transcript.push({ question: turn.question, answer: "", askedAt: new Date() });
    await interview.save();
    return {
      token,
      status: session.status,
      question: turn.question,
      askedCount: session.transcript.length,
      maxQuestions: session.maxQuestions,
      isFinal: false,
    };
  }

  // Plan exhausted — evaluate and write the scorecard back onto the interview.
  const evaluation = await evaluateInterviewTranscript({
    jdText,
    skills,
    transcript: session.transcript.map((t) => ({
      question: t.question,
      answer: t.answer ?? "",
    })),
  });

  session.status = "completed";
  session.completedAt = new Date();
  interview.set("aiSession.evaluation", evaluation);
  interview.status = "completed";
  interview.scorecard = {
    technical: toFiveScale(evaluation.technical),
    communication: toFiveScale(evaluation.communication),
    culture: toFiveScale(evaluation.culture),
    notes: evaluation.summary,
    recommendation: evaluation.recommendation,
  };
  interview.notes = evaluation.summary;
  await interview.save();

  return {
    token,
    status: session.status,
    question: "",
    askedCount: session.transcript.length,
    maxQuestions: session.maxQuestions,
    isFinal: true,
  };
}

/** Recruiter-facing transcript and evaluation for an AI interview. */
export async function getAiSession(id: string) {
  const interview = await getInterview(id);
  if (!interview.aiSession?.token) {
    throw new AppError("No AI session on this interview", 404, "NO_AI_SESSION");
  }
  return {
    interviewId: interview._id,
    mode: interview.mode,
    status: interview.aiSession.status,
    transcript: interview.aiSession.transcript,
    evaluation: interview.aiSession.evaluation,
    token: interview.aiSession.token,
  };
}
