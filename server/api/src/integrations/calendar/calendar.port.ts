/** Calendar integration port (Google / Outlook shaped). */
export type CalendarEventInput = {
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  attendees: string[];
};

export type CalendarEventResult = {
  provider: "google" | "outlook" | "stub";
  eventId: string;
  htmlLink: string;
};

export interface CalendarPort {
  createEvent(input: CalendarEventInput): Promise<CalendarEventResult>;
  updateEvent(eventId: string, input: CalendarEventInput): Promise<CalendarEventResult>;
  deleteEvent(eventId: string): Promise<void>;
}

export class StubCalendarAdapter implements CalendarPort {
  async createEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    const eventId = `cal_${Date.now()}`;
    return {
      provider: "stub",
      eventId,
      htmlLink: `https://calendar.stub.local/event/${eventId}?title=${encodeURIComponent(input.title)}`,
    };
  }

  async updateEvent(eventId: string, input: CalendarEventInput): Promise<CalendarEventResult> {
    return {
      provider: "stub",
      eventId,
      htmlLink: `https://calendar.stub.local/event/${eventId}?title=${encodeURIComponent(input.title)}`,
    };
  }

  async deleteEvent(_eventId: string): Promise<void> {
    return;
  }
}
