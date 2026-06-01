/**
 * bootstrapEmailService
 *
 * Called once at server startup. Ensures the emailSettings table always has
 * an active Resend row seeded from the Manus built-in RESEND_API_KEY env var.
 *
 * Rules:
 *  - If an active row already exists → do nothing (admin config wins).
 *  - If no active row exists but RESEND_API_KEY is set → insert a default row
 *    and mark it active so every send call immediately works.
 *  - If RESEND_API_KEY is not set → log a warning and skip (factory will use
 *    the env-var fallback path which will surface a clear error at send time).
 */
import { ENV } from "../../_core/env";
import { encryptSecret } from "./crypto";

export async function bootstrapEmailService(): Promise<void> {
  try {
    const { getDb } = await import("../../db");
    const { emailSettings } = await import("../../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const db = await getDb();
    if (!db) return;

    // Check if there is already an active provider row
    const [active] = await db
      .select({ id: emailSettings.id, provider: emailSettings.provider })
      .from(emailSettings)
      .where(eq(emailSettings.isActive, true))
      .limit(1);

    if (active) {
      console.log(`[EmailService] Active provider: ${active.provider} (id: ${active.id})`);
      return;
    }

    // No active row — seed from env vars if available
    const apiKey = ENV.resendApiKey;
    if (!apiKey) {
      console.warn(
        "[EmailService] No active email provider and RESEND_API_KEY is not set. " +
          "Emails will not be delivered until a provider is configured in Admin → Settings → Mail Service."
      );
      return;
    }

    // Parse "Name <email@domain.com>" or plain address from RESEND_FROM_EMAIL
    const fromEnv = ENV.resendFromEmail || "EduChamp <invites@educhamp.app>";
    const match = fromEnv.match(/^(.+?)\s*<(.+?)>$/);
    const fromName = match ? match[1].trim() : "EduChamp";
    const fromAddress = match ? match[2].trim() : fromEnv;

    const encryptedKey = encryptSecret(apiKey);

    // Deactivate any existing rows first (safety)
    await db.update(emailSettings).set({ isActive: false });

    // Insert the default Manus Resend row
    await db.insert(emailSettings).values({
      provider: "resend",
      fromAddress,
      fromName,
      replyTo: null,
      apiKey: encryptedKey,
      isActive: true,
      createdBy: 1,
    });

    console.log(
      `[EmailService] Seeded default Resend provider from env vars (from: ${fromAddress})`
    );
  } catch (err) {
    console.error("[EmailService] bootstrapEmailService failed:", err);
  }
}
