/** E-signature port (DocuSign shaped). */
export type EnvelopeInput = {
  documentName: string;
  signerEmail: string;
  signerName: string;
  content: string;
};

export type EnvelopeResult = {
  provider: "docusign" | "stub";
  envelopeId: string;
  signingUrl: string;
  status: "sent" | "completed" | "declined";
};

export interface ESignPort {
  sendEnvelope(input: EnvelopeInput): Promise<EnvelopeResult>;
  getStatus(envelopeId: string): Promise<EnvelopeResult["status"]>;
}

export class StubDocuSignAdapter implements ESignPort {
  private statuses = new Map<string, EnvelopeResult["status"]>();

  async sendEnvelope(input: EnvelopeInput): Promise<EnvelopeResult> {
    const envelopeId = `env_${Date.now()}`;
    this.statuses.set(envelopeId, "sent");
    return {
      provider: "stub",
      envelopeId,
      signingUrl: `https://docusign.stub.local/sign/${envelopeId}?to=${encodeURIComponent(input.signerEmail)}`,
      status: "sent",
    };
  }

  async getStatus(envelopeId: string): Promise<EnvelopeResult["status"]> {
    return this.statuses.get(envelopeId) ?? "sent";
  }

  /** Test helper: mark envelope completed. */
  complete(envelopeId: string) {
    this.statuses.set(envelopeId, "completed");
  }
}
