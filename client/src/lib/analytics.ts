/**
 * analytics.ts
 * Thin wrapper around Google Tag Manager's dataLayer.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("begin_checkout", { plan: "family", billing_period: "monthly" });
 *
 * All events are pushed to window.dataLayer which GTM forwards to GA4 (and any
 * other tag configured in the GTM container).
 *
 * Replace GTM-XXXXXXX in client/index.html with your real GTM container ID.
 */

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Ensure dataLayer exists even before GTM loads */
function getDataLayer(): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

/**
 * Push a custom event to GTM dataLayer.
 * @param eventName  GA4-compatible event name (snake_case recommended)
 * @param params     Optional key/value pairs forwarded as event parameters
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  getDataLayer().push({
    event: eventName,
    ...params,
  });
}

// ─── Conversion funnel helpers ────────────────────────────────────────────────

/** Fired when the pricing section scrolls into view on the landing page */
export function trackViewPricing(params?: { source?: string }): void {
  trackEvent("view_pricing", { source: params?.source ?? "landing_page" });
}

/**
 * Fired when the user opens the checkout modal from a pricing CTA.
 * Maps to GA4's recommended `begin_checkout` event.
 */
export function trackBeginCheckout(params: {
  plan: string;
  billingPeriod: "monthly" | "annual";
  valueCents?: number;
}): void {
  trackEvent("begin_checkout", {
    plan: params.plan,
    billing_period: params.billingPeriod,
    currency: "USD",
    value: params.valueCents != null ? params.valueCents / 100 : undefined,
  });
}

/**
 * Fired when the user is redirected to Stripe (i.e., checkout session created).
 * Maps to GA4's recommended `add_payment_info` event.
 */
export function trackCheckoutRedirect(params: {
  plan: string;
  billingPeriod: "monthly" | "annual";
  couponApplied?: boolean;
}): void {
  trackEvent("checkout_redirect", {
    plan: params.plan,
    billing_period: params.billingPeriod,
    coupon_applied: params.couponApplied ?? false,
  });
}

/**
 * Fired on the /checkout/success page after Stripe redirects back.
 * Maps to GA4's recommended `purchase` event.
 */
export function trackTrialStarted(params: {
  plan: string;
  billingPeriod: "monthly" | "annual";
  transactionId?: string;
}): void {
  trackEvent("purchase", {
    transaction_id: params.transactionId ?? `trial_${Date.now()}`,
    value: 0,
    currency: "USD",
    coupon: "14_day_free_trial",
    items: [
      {
        item_id: params.plan,
        item_name: `EduChamp ${params.plan === "premium_family" ? "Premium Family" : "Family Plan"}`,
        item_category: "subscription",
        price: 0,
        quantity: 1,
      },
    ],
  });
  // Also push a named conversion event for easier GTM trigger matching
  trackEvent("trial_started", {
    plan: params.plan,
    billing_period: params.billingPeriod,
  });
}

/**
 * Fired when a user completes onboarding (parent or student).
 */
export function trackSignupComplete(params: {
  role: "parent" | "student";
  plan?: string;
}): void {
  trackEvent("signup_complete", {
    user_role: params.role,
    plan: params.plan,
  });
}
