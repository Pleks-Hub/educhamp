/**
 * EduChamp — Transactional Email Service
 *
 * Uses the Resend SDK for reliable email delivery.
 * Falls back gracefully to console logging when no API key is configured
 * (useful for local development and testing).
 *
 * Features:
 *  - HTML + plain-text dual-format emails
 *  - Automatic retry with exponential back-off (up to 3 attempts)
 *  - Delivery logging to the emailLogs DB table
 *  - Bounce / failure capture via Resend error responses
 */

import { Resend } from "resend";
import { ENV } from "./_core/env";
import { getDb } from "./db";

// ─── Resend client (lazy-initialised) ─────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!ENV.resendApiKey) return null;
  if (!_resend) _resend = new Resend(ENV.resendApiKey);
  return _resend;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  templateName: string;
  /** Optional: reference ID (e.g. invite token) for audit trail */
  referenceId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Core send function ───────────────────────────────────────────────────────

const FROM_ADDRESS = "EduChamp <noreply@educhamp.app>";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a transactional email with automatic retry and DB logging.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResend();

  // ── No API key → dev/test fallback ──────────────────────────────────────────
  if (!resend) {
    console.log(
      `[EmailService] No RESEND_API_KEY — email not sent.\n` +
        `  To: ${opts.to}\n` +
        `  Subject: ${opts.subject}\n` +
        `  Template: ${opts.templateName}`
    );
    await logEmail({
      toEmail: opts.to,
      subject: opts.subject,
      templateName: opts.templateName,
      status: "skipped",
      messageId: null,
      errorMessage: "No RESEND_API_KEY configured",
    });
    return { success: false, error: "No RESEND_API_KEY configured" };
  }

  // ── Send with retry ──────────────────────────────────────────────────────────
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await resend.emails.send({
        from: FROM_ADDRESS,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });

      if (result.error) {
        lastError = result.error.message ?? "Unknown Resend error";
        console.warn(`[EmailService] Attempt ${attempt} failed: ${lastError}`);
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      const messageId = result.data?.id ?? undefined;

      await logEmail({
        toEmail: opts.to,
        subject: opts.subject,
        templateName: opts.templateName,
        status: "sent",
        messageId: messageId ?? null,
        errorMessage: null,
      });

      console.log(`[EmailService] Email sent to ${opts.to} (id: ${messageId})`);
      return { success: true, messageId };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(`[EmailService] Attempt ${attempt} threw: ${lastError}`);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  // All attempts failed
  await logEmail({
    toEmail: opts.to,
    subject: opts.subject,
    templateName: opts.templateName,
    status: "failed",
    messageId: null,
    errorMessage: lastError ?? "Unknown error",
  });

  console.error(`[EmailService] All ${MAX_RETRIES} attempts failed for ${opts.to}: ${lastError}`);
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
}

async function logEmail(args: LogEmailArgs): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { emailLogs } = await import("../drizzle/schema");
    await db.insert(emailLogs).values({
      toEmail: args.toEmail,
      subject: args.subject,
      templateName: args.templateName,
      status: args.status,
      messageId: args.messageId,
      errorMessage: args.errorMessage,
    });
  } catch (err) {
    // Non-fatal — don't let logging failures break email delivery
    console.error("[EmailService] Failed to log email:", err);
  }
}

// ─── Validate API key (used in tests) ────────────────────────────────────────

export async function validateResendKey(): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    // Resend doesn't have a ping endpoint; list domains as a lightweight check
    const result = await resend.domains.list();
    return !result.error;
  } catch {
    return false;
  }
}
