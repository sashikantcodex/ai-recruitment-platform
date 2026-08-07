import { describe, expect, it } from "vitest";
import { StubEmailAdapter } from "./notify.port.ts";

describe("StubEmailAdapter", () => {
  it("records outbound emails", async () => {
    const email = new StubEmailAdapter();
    const result = await email.sendEmail({
      to: "candidate@example.com",
      subject: "Interview reminder",
      body: "Tomorrow at 10am",
    });
    expect(result.messageId).toMatch(/^msg_/);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toBe("candidate@example.com");
  });
});
