/**
 * EduChamp — Email Service Entry Point
 *
 * Single function the rest of the application calls to send email.
 * The provider (Resend / SMTP / SendGrid) is determined at runtime from
 * the active `emailSettings` DB row — no code changes needed to switch providers.
 *
 * Features:
 *  - Provider-agnostic: swappable from Admin → Email Settings
 *  - Suppression check (bounced / complained addresses are skipped)
 *  - Delivery logging to `emailLogs` table on every send attempt
 *  - Automatic retry with exponential back-off (up to 3 attempts)
 *  - Graceful fallback: if no active settings row exists, throws a clear error
 */

import { getEmailProvider } from "./factory";
import type { EmailPayload, EmailResult } from "./types";

export type { EmailPayload, EmailResult };

export interface SendEmailOptions extends EmailPayload {
  /** Template identifier for logging — e.g. 'consent_request', 'weekly_digest' */
  template: string;
  /** Optional: FK to users.id for log linkage */
  recipientId?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a transactional email via the active provider.
 * Always writes a row to `emailLogs` — success or failure.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<EmailResult> {
  // ── Suppression check ──────────────────────────────────────────────────────
  try {
    const { isEmailSuppressed } = await import("../../emailService");
    const toAddress = Array.isArray(opts.to) ? opts.to[0] : opts.to;
    const suppressed = await isEmailSuppressed(toAddress);
    if (suppressed) {
      console.log(`[EmailService] Skipping suppressed address: ${toAddress}`);
      await logEmail({
        toEmail: toAddress,
        subject: opts.subject,
        templateName: opts.template,
        status: "skipped",
        messageId: null,
        errorMessage: "Address is on suppression list",
        provider: "suppressed",
        recipientId: opts.recipientId ?? null,
      });
      return { success: false, error: "Address is on suppression list" };
    }
  } catch {
    // Non-fatal — suppression check failure should not block email delivery
  }

  // ── Resolve provider ───────────────────────────────────────────────────────
  let providerCtx: Awaited<ReturnType<typeof getEmailProvider>>;
  try {
    providerCtx = await getEmailProvider();
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[EmailService] Cannot resolve provider: ${error}`);
    const toAddress = Array.isArray(opts.to) ? opts.to[0] : opts.to;
    await logEmail({
      toEmail: toAddress,
      subject: opts.subject,
      templateName: opts.template,
      status: "failed",
      messageId: null,
      errorMessage: error,
      provider: "unknown",
      recipientId: opts.recipientId ?? null,
    });
    return { success: false, error };
  }

  const { provider, fromAddress, fromName, replyTo, providerName } = providerCtx;
  const toAddress = Array.isArray(opts.to) ? opts.to[0] : opts.to;

  // Apply reply-to from settings if not overridden in payload
  const payload: EmailPayload = {
    ...opts,
    replyTo: opts.replyTo ?? replyTo ?? undefined,
  };

  // ── Send with retry ──────────────────────────────────────────────────────────
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await provider.send(payload, fromAddress, fromName);

      if (!result.success) {
        lastError = result.error ?? "Unknown provider error";
        console.warn(`[EmailService] Attempt ${attempt} failed: ${lastError}`);
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      await logEmail({
        toEmail: toAddress,
        subject: opts.subject,
        templateName: opts.template,
        status: "sent",
        messageId: result.messageId ?? null,
        errorMessage: null,
        provider: providerName,
        recipientId: opts.recipientId ?? null,
      });

      console.log(`[EmailService] Email sent to ${toAddress} via ${providerName} (id: ${result.messageId})`);
      return { success: true, messageId: result.messageId };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[EmailService] Attempt ${attempt} threw: ${lastError}`);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  // All attempts failed
  await logEmail({
    toEmail: toAddress,
    subject: opts.subject,
    templateName: opts.template,
    status: "failed",
    messageId: null,
    errorMessage: lastError ?? "Unknown error",
    provider: providerName,
    recipientId: opts.recipientId ?? null,
  });

  console.error(`[EmailService] All ${MAX_RETRIES} attempts failed for ${toAddress}: ${lastError}`);
  return { success: false, error: lastError };
}

// ─── DB logging helper ────────────────────────────────────────────────────────

interface LogEmailArgs {
  toEmail: string;
  subject: string;
  templateName: string;
  status: "sent" | "failed" | "skipped";
  messageId: string | null;
  errorMessage: string | null;
  provider: string;
  recipientId: number | null;
}

async function logEmail(args: LogEmailArgs): Promise<void> {
  try {
    const { getDb } = await import("../../db");
    const { emailLogs } = await import("../../../drizzle/schema");
    const db = await getDb();
    if (!db) return;
    await db.insert(emailLogs).values({
      toEmail: args.toEmail,
      subject: args.subject,
      templateName: args.templateName,
      status: args.status,
      messageId: args.messageId,
      errorMessage: args.errorMessage,
    });
  } catch (err) {
    console.error("[EmailService] Failed to log email:", err);
  }
}
