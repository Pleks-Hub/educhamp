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

export type PlanKey = "free" | "family" | "premium_family";

export interface PlanDef {
  name: string;
  monthly: { amountCents: number; stripePriceId?: string };
  annual: { amountCents: number; stripePriceId?: string };
  maxStudents: number;
  features: string[];
  isFree?: boolean;
}

export const PLANS: Record<PlanKey, PlanDef> = {
  free: {
    name: "Free Plan",
    monthly: { amountCents: 0 },
    annual: { amountCents: 0 },
    maxStudents: 1,
    isFree: true,
    features: [
      "1 student account",
      "All 70+ courses (Pre-K through Grade 12)",
      "AI Tutor (EduBot) — limited",
      "Basic progress tracking",
      "Card on file required",
    ],
  },
  family: {
    name: "Family Plan",
    monthly: { amountCents: 1999, stripePriceId: "price_1TbnYY7Mcfd3gqtzhIiuU8AG" },   // $19.99/mo
    annual: { amountCents: 15990, stripePriceId: "price_1TbnYa7Mcfd3gqtz6r8qjbHx" },   // $15.99/mo × 12 = $191.88/yr (billed annually)
    maxStudents: 3,
    features: [
      "Up to 3 student accounts",
      "AI Tutor (EduBot) — unlimited",
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
    maxStudents: 5,
    features: [
      "Up to 5 student accounts",
      "All Family Plan features",
      "All 70+ courses (Pre-K through Grade 12 + AP)",
      "State assessment & SAT/ACT exam prep",
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

// ─── Setup Intent Helpers (card capture without immediate charge) ─────────────

/**
 * Create a Stripe SetupIntent to capture a payment method without charging.
 * Used for the "card on file" requirement before any plan activation.
 */
export async function createSetupIntent(stripeCustomerId: string) {
  return stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });
}

/**
 * Extract card details from a Stripe PaymentMethod.
 */
export async function getCardDetailsFromPaymentMethod(paymentMethodId: string) {
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (!pm.card) return null;
  return {
    stripePaymentMethodId: pm.id,
    cardLast4: pm.card.last4,
    cardBrand: pm.card.brand,
    cardExpMonth: pm.card.exp_month,
    cardExpYear: pm.card.exp_year,
  };
}

/**
 * Set a payment method as the default for a customer.
 */
export async function setDefaultPaymentMethod(stripeCustomerId: string, paymentMethodId: string) {
  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}
