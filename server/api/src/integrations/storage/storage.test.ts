import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { LocalDiskStorage } from "./localDisk.storage.ts";
import { StubDocuSignAdapter } from "../esign/esign.port.ts";
import { StubCalendarAdapter } from "../calendar/calendar.port.ts";
import { StubMeetingAdapter } from "../meeting/meeting.port.ts";

describe("LocalDiskStorage", () => {
  it("uploads and deletes files", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ats-storage-"));
    const storage = new LocalDiskStorage(root);
    const uploaded = await storage.upload({
      buffer: Buffer.from("hello resume"),
      originalName: "resume.txt",
      mimeType: "text/plain",
      folder: "resumes",
    });
    expect(fs.existsSync(uploaded.path)).toBe(true);
    await storage.delete(uploaded.key);
    expect(fs.existsSync(uploaded.path)).toBe(false);
  });
});

describe("integration stubs", () => {
  it("creates calendar + meeting stubs", async () => {
    const calendar = new StubCalendarAdapter();
    const meeting = new StubMeetingAdapter();
    const startsAt = new Date();
    const cal = await calendar.createEvent({
      title: "Interview",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 3600000),
      attendees: [],
    });
    const mtg = await meeting.createMeeting({
      topic: "Interview",
      startsAt,
      durationMinutes: 60,
    });
    expect(cal.eventId).toMatch(/^cal_/);
    expect(mtg.joinUrl).toContain("meet.stub.local");
  });

  it("sends DocuSign stub envelopes", async () => {
    const esign = new StubDocuSignAdapter();
    const env = await esign.sendEnvelope({
      documentName: "offer.pdf",
      signerEmail: "a@b.com",
      signerName: "A",
      content: "offer",
    });
    expect(env.status).toBe("sent");
    esign.complete(env.envelopeId);
    expect(await esign.getStatus(env.envelopeId)).toBe("completed");
  });
});
