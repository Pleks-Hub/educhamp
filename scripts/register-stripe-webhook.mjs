/**
 * register-stripe-webhook.mjs
 *
 * Registers https://educhamp.app/api/stripe/webhook as a Stripe webhook endpoint
 * and subscribes it to the six required events.
 *
 * Usage:
 *   node scripts/register-stripe-webhook.mjs
 *
 * The script reads STRIPE_SECRET_KEY from the environment (already injected by Manus).
 * After running, copy the printed webhook signing secret (whsec_...) into
 * Settings → Payment in the Manus Management UI as STRIPE_WEBHOOK_SECRET.
 */

import Stripe from "stripe";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env if present (for local dev); in sandbox the env vars are already set
try {
  const envPath = resolve(__dirname, "../.env");
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !process.env[key]) {
      process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // .env not found — rely on injected environment
}

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("❌  STRIPE_SECRET_KEY is not set. Cannot register webhook.");
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: "2025-04-30.basil" });

const WEBHOOK_URL = "https://educhamp.app/api/stripe/webhook";

const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "payment_intent.succeeded",
];

async function main() {
  console.log("🔍  Checking for existing webhook endpoints…");

  // List existing webhooks to avoid duplicates
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const duplicate = existing.data.find((wh) => wh.url === WEBHOOK_URL);

  if (duplicate) {
    console.log(`ℹ️   Webhook already registered (id: ${duplicate.id})`);
    console.log(`    Status: ${duplicate.status}`);
    console.log(`    Events: ${duplicate.enabled_events.join(", ")}`);
    console.log("\n⚠️   Cannot retrieve the signing secret for an existing webhook via API.");
    console.log("    Go to Stripe Dashboard → Developers → Webhooks → click the endpoint");
    console.log("    → Reveal signing secret to get the whsec_ value.");
    return;
  }

  console.log(`📡  Registering webhook: ${WEBHOOK_URL}`);
  const webhook = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: "EduChamp production webhook — all subscription and payment events",
  });

  console.log("\n✅  Webhook registered successfully!");
  console.log(`    ID:     ${webhook.id}`);
  console.log(`    URL:    ${webhook.url}`);
  console.log(`    Status: ${webhook.status}`);
  console.log(`    Events: ${webhook.enabled_events.join(", ")}`);
  console.log("\n🔑  SIGNING SECRET (copy this value):");
  console.log(`    ${webhook.secret}`);
  console.log("\n📋  Next step:");
  console.log("    Paste the signing secret above into Settings → Payment");
  console.log("    in the Manus Management UI as STRIPE_WEBHOOK_SECRET.");
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
