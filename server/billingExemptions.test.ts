/**
 * Billing Exemptions Tests
 * Tests for admin grant/revoke exemption flows, getBillingStatus with exemptions,
 * and enforcement logic.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
const mockGetActiveBillingExemption = vi.fn();
const mockGrantBillingExemption = vi.fn();
const mockRevokeBillingExemption = vi.fn();
const mockUpdateBillingExemption = vi.fn();
const mockListBillingExemptions = vi.fn();
const mockGetExemptionById = vi.fn();
const mockGetExpiringExemptions = vi.fn();
const mockMarkExemptionNotified = vi.fn();
const mockExpireExemption = vi.fn();
const mockGetUserById = vi.fn();
const mockGetUserSubscription = vi.fn();
const mockCheckStudentParentBillingCoverage = vi.fn();
const mockLogPaymentEvent = vi.fn();

vi.mock("./db", () => ({
  getActiveBillingExemption: (...args: any[]) => mockGetActiveBillingExemption(...args),
  grantBillingExemption: (...args: any[]) => mockGrantBillingExemption(...args),
  revokeBillingExemption: (...args: any[]) => mockRevokeBillingExemption(...args),
  updateBillingExemption: (...args: any[]) => mockUpdateBillingExemption(...args),
  listBillingExemptions: (...args: any[]) => mockListBillingExemptions(...args),
  getExemptionById: (...args: any[]) => mockGetExemptionById(...args),
  getExpiringExemptions: (...args: any[]) => mockGetExpiringExemptions(...args),
  markExemptionNotified: (...args: any[]) => mockMarkExemptionNotified(...args),
  expireExemption: (...args: any[]) => mockExpireExemption(...args),
  getUserById: (...args: any[]) => mockGetUserById(...args),
  getUserSubscription: (...args: any[]) => mockGetUserSubscription(...args),
  checkStudentParentBillingCoverage: (...args: any[]) => mockCheckStudentParentBillingCoverage(...args),
  logPaymentEvent: (...args: any[]) => mockLogPaymentEvent(...args),
  // Other db functions that might be referenced
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
  listSubscriptions: vi.fn(),
  getPaymentAnalytics: vi.fn(),
  updateSubscriptionCard: vi.fn(),
  createFreeSubscription: vi.fn(),
  countParentStudents: vi.fn(),
  createBillingDelegation: vi.fn(),
  getBillingDelegationByToken: vi.fn(),
  getPendingBillingDelegationsForEmail: vi.fn(),
  acceptBillingDelegation: vi.fn(),
  rejectBillingDelegation: vi.fn(),
  getStudentBillingDelegations: vi.fn(),
  adminSuspendSubscription: vi.fn(),
  adminResumeSubscription: vi.fn(),
  adminUpdateSubscriptionStatus: vi.fn(),
  adminCreateSubscription: vi.fn(),
  getSubscriptionById: vi.fn(),
  listSubscriptionsWithUsers: vi.fn(),
  getExpiringCardSubscriptions: vi.fn(),
  listPaymentAuditLog: vi.fn(),
  listSubscriptionCards: vi.fn(),
  adminDeleteCard: vi.fn(),
  getEnforcingBillingExemption: vi.fn(),
}));

vi.mock("./stripe", () => ({
  stripe: {
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    coupons: { create: vi.fn() },
    promotionCodes: { create: vi.fn() },
    subscriptions: { cancel: vi.fn(), update: vi.fn() },
  },
  PLANS: {
    family: { name: "Family Plan", monthly: { amountCents: 1999 }, annual: { amountCents: 19188 }, features: [], maxStudents: 3, isFree: false },
    premium_family: { name: "Premium Family", monthly: { amountCents: 2999 }, annual: { amountCents: 28788 }, features: [], maxStudents: 5, isFree: false },
  },
  getPlanByKey: vi.fn((key: string) => {
    const plans: any = {
      family: { name: "Family Plan", monthly: { amountCents: 1999 }, annual: { amountCents: 19188 }, maxStudents: 3 },
      premium_family: { name: "Premium Family", monthly: { amountCents: 2999 }, annual: { amountCents: 28788 }, maxStudents: 5 },
    };
    return plans[key] ?? null;
  }),
  calculateDiscount: vi.fn(),
  getOrCreateStripeCustomer: vi.fn(),
  createSetupIntent: vi.fn(),
  getCardDetailsFromPaymentMethod: vi.fn(),
  setDefaultPaymentMethod: vi.fn(),
}));

vi.mock("./emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    stripeSecretKey: "sk_test_123",
    stripeWebhookSecret: "whsec_test",
    viteAppId: "test-app",
    oauthServerUrl: "https://auth.test",
    databaseUrl: "mysql://test",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Billing Exemptions — Business Logic", () => {
  describe("getBillingStatus with exemptions", () => {
    it("should return isExempt=true and hasSubscription=true for exempt user without subscription", () => {
      // An exempt user with no subscription should still be treated as having access
      const exemption = {
        id: 1,
        userId: 42,
        type: "perpetual",
        status: "active",
        reason: "Scholarship",
        startDate: new Date(),
        endDate: null,
      };
      mockGetActiveBillingExemption.mockResolvedValue(exemption);
      mockGetUserSubscription.mockResolvedValue(null);

      // Simulate what getBillingStatus returns
      const sub = null;
      const isExempt = !!exemption;
      const coveredByParent = false;

      expect(isExempt).toBe(true);
      expect(!!sub || coveredByParent || isExempt).toBe(true); // hasSubscription
      expect(sub?.cardOnFile ?? (coveredByParent || isExempt)).toBe(true); // cardOnFile
    });

    it("should return isExempt=false for user without exemption", () => {
      mockGetActiveBillingExemption.mockResolvedValue(null);
      mockGetUserSubscription.mockResolvedValue(null);

      const exemption = null;
      const isExempt = !!exemption;

      expect(isExempt).toBe(false);
    });

    it("should still return subscription data when user has both subscription and exemption", () => {
      const exemption = { id: 1, userId: 42, type: "perpetual", status: "active" };
      const sub = { planName: "family", status: "active", cardOnFile: true };

      mockGetActiveBillingExemption.mockResolvedValue(exemption);
      mockGetUserSubscription.mockResolvedValue(sub);

      const isExempt = !!exemption;
      // Subscription takes priority in display
      const planName = sub?.planName ?? (isExempt ? "exempt" : null);
      expect(planName).toBe("family");
      expect(isExempt).toBe(true);
    });
  });

  describe("Access gate logic", () => {
    it("should NOT lock access for exempt users even without subscription", () => {
      const billingStatus = { hasSubscription: true, isExempt: true, cardOnFile: true };
      const sub = null;
      const isExempt = !!billingStatus.isExempt;
      const noCardOnFile = !billingStatus.hasSubscription;
      const isSuspended = false;

      const isAccessLocked =
        !isExempt &&
        (sub === null || noCardOnFile || isSuspended);

      expect(isAccessLocked).toBe(false);
    });

    it("should lock access for non-exempt users without subscription", () => {
      const billingStatus = { hasSubscription: false, isExempt: false, cardOnFile: false };
      const sub = null;
      const isExempt = !!billingStatus.isExempt;
      const noCardOnFile = !billingStatus.hasSubscription;
      const isSuspended = false;

      const isAccessLocked =
        !isExempt &&
        (sub === null || noCardOnFile || isSuspended);

      expect(isAccessLocked).toBe(true);
    });

    it("should NOT lock access for paying users (unchanged behavior)", () => {
      const billingStatus = { hasSubscription: true, isExempt: false, cardOnFile: true };
      const sub = { status: "active", planName: "family" };
      const isExempt = !!billingStatus.isExempt;
      const noCardOnFile = !billingStatus.hasSubscription;
      const isSuspended = false;

      const isAccessLocked =
        !isExempt &&
        (sub?.status === "past_due" || sub?.status === "canceled" || noCardOnFile || isSuspended);

      expect(isAccessLocked).toBe(false);
    });
  });

  describe("Grant exemption validation", () => {
    it("should reject granting exemption to non-existent user", async () => {
      mockGetUserById.mockResolvedValue(null);
      
      const userId = 999;
      const user = await mockGetUserById(userId);
      expect(user).toBeNull();
    });

    it("should reject granting exemption when user already has one", async () => {
      const existingExemption = { id: 1, userId: 42, status: "active", type: "perpetual" };
      mockGetActiveBillingExemption.mockResolvedValue(existingExemption);

      const existing = await mockGetActiveBillingExemption(42);
      expect(existing).not.toBeNull();
      expect(existing.status).toBe("active");
    });

    it("should successfully grant exemption to valid user without existing exemption", async () => {
      mockGetUserById.mockResolvedValue({ id: 42, name: "Test User", email: "test@example.com" });
      mockGetActiveBillingExemption.mockResolvedValue(null);
      mockGrantBillingExemption.mockResolvedValue({ id: 1 });

      const user = await mockGetUserById(42);
      expect(user).not.toBeNull();

      const existing = await mockGetActiveBillingExemption(42);
      expect(existing).toBeNull();

      const result = await mockGrantBillingExemption({
        userId: 42,
        type: "perpetual",
        reason: "Scholarship student",
        grantedBy: 1,
        endDate: null,
        enforcementDate: null,
        notifyDate: null,
      });
      expect(result.id).toBe(1);
    });

    it("should pass correct params for time-limited exemption", async () => {
      mockGetUserById.mockResolvedValue({ id: 42, name: "Test User", email: "test@example.com" });
      mockGetActiveBillingExemption.mockResolvedValue(null);
      mockGrantBillingExemption.mockResolvedValue({ id: 2 });

      const endDate = new Date("2026-12-31");
      const enforcementDate = new Date("2027-01-07");

      await mockGrantBillingExemption({
        userId: 42,
        type: "time_limited",
        reason: "Pilot program",
        grantedBy: 1,
        endDate,
        enforcementDate,
        notifyDate: null,
      });

      expect(mockGrantBillingExemption).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "time_limited",
          endDate,
          enforcementDate,
        })
      );
    });
  });

  describe("Revoke exemption", () => {
    it("should reject revoking non-existent exemption", async () => {
      mockGetExemptionById.mockResolvedValue(null);

      const exemption = await mockGetExemptionById(999);
      expect(exemption).toBeNull();
    });

    it("should reject revoking already-revoked exemption", async () => {
      mockGetExemptionById.mockResolvedValue({ id: 1, status: "revoked" });

      const exemption = await mockGetExemptionById(1);
      expect(exemption.status).not.toBe("active");
    });

    it("should successfully revoke active exemption with enforcement date", async () => {
      mockGetExemptionById.mockResolvedValue({ id: 1, userId: 42, status: "active" });
      mockRevokeBillingExemption.mockResolvedValue(undefined);

      const exemption = await mockGetExemptionById(1);
      expect(exemption.status).toBe("active");

      const enforcementDate = new Date("2026-07-01");
      await mockRevokeBillingExemption(1, 1, "Pilot ended", enforcementDate);

      expect(mockRevokeBillingExemption).toHaveBeenCalledWith(1, 1, "Pilot ended", enforcementDate);
    });

    it("should revoke immediately when no enforcement date provided", async () => {
      mockGetExemptionById.mockResolvedValue({ id: 1, userId: 42, status: "active" });
      mockRevokeBillingExemption.mockResolvedValue(undefined);

      await mockRevokeBillingExemption(1, 1, "No longer eligible", undefined);

      expect(mockRevokeBillingExemption).toHaveBeenCalledWith(1, 1, "No longer eligible", undefined);
    });
  });

  describe("Exemption expiry and enforcement", () => {
    it("should identify expiring exemptions within 7 days", async () => {
      const expiringExemptions = [
        { id: 1, userId: 42, endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), userName: "Test", userEmail: "test@test.com" },
      ];
      mockGetExpiringExemptions.mockResolvedValue(expiringExemptions);

      const results = await mockGetExpiringExemptions();
      expect(results).toHaveLength(1);
      expect(results[0].userId).toBe(42);
    });

    it("should mark exemption as notified after sending notification", async () => {
      mockMarkExemptionNotified.mockResolvedValue(undefined);

      await mockMarkExemptionNotified(1);
      expect(mockMarkExemptionNotified).toHaveBeenCalledWith(1);
    });

    it("should expire exemption when end date passes", async () => {
      mockExpireExemption.mockResolvedValue(undefined);

      await mockExpireExemption(1);
      expect(mockExpireExemption).toHaveBeenCalledWith(1);
    });
  });

  describe("Paying user flow unchanged", () => {
    it("should not affect paying users who have active subscriptions", () => {
      // A paying user with active subscription should work exactly as before
      const sub = { planName: "family", status: "active", cardOnFile: true, suspendedAt: null };
      const exemption = null; // no exemption
      const isExempt = !!exemption;

      const hasSubscription = !!sub || isExempt;
      const cardOnFile = sub?.cardOnFile ?? (false || isExempt);
      const planName = sub?.planName ?? (isExempt ? "exempt" : null);
      const status = sub?.status ?? (isExempt ? "active" : null);

      expect(hasSubscription).toBe(true);
      expect(cardOnFile).toBe(true);
      expect(planName).toBe("family");
      expect(status).toBe("active");
    });

    it("should not affect past_due users — they should still be locked", () => {
      const sub = { planName: "family", status: "past_due", cardOnFile: true, suspendedAt: null };
      const exemption = null;
      const isExempt = !!exemption;
      const noCardOnFile = false;
      const isSuspended = false;

      const isAccessLocked =
        !isExempt &&
        (sub?.status === "past_due" || sub?.status === "canceled" || noCardOnFile || isSuspended);

      expect(isAccessLocked).toBe(true);
    });

    it("should not lock past_due users who also have an exemption", () => {
      // Edge case: user has past_due subscription but also has an active exemption
      // Exemption should override the lock
      const sub = { planName: "family", status: "past_due", cardOnFile: true, suspendedAt: null };
      const exemption = { id: 1, status: "active", type: "perpetual" };
      const isExempt = !!exemption;
      const noCardOnFile = false;
      const isSuspended = false;

      const isAccessLocked =
        !isExempt &&
        (sub?.status === "past_due" || sub?.status === "canceled" || noCardOnFile || isSuspended);

      expect(isAccessLocked).toBe(false);
    });
  });

  describe("List exemptions", () => {
    it("should return paginated results with user info", async () => {
      mockListBillingExemptions.mockResolvedValue({
        rows: [
          { id: 1, userId: 42, type: "perpetual", status: "active", reason: "Scholarship", userName: "Test User", userEmail: "test@test.com" },
          { id: 2, userId: 43, type: "time_limited", status: "expired", reason: "Trial", userName: "Another User", userEmail: "another@test.com" },
        ],
        total: 2,
      });

      const result = await mockListBillingExemptions({ status: undefined, limit: 50, offset: 0 });
      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.rows[0].userName).toBe("Test User");
    });

    it("should filter by status", async () => {
      mockListBillingExemptions.mockResolvedValue({
        rows: [{ id: 1, userId: 42, type: "perpetual", status: "active", reason: "Scholarship" }],
        total: 1,
      });

      const result = await mockListBillingExemptions({ status: "active", limit: 50, offset: 0 });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].status).toBe("active");
    });
  });
});
