/**
 * Multi-Provider Email Webhook Handler
 *
 * Handles delivery events from Resend and SendGrid.
 * Automatically suppresses bounced/complained addresses.
 * Updates emailLogs.deliveryStatus via messageId.
 *
 * Routes:
 *   POST /api/webhooks/email  — unified endpoint (auto-detects provider from headers)
 *
 * Resend:  uses Svix signature headers (svix-id, svix-timestamp, svix-signature)
 * SendGrid: uses X-Twilio-Email-Event-Webhook-Signature + X-Twilio-Email-Event-Webhook-Timestamp
 *
 * The webhook signing secret is read from the active emailSettings row in the DB.
 * If no secret is configured, events are still processed (dev mode).
 */

import express, { type Express } from "express";
import { suppressEmail } from "./emailService";
import { getDb } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryStatus = "delivered" | "opened" | "bounced" | "complained" | "failed";

// ─── Delivery status update helper ───────────────────────────────────────────

async function updateDeliveryStatus(messageId: string, status: DeliveryStatus): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const { emailLogs } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const result = await db
      .update(emailLogs)
      .set({ deliveryStatus: status, deliveryUpdatedAt: new Date() })
      .where(eq(emailLogs.messageId, messageId));
    if ((result as any).affectedRows === 0) {
      console.log(`[EmailWebhook] No emailLog row for messageId ${messageId} — skipping status update`);
    } else {
      console.log(`[EmailWebhook] Updated deliveryStatus to "${status}" for messageId ${messageId}`);
    }
  } catch (err) {
    console.error("[EmailWebhook] Failed to update delivery status:", err);
  }
}

// ─── Webhook secret lookup ────────────────────────────────────────────────────

async function getWebhookSecret(provider: "resend" | "sendgrid"): Promise<string | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const { emailSettings } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");
    const { decryptSecret, isEncrypted } = await import("./services/email/crypto");
    const [row] = await db
      .select()
      .from(emailSettings)
      .where(and(eq(emailSettings.isActive, true), eq(emailSettings.provider, provider)))
      .limit(1);
    if (!row?.webhookSecret) return null;
    return isEncrypted(row.webhookSecret) ? decryptSecret(row.webhookSecret) : row.webhookSecret;
  } catch {
    return null;
  }
}

// ─── Resend (Svix) signature verification ────────────────────────────────────

async function verifyResendSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
): Promise<boolean> {
  const secret = await getWebhookSecret("resend");
  if (!secret) {
    console.warn("[EmailWebhook/Resend] No webhook secret configured — skipping signature check");
    return true;
  }

  const svixId = headers["svix-id"] as string | undefined;
  const svixTimestamp = headers["svix-timestamp"] as string | undefined;
  const svixSignature = headers["svix-signature"] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("[EmailWebhook/Resend] Missing Svix signature headers");
    return false;
  }

  try {
    const { createHmac } = await import("crypto");
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString("utf8")}`;
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const computed = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
    const signatures = svixSignature.split(" ");
    for (const sig of signatures) {
      const [version, value] = sig.split(",");
      if (version === "v1" && value === computed) return true;
    }
    return false;
  } catch (err) {
    console.error("[EmailWebhook/Resend] Signature verification error:", err);
    return false;
  }
}

// ─── SendGrid signature verification ─────────────────────────────────────────

async function verifySendGridSignature(
  rawBody: Buffer,
  headers: Record<string, string | string[] | undefined>
): Promise<boolean> {
  const secret = await getWebhookSecret("sendgrid");
  if (!secret) {
    console.warn("[EmailWebhook/SendGrid] No webhook secret configured — skipping signature check");
    return true;
  }

  const signature = headers["x-twilio-email-event-webhook-signature"] as string | undefined;
  const timestamp = headers["x-twilio-email-event-webhook-timestamp"] as string | undefined;

  if (!signature || !timestamp) {
    console.warn("[EmailWebhook/SendGrid] Missing SendGrid signature headers");
    return false;
  }

  try {
    const { createVerify } = await import("crypto");
    // SendGrid uses ECDSA P-256 signature over timestamp + body
    const payload = timestamp + rawBody.toString("utf8");
    const verify = createVerify("sha256");
    verify.update(payload);
    return verify.verify(secret, signature, "base64");
  } catch (err) {
    console.error("[EmailWebhook/SendGrid] Signature verification error:", err);
    return false;
  }
}

// ─── Resend event handler ─────────────────────────────────────────────────────

interface ResendEvent {
  type: string;
  data: {
    email_id?: string;
    to?: string[];
    [key: string]: unknown;
  };
}

async function handleResendEvent(event: ResendEvent): Promise<void> {
  const { type, data } = event;
  const emailId = data.email_id ?? "unknown";
  const recipients = data.to ?? [];

  console.log(`[EmailWebhook/Resend] Event: ${type} (email_id: ${emailId})`);

  switch (type) {
    case "email.delivered":
      await updateDeliveryStatus(emailId, "delivered");
      break;
    case "email.opened":
      await updateDeliveryStatus(emailId, "opened");
      break;
    case "email.bounced":
      for (const email of recipients) {
        await suppressEmail(email, "bounced", emailId, "Bounce via Resend webhook");
      }
      await updateDeliveryStatus(emailId, "bounced");
      break;
    case "email.complained":
      for (const email of recipients) {
        await suppressEmail(email, "complained", emailId, "Spam complaint via Resend webhook");
      }
      await updateDeliveryStatus(emailId, "complained");
      break;
    case "email.delivery_delayed":
    case "email.failed":
      await updateDeliveryStatus(emailId, "failed");
      break;
    default:
      console.log(`[EmailWebhook/Resend] Unhandled event type: ${type}`);
  }
}

// ─── SendGrid event handler ───────────────────────────────────────────────────

interface SendGridEvent {
  event: string;
  sg_message_id?: string;
  email?: string;
  timestamp?: number;
  [key: string]: unknown;
}

async function handleSendGridEvents(events: SendGridEvent[]): Promise<void> {
  for (const ev of events) {
    const messageId = ev.sg_message_id?.split(".")[0] ?? "unknown";
    const email = ev.email ?? "";

    console.log(`[EmailWebhook/SendGrid] Event: ${ev.event} (msg: ${messageId})`);

    switch (ev.event) {
      case "delivered":
        await updateDeliveryStatus(messageId, "delivered");
        break;
      case "open":
        await updateDeliveryStatus(messageId, "opened");
        break;
      case "bounce":
      case "blocked":
        if (email) await suppressEmail(email, "bounced", messageId, "Bounce via SendGrid webhook");
        await updateDeliveryStatus(messageId, "bounced");
        break;
      case "spamreport":
        if (email) await suppressEmail(email, "complained", messageId, "Spam report via SendGrid webhook");
        await updateDeliveryStatus(messageId, "complained");
        break;
      case "dropped":
      case "deferred":
        await updateDeliveryStatus(messageId, "failed");
        break;
      default:
        console.log(`[EmailWebhook/SendGrid] Unhandled event: ${ev.event}`);
    }
  }
}

// ─── Provider detection ───────────────────────────────────────────────────────

function detectProvider(
  headers: Record<string, string | string[] | undefined>
): "resend" | "sendgrid" | "unknown" {
  if (headers["svix-id"] || headers["svix-signature"]) return "resend";
  if (headers["x-twilio-email-event-webhook-signature"]) return "sendgrid";
  return "unknown";
}

// ─── Express route registration ───────────────────────────────────────────────

export function registerEmailWebhook(app: Express): void {
  app.post(
    "/api/webhooks/email",
    express.raw({ type: "application/json" }),
    async (req: any, res: any) => {
      const rawBody = req.body as Buffer;
      const headers = req.headers as Record<string, string | string[] | undefined>;
      const provider = detectProvider(headers);

      if (provider === "resend") {
        const valid = await verifyResendSignature(rawBody, headers);
        if (!valid) {
          console.warn("[EmailWebhook] Invalid Resend signature");
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
        let event: ResendEvent;
        try {
          event = JSON.parse(rawBody.toString("utf8"));
        } catch {
          return res.status(400).json({ error: "Invalid JSON" });
        }
        try {
          await handleResendEvent(event);
        } catch (err) {
          console.error("[EmailWebhook/Resend] Handler error:", err);
        }
        return res.json({ received: true, provider: "resend" });
      }

      if (provider === "sendgrid") {
        const valid = await verifySendGridSignature(rawBody, headers);
        if (!valid) {
          console.warn("[EmailWebhook] Invalid SendGrid signature");
          return res.status(401).json({ error: "Invalid webhook signature" });
        }
        let events: SendGridEvent[];
        try {
          events = JSON.parse(rawBody.toString("utf8"));
          if (!Array.isArray(events)) events = [events];
        } catch {
          return res.status(400).json({ error: "Invalid JSON" });
        }
        try {
          await handleSendGridEvents(events);
        } catch (err) {
          console.error("[EmailWebhook/SendGrid] Handler error:", err);
        }
        return res.json({ received: true, provider: "sendgrid" });
      }

      // Unknown provider — still try Resend (backward compat for existing webhook URLs)
      console.warn("[EmailWebhook] Unknown provider headers — attempting Resend parse");
      try {
        const event: ResendEvent = JSON.parse(rawBody.toString("utf8"));
        await handleResendEvent(event);
      } catch (err) {
        console.error("[EmailWebhook] Fallback parse error:", err);
      }
      return res.json({ received: true, provider: "unknown" });
    }
  );
}
