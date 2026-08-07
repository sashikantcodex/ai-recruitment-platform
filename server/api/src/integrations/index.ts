/** Integration adapters — swap stubs for real providers without changing modules. */
import { StubCalendarAdapter } from "../calendar/calendar.port.ts";
import { StubDocuSignAdapter } from "../esign/esign.port.ts";
import { StubMeetingAdapter } from "../meeting/meeting.port.ts";
import { StubEmailAdapter } from "../notify/notify.port.ts";
import { createStorage } from "../storage/localDisk.storage.ts";

export const integrations = {
  storage: createStorage(),
  calendar: new StubCalendarAdapter(),
  meeting: new StubMeetingAdapter(),
  esign: new StubDocuSignAdapter(),
  email: new StubEmailAdapter(),
};
