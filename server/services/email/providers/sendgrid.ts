import type { EmailPayload, EmailResult, EmailProvider } from "../types";

export class SendGridProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async send(
    payload: EmailPayload,
    fromAddress: string,
    fromName: string
  ): Promise<EmailResult> {
    try {
      const toAddresses = Array.isArray(payload.to) ? payload.to : [payload.to];
      const body = {
        personalizations: [{ to: toAddresses.map((email) => ({ email })) }],
        from: { email: fromAddress, name: fromName || undefined },
        reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
        subject: payload.subject,
        content: [
          ...(payload.html ? [{ type: "text/html", value: payload.html }] : []),
          ...(payload.text ? [{ type: "text/plain", value: payload.text }] : []),
        ],
        custom_args: payload.tags,
      };

      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return { success: false, error: `SendGrid error ${response.status}: ${errorText}` };
      }

      // SendGrid returns 202 Accepted with X-Message-Id header
      const messageId = response.headers.get("X-Message-Id") ?? undefined;
      return { success: true, messageId };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      // Use the enforced TLS endpoint as a lightweight key validation check
      const response = await fetch(
        "https://api.sendgrid.com/v3/mail/settings/enforced_tls",
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { errors?: Array<{ message: string }> };
        const msg = body.errors?.[0]?.message ?? `HTTP ${response.status}`;
        return { ok: false, error: msg };
      }
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
