/**
 * update-stripe-webhook-events.mjs
 * Adds customer.subscription.trial_will_end to the existing EduChamp webhook endpoint.
 */
import Stripe from "stripe";
import { readFileSync } from "fs";

// Load env from .env file if present, otherwise rely on process.env
try {
  const env = readFileSync("/home/ubuntu/educhamp/.env", "utf8");
  for (const line of env.split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length && !process.env[key]) {
      process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // .env not present — rely on process.env
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_ENDPOINT_ID = "we_1Tbsm17Mcfd3gqtz5pnFYasy";

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY not found in environment.");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" });

async function main() {
  console.log(`\nFetching webhook endpoint ${WEBHOOK_ENDPOINT_ID}...`);
  const endpoint = await stripe.webhookEndpoints.retrieve(WEBHOOK_ENDPOINT_ID);

  const currentEvents = endpoint.enabled_events ?? [];
  const newEvent = "customer.subscription.trial_will_end";

  if (currentEvents.includes(newEvent)) {
    console.log(`✅ Event "${newEvent}" is already subscribed.`);
    console.log("Current events:", currentEvents.join(", "));
    return;
  }

  const updatedEvents = [...currentEvents, newEvent];

  console.log(`Adding "${newEvent}" to webhook events...`);
  const updated = await stripe.webhookEndpoints.update(WEBHOOK_ENDPOINT_ID, {
    enabled_events: updatedEvents,
  });

  console.log(`\n✅ Webhook endpoint updated successfully!`);
  console.log(`Endpoint URL: ${updated.url}`);
  console.log(`Status: ${updated.status}`);
  console.log(`Subscribed events (${updated.enabled_events.length}):`);
  updated.enabled_events.forEach((e) => console.log(`  • ${e}`));
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
