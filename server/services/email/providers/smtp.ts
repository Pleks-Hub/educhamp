import type { EmailPayload, EmailResult, EmailProvider } from "../types";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export class SmtpProvider implements EmailProvider {
  constructor(private config: SmtpConfig) {}

  private async createTransport() {
    const nodemailer = await import("nodemailer");
    return nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.username,
        pass: this.config.password,
      },
    });
  }

  async send(
    payload: EmailPayload,
    fromAddress: string,
    fromName: string
  ): Promise<EmailResult> {
    try {
      const transport = await this.createTransport();
      const from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;
      const info = await transport.sendMail({
        from,
        to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo,
      });
      return { success: true, messageId: info.messageId };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const transport = await this.createTransport();
      await transport.verify();
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
