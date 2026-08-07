/** Meeting provider port (Zoom / Teams shaped). */
export type MeetingInput = {
  topic: string;
  startsAt: Date;
  durationMinutes: number;
};

export type MeetingResult = {
  provider: "zoom" | "teams" | "stub";
  meetingId: string;
  joinUrl: string;
  hostUrl: string;
};

export interface MeetingPort {
  createMeeting(input: MeetingInput): Promise<MeetingResult>;
  cancelMeeting(meetingId: string): Promise<void>;
}

export class StubMeetingAdapter implements MeetingPort {
  async createMeeting(input: MeetingInput): Promise<MeetingResult> {
    const meetingId = `mtg_${Date.now()}`;
    return {
      provider: "stub",
      meetingId,
      joinUrl: `https://meet.stub.local/j/${meetingId}?topic=${encodeURIComponent(input.topic)}`,
      hostUrl: `https://meet.stub.local/host/${meetingId}`,
    };
  }

  async cancelMeeting(_meetingId: string): Promise<void> {
    return;
  }
}
