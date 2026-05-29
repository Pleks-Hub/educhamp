import Stripe from "stripe";
import { ENV } from "./_core/env";

// ─── Stripe Client ────────────────────────────────────────────────────────────

export const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

// ─── Plan / Price Map ─────────────────────────────────────────────────────────
// Prices are in cents (USD). Stripe Checkout sessions use these values.
// Annual prices reflect a 20% discount billed as a single annual charge.

export type PlanKey = "family" | "premium_family";

export const PLANS: Record<
  PlanKey,
  {
    name: string;
    monthly: { amountCents: number; stripePriceId?: string };
    annual: { amountCents: number; stripePriceId?: string };
    features: string[];
  }
> = {
  family: {
    name: "Family Plan",
    monthly: { amountCents: 1999, stripePriceId: "price_1TbnYY7Mcfd3gqtzhIiuU8AG" },   // $19.99/mo
    annual: { amountCents: 15990, stripePriceId: "price_1TbnYa7Mcfd3gqtz6r8qjbHx" },   // $15.99/mo × 12 = $191.88/yr (billed annually)
    features: [
      "1 student account",
      "AI Tutor (EduBot)",
      "All 70+ courses (Pre-K through Grade 12)",
      "Adaptive quizzes",
      "Parent dashboard",
      "Progress reports",
    ],
  },
  premium_family: {
    name: "Premium Family Plan",
    monthly: { amountCents: 2999, stripePriceId: "price_1TbnYd7Mcfd3gqtzJc4cBAO6" },   // $29.99/mo
    annual: { amountCents: 23990, stripePriceId: "price_1TbnYf7Mcfd3gqtzcQzNuisb" },   // $23.99/mo × 12 = $287.88/yr (billed annually)
    features: [
      "Up to 3 student accounts",
      "All Family Plan features",
      "All 70+ courses (Pre-K through Grade 12 + AP)",
      "STAAR & SAT/ACT exam prep",
      "Priority AI Tutor",
      "Advanced analytics",
      "Co-parent access",
    ],
  },
};

export function getPlanByKey(key: string): (typeof PLANS)[PlanKey] | null {
  return PLANS[key as PlanKey] ?? null;
}

// ─── Coupon Validation ────────────────────────────────────────────────────────

export type CouponValidationResult =
  | {
      valid: true;
      discountType: "percentage" | "fixed";
      discountValue: number;
      maxDiscountAmount: number | null;
      duration: "once" | "repeating" | "forever";
      durationMonths: number | null;
      originalAmountCents: number;
      discountAmountCents: number;
      finalAmountCents: number;
      couponId: number;
      couponName: string;
    }
  | { valid: false; reason: string };

export function calculateDiscount(
  amountCents: number,
  discountType: "percentage" | "fixed",
  discountValue: number,
  maxDiscountAmount: number | null
): { discountAmountCents: number; finalAmountCents: number } {
  let discountAmountCents: number;
  if (discountType === "percentage") {
    discountAmountCents = Math.round((amountCents * discountValue) / 100);
    if (maxDiscountAmount !== null) {
      discountAmountCents = Math.min(discountAmountCents, Math.round(maxDiscountAmount));
    }
  } else {
    // fixed amount in cents
    discountAmountCents = Math.min(Math.round(discountValue), amountCents);
  }
  const finalAmountCents = Math.max(0, amountCents - discountAmountCents);
  return { discountAmountCents, finalAmountCents };
}

// ─── Stripe Customer Helpers ──────────────────────────────────────────────────

export async function getOrCreateStripeCustomer(
  userId: number,
  email: string,
  name?: string | null
): Promise<string> {
  // Search for existing customer by email
  const existing = await stripe.customers.search({
    query: `email:'${email}' AND metadata['educhamp_user_id']:'${userId}'`,
    limit: 1,
  });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: { educhamp_user_id: String(userId) },
  });
  return customer.id;
}
