import type { EmailProvider } from "./types";
import { decryptSecret, isEncrypted } from "./crypto";

/**
 * Reads the active emailSettings row from the DB and returns the appropriate provider instance.
 *
 * Fall-back chain (in order):
 *  1. Active emailSettings row in the database (admin-configured)
 *  2. RESEND_API_KEY + RESEND_FROM_EMAIL environment variables (Manus built-in default)
 *
 * This ensures emails are always delivered using the Manus built-in Resend credentials
 * even when no admin has explicitly configured a provider row yet.
 */
export async function getEmailProvider(): Promise<{
  provider: EmailProvider;
  fromAddress: string;
  fromName: string;
  replyTo: string | null;
  settingsId: number;
  providerName: string;
}> {
  const { getDb } = await import("../../db");
  const { emailSettings } = await import("../../../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const db = await getDb();

  if (db) {
    const [settings] = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.isActive, true))
      .limit(1);

    if (settings) {
      // Decrypt the API key / SMTP password
      const rawKey = isEncrypted(settings.apiKey)
        ? decryptSecret(settings.apiKey)
        : settings.apiKey; // legacy plain-text fallback

      let provider: EmailProvider;

      switch (settings.provider) {
        case "resend": {
          const { ResendProvider } = await import("./providers/resend");
          provider = new ResendProvider(rawKey);
          break;
        }
        case "smtp": {
          const { SmtpProvider } = await import("./providers/smtp");
          provider = new SmtpProvider({
            host: settings.smtpHost!,
            port: settings.smtpPort!,
            secure: settings.smtpSecure ?? false,
            username: settings.smtpUsername!,
            password: rawKey,
          });
          break;
        }
        case "sendgrid": {
          const { SendGridProvider } = await import("./providers/sendgrid");
          provider = new SendGridProvider(rawKey);
          break;
        }
        default:
          throw new Error(`Unknown email provider: ${settings.provider}`);
      }

      return {
        provider,
        fromAddress: settings.fromAddress,
        fromName: settings.fromName,
        replyTo: settings.replyTo ?? null,
        settingsId: settings.id,
        providerName: settings.provider,
      };
    }
  }

  // ── Fallback: use Manus built-in RESEND_API_KEY env var ──────────────────
  const { ENV } = await import("../../_core/env");
  const apiKey = ENV.resendApiKey;

  if (!apiKey) {
    throw new Error(
      "No active email provider configured and RESEND_API_KEY env var is not set. " +
        "Please configure an email provider in Admin → Settings → Mail Service."
    );
  }

  const { ResendProvider } = await import("./providers/resend");
  const provider = new ResendProvider(apiKey);

  // Parse "Name <email@domain.com>" or plain "email@domain.com" from the env var
  const fromEnv = ENV.resendFromEmail || "EduChamp <invites@educhamp.app>";
  const match = fromEnv.match(/^(.+?)\s*<(.+?)>$/);
  const fromName = match ? match[1].trim() : "EduChamp";
  const fromAddress = match ? match[2].trim() : fromEnv;

  console.log(`[EmailService] Using Manus built-in Resend provider (env fallback) — from: ${fromAddress}`);

  return {
    provider,
    fromAddress,
    fromName,
    replyTo: null,
    settingsId: 0, // sentinel: 0 = env-based, not a DB row
    providerName: "resend",
  };
}
