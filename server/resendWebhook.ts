/**
 * Resend Email Webhook Handler
 *
 * Handles email.bounced and email.complained events from Resend.
 * Automatically suppresses the recipient address so future sends are skipped.
 *
 * Setup in Resend dashboard:
 *   Webhooks → Add Endpoint → https://educhamp.app/api/resend/webhook
 *   Events: email.bounced, email.complained
 *
 * Resend sends a Svix-style signature in the `svix-signature` header.
 * We verify it using the webhook signing secret from RESEND_WEBHOOK_SECRET.
 * If the secret is not set, we still process the event but log a warning.
 */

import express, { type Express } from "express";
import { suppressEmail } from "./emailService";
import { ENV } from "./_core/env";

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verify a Resend webhook using the Svix signature scheme.
 * Returns true if verification passes or if no secret is configured (dev mode).
 */
async function verifyResendSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
): Promise<boolean> {
  const secret = (ENV as any).resendWebhookSecret as string | undefined;
  if (!secret) {
    console.warn("[ResendWebhook] RESEND_WEBHOOK_SECRET not set — skipping signature check");
    return true;
  }

  // Svix signature format: svix-id, svix-timestamp, svix-signature headers
  const svixId = headers["svix-id"] as string | undefined;
  const svixTimestamp = headers["svix-timestamp"] as string | undefined;
  const svixSignature = headers["svix-signature"] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("[ResendWebhook] Missing Svix signature headers");
    return false;
  }

  try {
    const { createHmac } = await import("crypto");
    // Svix signed content: "{svix-id}.{svix-timestamp}.{body}"
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString("utf8")}`;
    // Secret is base64-encoded after the "whsec_" prefix
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const computed = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

    // svix-signature may contain multiple space-separated "v1,<base64>" values
    const signatures = svixSignature.split(" ");
    for (const sig of signatures) {
      const [version, value] = sig.split(",");
      if (version === "v1" && value === computed) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error("[ResendWebhook] Signature verification error:", err);
    return false;
  }
}

// ─── Event handler ────────────────────────────────────────────────────────────

interface ResendWebhookEvent {
  type: string;
  data: {
    email_id?: string;
    to?: string[];
    from?: string;
    subject?: string;
    created_at?: string;
    [key: string]: unknown;
  };
}

async function handleResendEvent(event: ResendWebhookEvent): Promise<void> {
  const { type, data } = event;
  const emailId = data.email_id ?? "unknown";
  const recipients = data.to ?? [];

  console.log(`[ResendWebhook] Processing event: ${type} (email_id: ${emailId})`);

  switch (type) {
    case "email.bounced": {
      for (const email of recipients) {
        await suppressEmail(email, "bounced", emailId, `Bounce detected via Resend webhook`);
      }
      console.log(`[ResendWebhook] Suppressed ${recipients.length} bounced address(es)`);
      break;
    }

    case "email.complained": {
      for (const email of recipients) {
        await suppressEmail(email, "complained", emailId, `Spam complaint via Resend webhook`);
      }
      console.log(`[ResendWebhook] Suppressed ${recipients.length} complained address(es)`);
      break;
    }

    default:
      console.log(`[ResendWebhook] Unhandled event type: ${type} — ignoring`);
  }
}

// ─── Express route registration ───────────────────────────────────────────────

export function registerResendWebhook(app: Express): void {
  // Must use express.raw to read the raw body for signature verification
  app.post(
    "/api/resend/webhook",
    express.raw({ type: "application/json" }),
    async (req: any, res: any) => {
      const rawBody = req.body as Buffer;

      // Verify signature
      const valid = await verifyResendSignature(rawBody, req.headers as Record<string, string | undefined>);
      if (!valid) {
        console.warn("[ResendWebhook] Invalid signature — rejecting request");
        return res.status(401).json({ error: "Invalid webhook signature" });
      }

      let event: ResendWebhookEvent;
      try {
        event = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return res.status(400).json({ error: "Invalid JSON body" });
      }

      try {
        await handleResendEvent(event);
      } catch (err) {
        console.error("[ResendWebhook] Handler error:", err);
        // Return 200 so Resend does not retry — the error is logged for investigation
      }

      res.json({ received: true });
    }
  );
}
