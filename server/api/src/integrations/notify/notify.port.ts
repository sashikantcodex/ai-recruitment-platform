/** Notification / email port. */
export type EmailInput = {
  to: string;
  subject: string;
  body: string;
};

export interface NotifierPort {
  sendEmail(input: EmailInput): Promise<{ messageId: string }>;
}

export class StubEmailAdapter implements NotifierPort {
  readonly sent: EmailInput[] = [];

  async sendEmail(input: EmailInput): Promise<{ messageId: string }> {
    this.sent.push(input);
    return { messageId: `msg_${Date.now()}` };
  }
}
