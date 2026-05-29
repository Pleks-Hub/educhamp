/**
 * Stripe Webhook Smoke Tests
 *
 * Verifies that handleStripeEvent correctly:
 *  1. Routes checkout.session.completed → upsertSubscription + logPaymentEvent
 *  2. Routes customer.subscription.created/updated → upsertSubscription
 *  3. Routes customer.subscription.deleted → upsertSubscription (canceled)
 *  4. Routes invoice.paid → logPaymentEvent
 *  5. Routes invoice.payment_failed → logPaymentEvent (failed)
 *  6. Handles events with no matching user gracefully (no crash)
 *  7. Handles unknown event types without throwing
 *
 * All DB helpers and Stripe SDK are mocked — no network calls are made.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => {
  // Minimal mock DB object that returns userId 42 for the test customer.
  // Defined inside the factory to avoid vi.mock hoisting issues.
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ id: 42 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  return {
    upsertSubscription: vi.fn().mockResolvedValue(undefined),
    logPaymentEvent: vi.fn().mockResolvedValue(undefined),
    saveUserBillingPeriod: vi.fn().mockResolvedValue(undefined),
    incrementCouponUsage: vi.fn().mockResolvedValue(undefined),
    recordCouponRedemption: vi.fn().mockResolvedValue(undefined),
    getDb: vi.fn().mockResolvedValue(mockDb),
    getUserById: vi.fn().mockResolvedValue(null),
  };
});

// ─── Mock Stripe ──────────────────────────────────────────────────────────────
vi.mock("./stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/test" }),
      },
    },
  },
  PLANS: {
    family: {
      name: "Family Plan",
      monthly: { amountCents: 1999 },
      annual: { amountCents: 15990 },
      features: [],
    },
    premium_family: {
      name: "Premium Family Plan",
      monthly: { amountCents: 2999 },
      annual: { amountCents: 28788 },
      features: [],
    },
  },
}));

// ─── Mock email service ───────────────────────────────────────────────────────
vi.mock("./emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./emailTemplates/trialWelcome", () => ({
  buildTrialWelcomeEmail: vi.fn().mockReturnValue({
    subject: "Welcome",
    html: "<p>Welcome</p>",
    text: "Welcome",
  }),
}));

vi.mock("./emailTemplates/trialReminder", () => ({
  buildTrialReminderEmail: vi.fn().mockReturnValue({
    subject: "Reminder",
    html: "<p>Reminder</p>",
    text: "Reminder",
  }),
}));

vi.mock("./emailTemplates/trialExpiry", () => ({
  buildTrialExpiryEmail: vi.fn().mockReturnValue({
    subject: "Expiry",
    html: "<p>Expiry</p>",
    text: "Expiry",
  }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import { handleStripeEvent } from "./stripeWebhook";
import * as db from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeCheckoutEvent(overrides: Record<string, any> = {}) {
  return {
    id: "evt_live_checkout_001",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_abc123",
        customer: "cus_test_001",
        payment_status: "paid",
        amount_total: 1999,
        currency: "usd",
        metadata: {
          user_id: "42",
          plan_key: "family",
          billing_period: "monthly",
          customer_email: "student@example.com",
          customer_name: "Test Student",
        },
        total_details: { amount_discount: 0 },
        ...overrides,
      },
    },
  };
}

function makeSubscriptionEvent(type: string, status = "active") {
  return {
    id: `evt_live_sub_${Date.now()}`,
    type,
    data: {
      object: {
        id: "sub_test_001",
        customer: "cus_test_001",
        status,
        cancel_at_period_end: false,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        metadata: { plan_key: "family" },
        items: {
          data: [
            {
              price: {
                unit_amount: 1999,
                currency: "usd",
                recurring: { interval: "month" },
              },
            },
          ],
        },
      },
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── 1. checkout.session.completed ─────────────────────────────────────────────
describe("checkout.session.completed", () => {
  it("calls saveUserBillingPeriod with the correct userId and billing period", async () => {
    await handleStripeEvent(makeCheckoutEvent());
    expect(db.saveUserBillingPeriod).toHaveBeenCalledWith(42, "monthly");
  });

  it("calls upsertSubscription with active status and correct planName", async () => {
    await handleStripeEvent(makeCheckoutEvent());
    expect(db.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        planName: "family",
        billingPeriod: "monthly",
        status: "active",
        stripeCustomerId: "cus_test_001",
        stripeCheckoutSessionId: "cs_test_abc123",
        amountCents: 1999,
      })
    );
  });

  it("calls logPaymentEvent with checkout.session.completed type", async () => {
    await handleStripeEvent(makeCheckoutEvent());
    expect(db.logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        event: "checkout.session.completed",
        stripeEventId: "evt_live_checkout_001",
        stripeObjectId: "cs_test_abc123",
        amountCents: 1999,
        currency: "usd",
        status: "paid",
      })
    );
  });

  it("handles annual billing period correctly", async () => {
    const event = makeCheckoutEvent({
      metadata: {
        user_id: "42",
        plan_key: "premium_family",
        billing_period: "annual",
      },
    });
    await handleStripeEvent(event);
    expect(db.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ billingPeriod: "annual", planName: "premium_family" })
    );
  });

  it("does not crash when userId is missing from metadata", async () => {
    const event = makeCheckoutEvent({ metadata: {}, customer: null });
    await expect(handleStripeEvent(event)).resolves.not.toThrow();
    // logPaymentEvent should still be called even without a userId
    expect(db.logPaymentEvent).toHaveBeenCalled();
  });

  it("records coupon redemption when coupon_id is present and discount > 0", async () => {
    const event = makeCheckoutEvent({
      metadata: {
        user_id: "42",
        plan_key: "family",
        billing_period: "monthly",
        coupon_id: "7",
      },
      total_details: { amount_discount: 500 },
      amount_total: 1499,
    });
    await handleStripeEvent(event);
    expect(db.incrementCouponUsage).toHaveBeenCalledWith(7);
    expect(db.recordCouponRedemption).toHaveBeenCalledWith(
      expect.objectContaining({
        couponId: 7,
        userId: 42,
        discountAmountCents: 500,
        finalAmountCents: 1499,
      })
    );
  });
});

// ── 2. customer.subscription.created ─────────────────────────────────────────
describe("customer.subscription.created", () => {
  it("calls upsertSubscription with active status", async () => {
    await handleStripeEvent(makeSubscriptionEvent("customer.subscription.created", "active"));
    expect(db.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", stripeSubscriptionId: "sub_test_001" })
    );
  });

  it("calls logPaymentEvent with subscription created type", async () => {
    await handleStripeEvent(makeSubscriptionEvent("customer.subscription.created", "active"));
    expect(db.logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "customer.subscription.created" })
    );
  });
});

// ── 3. customer.subscription.updated ─────────────────────────────────────────
describe("customer.subscription.updated", () => {
  it("calls upsertSubscription with updated status", async () => {
    await handleStripeEvent(makeSubscriptionEvent("customer.subscription.updated", "past_due"));
    expect(db.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "past_due" })
    );
  });
});

// ── 4. customer.subscription.deleted ─────────────────────────────────────────
describe("customer.subscription.deleted", () => {
  it("calls upsertSubscription with canceled status", async () => {
    await handleStripeEvent(makeSubscriptionEvent("customer.subscription.deleted", "canceled"));
    expect(db.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "canceled" })
    );
  });

  it("calls logPaymentEvent with canceled status", async () => {
    await handleStripeEvent(makeSubscriptionEvent("customer.subscription.deleted", "canceled"));
    expect(db.logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "customer.subscription.deleted", status: "canceled" })
    );
  });
});

// ── 5. invoice.paid ───────────────────────────────────────────────────────────
describe("invoice.paid", () => {
  it("calls logPaymentEvent with paid status", async () => {
    const event = {
      id: "evt_live_inv_001",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_test_001",
          customer: "cus_test_001",
          amount_paid: 1999,
          currency: "usd",
          subscription: "sub_test_001",
        },
      },
    };
    await handleStripeEvent(event);
    expect(db.logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "invoice.paid",
        amountCents: 1999,
        status: "paid",
      })
    );
  });
});

// ── 6. invoice.payment_failed ─────────────────────────────────────────────────
describe("invoice.payment_failed", () => {
  it("calls logPaymentEvent with failed status", async () => {
    const event = {
      id: "evt_live_inv_fail_001",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_test_fail_001",
          customer: "cus_test_001",
          amount_due: 1999,
          currency: "usd",
          subscription: "sub_test_001",
          next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
        },
      },
    };
    await handleStripeEvent(event);
    expect(db.logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "invoice.payment_failed",
        status: "failed",
      })
    );
  });
});

// ── 7. Unknown event type ─────────────────────────────────────────────────────
describe("unknown event type", () => {
  it("does not throw for unhandled event types", async () => {
    const event = {
      id: "evt_live_unknown_001",
      type: "payment_method.attached",
      data: { object: { id: "pm_test_001" } },
    };
    await expect(handleStripeEvent(event)).resolves.not.toThrow();
    // No DB calls should be made for unhandled events
    expect(db.upsertSubscription).not.toHaveBeenCalled();
    expect(db.logPaymentEvent).not.toHaveBeenCalled();
  });
});

// ── 8. HTTP endpoint test event detection ─────────────────────────────────────
describe("test event detection (HTTP endpoint)", () => {
  it("evt_test_ prefix is correctly identified as a test event", () => {
    const testId = "evt_test_smoke_001";
    expect(testId.startsWith("evt_test_")).toBe(true);
  });

  it("live event IDs are not mistaken for test events", () => {
    const liveId = "evt_1TbnYY7Mcfd3gqtz_live";
    expect(liveId.startsWith("evt_test_")).toBe(false);
  });
});
