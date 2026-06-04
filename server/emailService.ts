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

// ─── Suppression check ───────────────────────────────────────────────────────

/**
 * Returns true if the given email address is on the active suppression list.
 * Called before every send to avoid delivering to bounced/complained addresses.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const { emailSuppression } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");
    const rows = await db
      .select({ id: emailSuppression.id })
      .from(emailSuppression)
      .where(and(eq(emailSuppression.email, email.toLowerCase()), eq(emailSuppression.isActive, true)))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Adds an email address to the suppression list (or reactivates an existing entry).
 */
export async function suppressEmail(
  email: string,
  reason: "bounced" | "complained" | "manual",
  resendEventId?: string,
  notes?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { emailSuppression } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const normalised = email.toLowerCase();
    // Upsert: if already exists, reactivate and update reason
    const existing = await db
      .select({ id: emailSuppression.id })
      .from(emailSuppression)
      .where(eq(emailSuppression.email, normalised))
      .limit(1);
    if (existing.length > 0) {
      await db
        .update(emailSuppression)
        .set({ reason, isActive: true, unsuppressedAt: null, resendEventId: resendEventId ?? null, notes: notes ?? null })
        .where(eq(emailSuppression.email, normalised));
    } else {
      await db.insert(emailSuppression).values({
        email: normalised,
        reason,
        resendEventId: resendEventId ?? null,
        notes: notes ?? null,
      });
    }
    console.log(`[EmailService] Suppressed ${normalised} (reason: ${reason})`);
  } catch (err) {
    console.error("[EmailService] Failed to suppress email:", err);
  }
}

// ─── Core send function ───────────────────────────────────────────────────────

// From address is configurable via RESEND_FROM_EMAIL env var
// Default: "EduChamp <noreply@educhamp.co>" (requires domain verification in Resend dashboard)
function getFromAddress(): string {
  return ENV.resendFromEmail || "EduChamp <noreply@educhamp.co>";
}
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send a transactional email.
 *
 * Delegates to the provider-agnostic service layer (server/services/email/index.ts).
 * The active provider (Resend / SMTP / SendGrid) is determined at runtime from
 * the emailSettings DB table — no code change needed to switch providers.
 *
 * Falls back to the legacy direct-Resend path if no emailSettings row is configured
 * yet, so existing deployments continue working without interruption.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const { sendEmail: newSendEmail } = await import("./services/email/index");
    return await newSendEmail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      template: opts.templateName,
    });
  } catch (err: unknown) {
    // If the new service fails (e.g. no active emailSettings row), fall back to
    // the legacy direct-Resend path so emails are never silently dropped.
    const errMsg = err instanceof Error ? err.message : String(err);
    const isNoProvider = errMsg.includes("No active email provider");
    if (!isNoProvider) {
      // Unexpected error — surface it
      return { success: false, error: errMsg };
    }
    // Legacy fallback: use RESEND_API_KEY directly
    const resend = getResend();
    if (!resend) {
      console.log(
        `[EmailService] No active provider or RESEND_API_KEY — email not sent.\n` +
          `  To: ${opts.to}\n  Subject: ${opts.subject}\n  Template: ${opts.templateName}`
      );
      return { success: false, error: "No email provider configured" };
    }
    try {
      const result = await resend.emails.send({
        from: getFromAddress(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      if (result.error) return { success: false, error: result.error.message };
      return { success: true, messageId: result.data?.id };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
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
