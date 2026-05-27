/**
 * create-stripe-products.mjs
 * Run once to create EduChamp products and prices in Stripe.
 * Usage: node scripts/create-stripe-products.mjs
 *
 * Reads STRIPE_SECRET_KEY from the environment (already injected by the platform).
 * Prints the resulting Price IDs so they can be pasted into server/stripe.ts.
 */

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("ERROR: STRIPE_SECRET_KEY is not set.");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });

const PRODUCTS = [
  {
    key: "family",
    name: "EduChamp Family Plan",
    description: "1 student account · AI Tutor · Algebra I curriculum · Adaptive quizzes · Parent dashboard · Progress reports",
    monthly: { amount: 1999, nickname: "Family Monthly" },
    annual:  { amount: 191880, nickname: "Family Annual (save 20%)" },
  },
  {
    key: "premium_family",
    name: "EduChamp Premium Family Plan",
    description: "Up to 3 students · All 56+ courses (Grades 3–12 + AP) · STAAR & SAT/ACT prep · Priority AI Tutor · Advanced analytics · Co-parent access",
    monthly: { amount: 2999, nickname: "Premium Family Monthly" },
    annual:  { amount: 287880, nickname: "Premium Family Annual (save 20%)" },
  },
];

const results = {};

for (const p of PRODUCTS) {
  console.log(`\nCreating product: ${p.name}`);

  // Check if product already exists (idempotent by metadata)
  const existing = await stripe.products.search({
    query: `metadata['educhamp_plan_key']:'${p.key}'`,
    limit: 1,
  });

  let product;
  if (existing.data.length > 0) {
    product = existing.data[0];
    console.log(`  ✓ Product already exists: ${product.id}`);
  } else {
    product = await stripe.products.create({
      name: p.name,
      description: p.description,
      metadata: { educhamp_plan_key: p.key },
    });
    console.log(`  ✓ Created product: ${product.id}`);
  }

  // Monthly price
  const existingMonthly = await stripe.prices.list({
    product: product.id,
    recurring: { interval: "month" },
    limit: 5,
  });
  let monthlyPrice;
  if (existingMonthly.data.length > 0) {
    monthlyPrice = existingMonthly.data[0];
    console.log(`  ✓ Monthly price already exists: ${monthlyPrice.id}`);
  } else {
    monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: p.monthly.amount,
      currency: "usd",
      recurring: { interval: "month" },
      nickname: p.monthly.nickname,
      metadata: { educhamp_plan_key: p.key, billing_period: "monthly" },
    });
    console.log(`  ✓ Created monthly price: ${monthlyPrice.id}`);
  }

  // Annual price
  const existingAnnual = await stripe.prices.list({
    product: product.id,
    recurring: { interval: "year" },
    limit: 5,
  });
  let annualPrice;
  if (existingAnnual.data.length > 0) {
    annualPrice = existingAnnual.data[0];
    console.log(`  ✓ Annual price already exists: ${annualPrice.id}`);
  } else {
    annualPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: p.annual.amount,
      currency: "usd",
      recurring: { interval: "year" },
      nickname: p.annual.nickname,
      metadata: { educhamp_plan_key: p.key, billing_period: "annual" },
    });
    console.log(`  ✓ Created annual price: ${annualPrice.id}`);
  }

  results[p.key] = {
    productId: product.id,
    monthlyPriceId: monthlyPrice.id,
    annualPriceId: annualPrice.id,
  };
}

console.log("\n\n=== STRIPE PRICE IDs ===");
console.log("Copy these into server/stripe.ts:\n");
for (const [key, ids] of Object.entries(results)) {
  console.log(`${key}:`);
  console.log(`  monthly stripePriceId: "${ids.monthlyPriceId}"`);
  console.log(`  annual  stripePriceId: "${ids.annualPriceId}"`);
  console.log();
}

console.log("=== JSON (for automated patching) ===");
console.log(JSON.stringify(results, null, 2));
