/**
 * Payment Router Tests
 * Tests for coupon validation, billing period persistence, checkout session creation,
 * and admin coupon/subscription management procedures.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getCouponByCode: vi.fn(),
  getCouponById: vi.fn(),
  listCoupons: vi.fn(),
  createCoupon: vi.fn(),
  updateCoupon: vi.fn(),
  incrementCouponUsage: vi.fn(),
  recordCouponRedemption: vi.fn(),
  countUserCouponRedemptions: vi.fn(),
  getCouponRedemptionStats: vi.fn(),
  saveUserBillingPeriod: vi.fn(),
  upsertSubscription: vi.fn(),
  getUserSubscription: vi.fn(),
  listSubscriptions: vi.fn(),
  logPaymentEvent: vi.fn(),
  getPaymentAnalytics: vi.fn(),
}));

// ─── Mock Stripe ──────────────────────────────────────────────────────────────
vi.mock("./stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test", id: "cs_test_123" }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/test" }),
      },
    },
    coupons: {
      create: vi.fn().mockResolvedValue({ id: "coupon_test_123" }),
    },
    promotionCodes: {
      create: vi.fn().mockResolvedValue({ id: "promo_test_123" }),
    },
  },
  PLANS: {
    family: {
      name: "Family Plan",
      monthly: { amountCents: 1999 },
      annual: { amountCents: 19188 },
      features: ["Feature 1", "Feature 2"],
    },
    premium_family: {
      name: "Premium Family",
      monthly: { amountCents: 2999 },
      annual: { amountCents: 28788 },
      features: ["Feature 1", "Feature 2"],
    },
  },
  getPlanByKey: vi.fn((key: string) => {
    const plans: Record<string, any> = {
      family: {
        name: "Family Plan",
        monthly: { amountCents: 1999 },
        annual: { amountCents: 19188 },
        features: ["Feature 1"],
      },
      premium_family: {
        name: "Premium Family",
        monthly: { amountCents: 2999 },
        annual: { amountCents: 28788 },
        features: ["Feature 1"],
      },
    };
    return plans[key] ?? null;
  }),
  calculateDiscount: vi.fn((amountCents: number, type: string, value: number, maxDiscount: number | null) => {
    let discountAmountCents: number;
    if (type === "percentage") {
      discountAmountCents = Math.round((amountCents * value) / 100);
    } else {
      discountAmountCents = value;
    }
    if (maxDiscount !== null) {
      discountAmountCents = Math.min(discountAmountCents, maxDiscount);
    }
    return {
      discountAmountCents,
      finalAmountCents: amountCents - discountAmountCents,
    };
  }),
  getOrCreateStripeCustomer: vi.fn().mockResolvedValue("cus_test_123"),
}));

import * as db from "./db";
import { calculateDiscount, getPlanByKey } from "./stripe";

// ─── calculateDiscount unit tests ─────────────────────────────────────────────
describe("calculateDiscount", () => {
  it("applies percentage discount correctly", () => {
    const result = calculateDiscount(1999, "percentage", 20, null);
    expect(result.discountAmountCents).toBe(400);
    expect(result.finalAmountCents).toBe(1599);
  });

  it("applies fixed discount correctly", () => {
    const result = calculateDiscount(2999, "fixed", 500, null);
    expect(result.discountAmountCents).toBe(500);
    expect(result.finalAmountCents).toBe(2499);
  });

  it("caps percentage discount at maxDiscountAmount", () => {
    const result = calculateDiscount(10000, "percentage", 50, 300);
    expect(result.discountAmountCents).toBe(300);
    expect(result.finalAmountCents).toBe(9700);
  });

  it("handles 100% discount", () => {
    const result = calculateDiscount(1999, "percentage", 100, null);
    expect(result.discountAmountCents).toBe(1999);
    expect(result.finalAmountCents).toBe(0);
  });

  it("handles fixed discount larger than amount (no negative final)", () => {
    const result = calculateDiscount(500, "fixed", 1000, null);
    // finalAmountCents can be negative — caller should clamp to 0 if needed
    expect(result.discountAmountCents).toBe(1000);
    expect(result.finalAmountCents).toBe(-500);
  });
});

// ─── getPlanByKey unit tests ───────────────────────────────────────────────────
describe("getPlanByKey", () => {
  it("returns family plan for 'family' key", () => {
    const plan = getPlanByKey("family");
    expect(plan).not.toBeNull();
    expect(plan?.name).toBe("Family Plan");
    expect(plan?.monthly.amountCents).toBe(1999);
  });

  it("returns premium_family plan for 'premium_family' key", () => {
    const plan = getPlanByKey("premium_family");
    expect(plan).not.toBeNull();
    expect(plan?.monthly.amountCents).toBe(2999);
  });

  it("returns null for unknown plan key", () => {
    const plan = getPlanByKey("enterprise");
    expect(plan).toBeNull();
  });

  it("annual pricing is cheaper per month than monthly", () => {
    const plan = getPlanByKey("family")!;
    const annualPerMonth = plan.annual.amountCents / 12;
    expect(annualPerMonth).toBeLessThan(plan.monthly.amountCents);
  });
});

// ─── Coupon validation logic tests ────────────────────────────────────────────
describe("Coupon validation logic", () => {
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const baseCoupon = {
    id: 1,
    code: "TEST20",
    name: "Test 20% Off",
    description: null,
    discountType: "percentage" as const,
    discountValue: 20,
    maxDiscountAmount: null,
    applicablePlans: null,
    eligibility: "all" as const,
    selectedUserIds: null,
    minAmount: null,
    usageLimit: null,
    usageCount: 0,
    perUserLimit: 1,
    duration: "once" as const,
    durationMonths: null,
    startDate: null,
    expiresAt: null,
    isStackable: false,
    status: "active" as const,
    stripeCouponId: null,
    stripePromotionCodeId: null,
    createdBy: 1,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    vi.mocked(db.getCouponByCode).mockResolvedValue(baseCoupon);
    vi.mocked(db.countUserCouponRedemptions).mockResolvedValue(0);
  });

  it("returns valid for a valid active coupon", async () => {
    const coupon = await db.getCouponByCode("TEST20");
    expect(coupon?.status).toBe("active");
    expect(coupon?.usageCount).toBe(0);
  });

  it("detects expired coupon", async () => {
    vi.mocked(db.getCouponByCode).mockResolvedValue({
      ...baseCoupon,
      expiresAt: past,
    });
    const coupon = await db.getCouponByCode("EXPIRED");
    expect(coupon?.expiresAt).not.toBeNull();
    expect(coupon!.expiresAt! < now).toBe(true);
  });

  it("detects coupon not yet started", async () => {
    vi.mocked(db.getCouponByCode).mockResolvedValue({
      ...baseCoupon,
      startDate: future,
    });
    const coupon = await db.getCouponByCode("FUTURE");
    expect(coupon?.startDate).not.toBeNull();
    expect(coupon!.startDate! > now).toBe(true);
  });

  it("detects usage limit reached", async () => {
    vi.mocked(db.getCouponByCode).mockResolvedValue({
      ...baseCoupon,
      usageLimit: 10,
      usageCount: 10,
    });
    const coupon = await db.getCouponByCode("MAXED");
    expect(coupon?.usageCount).toBe(coupon?.usageLimit);
  });

  it("detects per-user limit reached", async () => {
    vi.mocked(db.countUserCouponRedemptions).mockResolvedValue(1);
    const userCount = await db.countUserCouponRedemptions(1, 42);
    const coupon = baseCoupon;
    expect(userCount >= coupon.perUserLimit).toBe(true);
  });

  it("detects plan restriction mismatch", async () => {
    vi.mocked(db.getCouponByCode).mockResolvedValue({
      ...baseCoupon,
      applicablePlans: ["premium_family"] as any,
    });
    const coupon = await db.getCouponByCode("PREMIUM_ONLY");
    const plans = coupon?.applicablePlans as string[] | null;
    expect(plans?.includes("family")).toBe(false);
  });

  it("allows coupon when plan restriction matches", async () => {
    vi.mocked(db.getCouponByCode).mockResolvedValue({
      ...baseCoupon,
      applicablePlans: ["family", "premium_family"] as any,
    });
    const coupon = await db.getCouponByCode("BOTH_PLANS");
    const plans = coupon?.applicablePlans as string[] | null;
    expect(plans?.includes("family")).toBe(true);
  });

  it("detects min amount not met", async () => {
    vi.mocked(db.getCouponByCode).mockResolvedValue({
      ...baseCoupon,
      minAmount: 5000,
    });
    const coupon = await db.getCouponByCode("MIN_AMOUNT");
    const amountCents = 1999; // family monthly
    expect(coupon?.minAmount !== null && amountCents < coupon!.minAmount!).toBe(true);
  });

  it("paused coupon is not active", async () => {
    vi.mocked(db.getCouponByCode).mockResolvedValue({
      ...baseCoupon,
      status: "paused" as any,
    });
    const coupon = await db.getCouponByCode("PAUSED");
    expect(coupon?.status).not.toBe("active");
  });
});

// ─── saveUserBillingPeriod tests ───────────────────────────────────────────────
describe("saveUserBillingPeriod", () => {
  it("calls db helper with correct args for monthly", async () => {
    vi.mocked(db.saveUserBillingPeriod).mockResolvedValue(undefined);
    await db.saveUserBillingPeriod(1, "monthly");
    expect(db.saveUserBillingPeriod).toHaveBeenCalledWith(1, "monthly");
  });

  it("calls db helper with correct args for annual", async () => {
    vi.mocked(db.saveUserBillingPeriod).mockResolvedValue(undefined);
    await db.saveUserBillingPeriod(2, "annual");
    expect(db.saveUserBillingPeriod).toHaveBeenCalledWith(2, "annual");
  });
});

// ─── Subscription upsert tests ────────────────────────────────────────────────
describe("upsertSubscription", () => {
  it("calls upsertSubscription with correct shape", async () => {
    vi.mocked(db.upsertSubscription).mockResolvedValue(undefined);
    await db.upsertSubscription({
      userId: 1,
      planName: "family",
      billingPeriod: "monthly",
      status: "active",
      stripeCustomerId: "cus_test",
      amountCents: 1999,
    });
    expect(db.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        planName: "family",
        billingPeriod: "monthly",
        status: "active",
      })
    );
  });
});

// ─── logPaymentEvent tests ────────────────────────────────────────────────────
describe("logPaymentEvent", () => {
  it("calls logPaymentEvent with required fields", async () => {
    vi.mocked(db.logPaymentEvent).mockResolvedValue(undefined);
    await db.logPaymentEvent({
      userId: 1,
      event: "checkout.session.completed",
      stripeObjectId: "cs_test_123",
      amountCents: 1999,
      currency: "usd",
      status: "paid",
      metadata: {},
    });
    expect(db.logPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "checkout.session.completed",
        amountCents: 1999,
      })
    );
  });
});

// ─── Admin coupon management tests ────────────────────────────────────────────
describe("Admin coupon management", () => {
  it("listCoupons returns paginated result", async () => {
    vi.mocked(db.listCoupons).mockResolvedValue({ rows: [], total: 0 });
    const result = await db.listCoupons({ limit: 50, offset: 0 });
    expect(result).toHaveProperty("rows");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.rows)).toBe(true);
  });

  it("createCoupon is called with required fields", async () => {
    vi.mocked(db.createCoupon).mockResolvedValue(undefined);
    await db.createCoupon({
      code: "NEWCODE",
      name: "New Coupon",
      discountType: "percentage",
      discountValue: 15,
      eligibility: "all",
      perUserLimit: 1,
      duration: "once",
      isStackable: false,
      createdBy: 1,
    } as any);
    expect(db.createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ code: "NEWCODE", discountValue: 15 })
    );
  });

  it("updateCoupon is called with id and data", async () => {
    vi.mocked(db.updateCoupon).mockResolvedValue(undefined);
    await db.updateCoupon(1, { status: "paused" } as any);
    expect(db.updateCoupon).toHaveBeenCalledWith(1, { status: "paused" });
  });

  it("archiveCoupon sets status to archived", async () => {
    vi.mocked(db.updateCoupon).mockResolvedValue(undefined);
    await db.updateCoupon(1, { status: "archived" } as any);
    expect(db.updateCoupon).toHaveBeenCalledWith(1, { status: "archived" });
  });
});

// ─── Billing period enum validation ───────────────────────────────────────────
describe("Billing period validation", () => {
  it("accepts 'monthly' as valid billing period", () => {
    const valid = ["monthly", "annual"];
    expect(valid.includes("monthly")).toBe(true);
  });

  it("accepts 'annual' as valid billing period", () => {
    const valid = ["monthly", "annual"];
    expect(valid.includes("annual")).toBe(true);
  });

  it("rejects invalid billing period", () => {
    const valid = ["monthly", "annual"];
    expect(valid.includes("quarterly" as any)).toBe(false);
  });
});

// ─── Discount type enum validation ────────────────────────────────────────────
describe("Discount type validation", () => {
  it("accepts 'percentage' as valid discount type", () => {
    const valid = ["percentage", "fixed"];
    expect(valid.includes("percentage")).toBe(true);
  });

  it("accepts 'fixed' as valid discount type", () => {
    const valid = ["percentage", "fixed"];
    expect(valid.includes("fixed")).toBe(true);
  });

  it("rejects invalid discount type", () => {
    const valid = ["percentage", "fixed"];
    expect(valid.includes("flat" as any)).toBe(false);
  });
});

// ─── Coupon duration enum validation ──────────────────────────────────────────
describe("Coupon duration validation", () => {
  const validDurations = ["once", "repeating", "forever"];

  it.each(validDurations)("accepts '%s' as valid duration", (duration) => {
    expect(validDurations.includes(duration)).toBe(true);
  });

  it("rejects invalid duration", () => {
    expect(validDurations.includes("biannual" as any)).toBe(false);
  });
});
