import type { EmailPayload, EmailResult, EmailProvider } from "../types";

export class ResendProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async send(
    payload: EmailPayload,
    fromAddress: string,
    fromName: string
  ): Promise<EmailResult> {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(this.apiKey);
      const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
      const result = await resend.emails.send({
        from,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo,
        tags: payload.tags
          ? Object.entries(payload.tags).map(([name, value]) => ({ name, value }))
          : undefined,
      });
      if (result.error) {
        return { success: false, error: result.error.message ?? "Unknown Resend error" };
      }
      return { success: true, messageId: result.data?.id };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(this.apiKey);
      const result = await resend.domains.list();
      if (result.error) {
        return { ok: false, error: result.error.message ?? "Invalid API key" };
      }
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
