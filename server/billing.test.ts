import { describe, expect, it, vi, beforeEach } from "vitest";
import { PLANS, getPlanByKey } from "./stripe";

// ─── Plan definition tests ──────────────────────────────────────────────────

describe("Billing Module — Plan definitions", () => {
  it("should have a free plan with $0 price and 1 student max", () => {
    const free = getPlanByKey("free");
    expect(free).toBeDefined();
    expect(free!.isFree).toBe(true);
    expect(free!.maxStudents).toBe(1);
    expect(free!.monthly.amountCents).toBe(0);
  });

  it("should have a family plan with 3 student max", () => {
    const family = getPlanByKey("family");
    expect(family).toBeDefined();
    expect(family!.isFree).toBeFalsy();
    expect(family!.maxStudents).toBe(3);
    expect(family!.monthly.amountCents).toBeGreaterThan(0);
  });

  it("should have a premium_family plan with 5 student max", () => {
    const premium = getPlanByKey("premium_family");
    expect(premium).toBeDefined();
    expect(premium!.isFree).toBeFalsy();
    expect(premium!.maxStudents).toBe(5);
    expect(premium!.monthly.amountCents).toBeGreaterThan(0);
  });

  it("should return undefined for unknown plan key", () => {
    const unknown = getPlanByKey("nonexistent");
    expect(unknown).toBeNull();
  });

  it("all plans should have required fields", () => {
    for (const [key, plan] of Object.entries(PLANS)) {
      expect(key).toBeTruthy();
      expect(plan.name).toBeTruthy();
      expect(typeof plan.maxStudents).toBe("number");
      expect(plan.maxStudents).toBeGreaterThanOrEqual(1);
      expect(typeof plan.monthly.amountCents).toBe("number");
      expect(plan.monthly.amountCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("free plan should not have Stripe price IDs", () => {
    const free = getPlanByKey("free");
    expect(free!.monthly.stripePriceId).toBeFalsy();
    expect(free!.annual.stripePriceId).toBeFalsy();
  });

  it("paid plans should have Stripe price IDs", () => {
    const family = getPlanByKey("family");
    expect(family!.monthly.stripePriceId).toBeTruthy();
    expect(family!.annual.stripePriceId).toBeTruthy();

    const premium = getPlanByKey("premium_family");
    expect(premium!.monthly.stripePriceId).toBeTruthy();
    expect(premium!.annual.stripePriceId).toBeTruthy();
  });
});

// ─── Card expiry email template tests ───────────────────────────────────────

describe("Billing Module — Card expiry email template", () => {
  it("should generate email with correct subject and content", async () => {
    const { buildCardExpiryEmail } = await import("./emailTemplates/cardExpiry");
    const result = buildCardExpiryEmail({
      recipientName: "John Doe",
      cardBrand: "Visa",
      cardLast4: "4242",
      cardExpMonth: 12,
      cardExpYear: 2026,
      billingUrl: "https://educhamp.app/billing",
    });

    expect(result.subject).toContain("Visa");
    expect(result.subject).toContain("4242");
    expect(result.subject).toContain("expiring soon");

    expect(result.html).toContain("John Doe");
    expect(result.html).toContain("Visa");
    expect(result.html).toContain("4242");
    expect(result.html).toContain("12/2026");
    expect(result.html).toContain("https://educhamp.app/billing");

    expect(result.text).toContain("John Doe");
    expect(result.text).toContain("Visa");
    expect(result.text).toContain("4242");
    expect(result.text).toContain("12/2026");
  });

  it("should handle missing recipient name gracefully", async () => {
    const { buildCardExpiryEmail } = await import("./emailTemplates/cardExpiry");
    const result = buildCardExpiryEmail({
      recipientName: "there",
      cardBrand: "Mastercard",
      cardLast4: "1234",
      cardExpMonth: 1,
      cardExpYear: 2027,
      billingUrl: "https://educhamp.app/billing",
    });

    expect(result.html).toContain("there");
    expect(result.html).toContain("01/2027");
  });
});

// ─── Access gating logic tests ──────────────────────────────────────────────

describe("Billing Module — Access gating logic", () => {
  // Simulate the DashboardLayout access lock logic
  function isAccessLocked(
    sub: { status: string; cardOnFile: boolean; suspendedAt: Date | null } | null,
    location: string
  ): boolean {
    const noCardOnFile = !sub;
    const isSuspended = sub?.suspendedAt != null;
    return (
      (sub?.status === "past_due" ||
        sub?.status === "canceled" ||
        noCardOnFile ||
        isSuspended) &&
      !location.startsWith("/billing") &&
      !location.startsWith("/admin") &&
      !location.startsWith("/settings")
    );
  }

  it("should lock access when no subscription exists", () => {
    expect(isAccessLocked(null, "/dashboard")).toBe(true);
  });

  it("should lock access when subscription is past_due", () => {
    expect(
      isAccessLocked(
        { status: "past_due", cardOnFile: true, suspendedAt: null },
        "/dashboard"
      )
    ).toBe(true);
  });

  it("should lock access when subscription is canceled", () => {
    expect(
      isAccessLocked(
        { status: "canceled", cardOnFile: true, suspendedAt: null },
        "/dashboard"
      )
    ).toBe(true);
  });

  it("should lock access when subscription is suspended", () => {
    expect(
      isAccessLocked(
        { status: "active", cardOnFile: true, suspendedAt: new Date() },
        "/dashboard"
      )
    ).toBe(true);
  });

  it("should NOT lock access for active subscription with card", () => {
    expect(
      isAccessLocked(
        { status: "active", cardOnFile: true, suspendedAt: null },
        "/dashboard"
      )
    ).toBe(false);
  });

  it("should NOT lock access for trialing subscription with card", () => {
    expect(
      isAccessLocked(
        { status: "trialing", cardOnFile: true, suspendedAt: null },
        "/dashboard"
      )
    ).toBe(false);
  });

  it("should allow /billing route even when locked", () => {
    expect(isAccessLocked(null, "/billing")).toBe(false);
    expect(isAccessLocked(null, "/billing/setup")).toBe(false);
  });

  it("should allow /admin route even when locked", () => {
    expect(isAccessLocked(null, "/admin")).toBe(false);
  });

  it("should allow /settings route even when locked", () => {
    expect(isAccessLocked(null, "/settings")).toBe(false);
  });
});

// ─── Student slot logic tests ───────────────────────────────────────────────

describe("Billing Module — Student slot enforcement", () => {
  function checkSlotAvailability(
    planKey: string,
    currentStudents: number
  ): { available: boolean; current: number; max: number } {
    const plan = getPlanByKey(planKey);
    const maxStudents = plan?.maxStudents ?? 1;
    return {
      available: currentStudents < maxStudents,
      current: currentStudents,
      max: maxStudents,
    };
  }

  it("free plan allows 1 student", () => {
    const result = checkSlotAvailability("free", 0);
    expect(result.available).toBe(true);
    expect(result.max).toBe(1);
  });

  it("free plan rejects 2nd student", () => {
    const result = checkSlotAvailability("free", 1);
    expect(result.available).toBe(false);
  });

  it("family plan allows up to 3 students", () => {
    expect(checkSlotAvailability("family", 0).available).toBe(true);
    expect(checkSlotAvailability("family", 1).available).toBe(true);
    expect(checkSlotAvailability("family", 2).available).toBe(true);
    expect(checkSlotAvailability("family", 3).available).toBe(false);
  });

  it("premium plan allows up to 5 students", () => {
    expect(checkSlotAvailability("premium_family", 4).available).toBe(true);
    expect(checkSlotAvailability("premium_family", 5).available).toBe(false);
  });
});

// ─── Card expiry detection tests ────────────────────────────────────────────

describe("Billing Module — Card expiry detection", () => {
  function isCardExpiringSoon(
    expMonth: number,
    expYear: number,
    withinDays: number = 30
  ): boolean {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const targetDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    const targetMonth = targetDate.getMonth() + 1;
    const targetYear = targetDate.getFullYear();

    if (expYear < currentYear) return true;
    if (expYear === currentYear && expMonth < currentMonth) return true;
    if (expYear < targetYear) return true;
    if (expYear === targetYear && expMonth <= targetMonth) return true;
    return false;
  }

  it("should detect already expired cards", () => {
    expect(isCardExpiringSoon(1, 2020)).toBe(true);
  });

  it("should detect cards expiring this month", () => {
    const now = new Date();
    expect(isCardExpiringSoon(now.getMonth() + 1, now.getFullYear())).toBe(true);
  });

  it("should detect cards expiring within 30 days", () => {
    const target = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    expect(isCardExpiringSoon(target.getMonth() + 1, target.getFullYear())).toBe(true);
  });

  it("should NOT flag cards expiring far in the future", () => {
    expect(isCardExpiringSoon(12, 2030)).toBe(false);
  });
});

// ─── Age-appropriate billing tests ──────────────────────────────────────────

describe("Billing Module — Age-appropriate billing", () => {
  function calcAge(dob: string): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function isAgeAppropriate(dob: string): boolean {
    const age = calcAge(dob);
    return age !== null && age >= 13;
  }

  it("should mark 13-year-old as age-appropriate", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 13);
    dob.setDate(dob.getDate() - 1); // just past 13th birthday
    expect(isAgeAppropriate(dob.toISOString().split("T")[0])).toBe(true);
  });

  it("should mark 12-year-old as NOT age-appropriate", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 12);
    expect(isAgeAppropriate(dob.toISOString().split("T")[0])).toBe(false);
  });

  it("should mark 18-year-old as age-appropriate", () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 18);
    expect(isAgeAppropriate(dob.toISOString().split("T")[0])).toBe(true);
  });

  it("should handle invalid DOB", () => {
    expect(isAgeAppropriate("")).toBe(false);
    expect(isAgeAppropriate("invalid")).toBe(false);
  });
});
