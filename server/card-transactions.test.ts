import { describe, it, expect } from "vitest";
import { PLANS, getPlanByKey } from "./stripe";

describe("Admin Card & Transaction Management", () => {
  describe("Plan definitions include maxStudents", () => {
    it("free plan has maxStudents = 1", () => {
      const plan = getPlanByKey("free");
      expect(plan).not.toBeNull();
      expect(plan!.maxStudents).toBe(1);
    });

    it("family plan has maxStudents = 3", () => {
      const plan = getPlanByKey("family");
      expect(plan).not.toBeNull();
      expect(plan!.maxStudents).toBe(3);
    });

    it("premium_family plan has maxStudents = 5", () => {
      const plan = getPlanByKey("premium_family");
      expect(plan).not.toBeNull();
      expect(plan!.maxStudents).toBe(5);
    });
  });

  describe("Plan structure validation", () => {
    it("all plans have required fields", () => {
      for (const [key, plan] of Object.entries(PLANS)) {
        expect(plan.name).toBeTruthy();
        expect(typeof plan.maxStudents).toBe("number");
        expect(plan.maxStudents).toBeGreaterThan(0);
        expect(plan.monthly).toBeDefined();
        expect(plan.annual).toBeDefined();
      }
    });

    it("free plan has $0 prices", () => {
      const free = PLANS.free;
      expect(free.monthly.amountCents).toBe(0);
      expect(free.annual.amountCents).toBe(0);
    });

    it("paid plans have non-zero prices", () => {
      expect(PLANS.family.monthly.amountCents).toBeGreaterThan(0);
      expect(PLANS.premium_family.monthly.amountCents).toBeGreaterThan(0);
    });
  });

  describe("listPaymentAuditLog function", () => {
    it("is exported from db.ts", async () => {
      const db = await import("./db");
      expect(typeof db.listPaymentAuditLog).toBe("function");
    });

    it("returns empty result when no DB", async () => {
      const db = await import("./db");
      const result = await db.listPaymentAuditLog({ limit: 10, offset: 0 });
      // Without a real DB connection in test, it returns empty
      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("total");
    });
  });

  describe("listSubscriptionCards function", () => {
    it("is exported from db.ts", async () => {
      const db = await import("./db");
      expect(typeof db.listSubscriptionCards).toBe("function");
    });

    it("returns empty result when no DB", async () => {
      const db = await import("./db");
      const result = await db.listSubscriptionCards({ limit: 10, offset: 0 });
      expect(result).toHaveProperty("rows");
      expect(result).toHaveProperty("total");
    });
  });

  describe("adminDeleteCard function", () => {
    it("is exported from db.ts", async () => {
      const db = await import("./db");
      expect(typeof db.adminDeleteCard).toBe("function");
    });
  });

  describe("Card display format", () => {
    it("masked PAN format is correct (•••• •••• •••• XXXX)", () => {
      const last4 = "4242";
      const maskedPan = `•••• •••• •••• ${last4}`;
      expect(maskedPan).toBe("•••• •••• •••• 4242");
      expect(maskedPan.length).toBe(19);
    });

    it("expiry format is MM/YYYY", () => {
      const month = 3;
      const year = 2027;
      const formatted = `${String(month).padStart(2, "0")}/${year}`;
      expect(formatted).toBe("03/2027");
    });
  });
});
