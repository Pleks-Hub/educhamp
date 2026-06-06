/**
 * webhookAlerts.ts — Sends critical admin alerts to configured Slack/Discord webhooks.
 *
 * Webhook URLs are stored in platformSettings under key "alert_webhooks" as JSON:
 * [{ id, name, url, events, enabled }]
 *
 * Events:
 *  - "demo_request" — new school demo request submitted
 *  - "billing_issue" — payment failures, subscription issues
 *  - "new_signup" — new user registration
 *  - "system_error" — critical system errors
 */

import { getDb } from "../db";
import { platformSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  type: "slack" | "discord" | "generic";
}

export interface AlertPayload {
  event: string;
  title: string;
  message: string;
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, unknown>;
}

const SETTINGS_KEY = "alert_webhooks";

export async function getWebhookConfigs(): Promise<WebhookConfig[]> {
  const db = await getDb();
  if (!db) return [];
  const row = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, SETTINGS_KEY))
    .limit(1);
  if (!row[0]) return [];
  try {
    return JSON.parse(row[0].value) as WebhookConfig[];
  } catch {
    return [];
  }
}

export async function saveWebhookConfigs(configs: WebhookConfig[], adminId?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const value = JSON.stringify(configs);
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, SETTINGS_KEY))
    .limit(1);
  if (existing[0]) {
    await db
      .update(platformSettings)
      .set({ value, updatedBy: adminId ?? null })
      .where(eq(platformSettings.key, SETTINGS_KEY));
  } else {
    await db.insert(platformSettings).values({
      key: SETTINGS_KEY,
      value,
      label: "Alert Webhooks",
      description: "Slack/Discord webhook URLs for critical admin alerts",
      category: "notifications",
      updatedBy: adminId ?? null,
    });
  }
}

/**
 * Send an alert to all matching webhooks (non-blocking, fire-and-forget).
 */
export async function sendAlert(payload: AlertPayload): Promise<void> {
  const configs = await getWebhookConfigs();
  const matching = configs.filter(
    (c) => c.enabled && c.events.includes(payload.event)
  );
  if (matching.length === 0) return;

  const promises = matching.map((config) => sendToWebhook(config, payload));
  await Promise.allSettled(promises);
}

async function sendToWebhook(config: WebhookConfig, payload: AlertPayload): Promise<void> {
  const severityEmoji = {
    info: "ℹ️",
    warning: "⚠️",
    critical: "🚨",
  };
  const emoji = severityEmoji[payload.severity ?? "info"];

  let body: unknown;

  if (config.type === "slack") {
    body = {
      text: `${emoji} *${payload.title}*`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `${emoji} ${payload.title}` },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: payload.message },
        },
        ...(payload.metadata
          ? [
              {
                type: "context",
                elements: Object.entries(payload.metadata)
                  .slice(0, 5)
                  .map(([k, v]) => ({
                    type: "mrkdwn",
                    text: `*${k}:* ${String(v)}`,
                  })),
              },
            ]
          : []),
      ],
    };
  } else if (config.type === "discord") {
    body = {
      content: `${emoji} **${payload.title}**`,
      embeds: [
        {
          title: payload.title,
          description: payload.message,
          color: payload.severity === "critical" ? 0xff0000 : payload.severity === "warning" ? 0xffa500 : 0x0099ff,
          fields: payload.metadata
            ? Object.entries(payload.metadata)
                .slice(0, 5)
                .map(([k, v]) => ({ name: k, value: String(v), inline: true }))
            : undefined,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  } else {
    // Generic webhook — just POST the payload as JSON
    body = {
      event: payload.event,
      title: payload.title,
      message: payload.message,
      severity: payload.severity ?? "info",
      metadata: payload.metadata,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const resp = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      console.error(`[WebhookAlert] Failed to send to ${config.name}: ${resp.status} ${resp.statusText}`);
    }
  } catch (err) {
    console.error(`[WebhookAlert] Error sending to ${config.name}:`, err);
  }
}

/**
 * Test a webhook URL by sending a test message.
 */
export async function testWebhook(config: WebhookConfig): Promise<{ success: boolean; error?: string }> {
  try {
    await sendToWebhook(config, {
      event: "test",
      title: "EduChamp Webhook Test",
      message: "This is a test alert from EduChamp. If you see this, the webhook is configured correctly!",
      severity: "info",
      metadata: { source: "EduChamp Admin Console", timestamp: new Date().toISOString() },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Unknown error" };
  }
}
