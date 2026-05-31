import type { EmailProvider } from "./types";
import { decryptSecret, isEncrypted } from "./crypto";

/**
 * Reads the active emailSettings row from the DB and returns the appropriate provider instance.
 * Throws if no active settings row exists.
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
  if (!db) throw new Error("Database unavailable");

  const [settings] = await db
    .select()
    .from(emailSettings)
    .where(eq(emailSettings.isActive, true))
    .limit(1);

  if (!settings) {
    throw new Error(
      "No active email provider configured. Please configure an email provider in Admin → Email Settings."
    );
  }

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
