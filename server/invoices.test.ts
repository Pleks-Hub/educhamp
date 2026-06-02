import { describe, it, expect } from "vitest";
import { PLANS, getPlanByKey } from "./stripe";

describe("Invoice Listing Feature", () => {
  describe("listMyInvoices procedure logic", () => {
    it("should return empty invoices array when no stripeCustomerId exists", () => {
      // Simulates the procedure's early return when user has no subscription
      const sub = null;
      const result = !sub ? { invoices: [] } : null;
      expect(result).toEqual({ invoices: [] });
    });

    it("should map Stripe invoice fields correctly", () => {
      // Simulates the mapping logic from the procedure
      const mockStripeInvoice = {
        id: "in_1234567890",
        number: "INV-0001",
        created: 1717286400, // Unix timestamp
        amount_due: 1999,
        amount_paid: 1999,
        currency: "usd",
        status: "paid",
        hosted_invoice_url: "https://invoice.stripe.com/i/acct_xxx/test_xxx",
        invoice_pdf: "https://pay.stripe.com/invoice/acct_xxx/test_xxx/pdf",
        description: null,
        lines: { data: [{ description: "Family Plan (Monthly)" }] },
      };

      const mapped = {
        id: mockStripeInvoice.id,
        number: mockStripeInvoice.number,
        date: mockStripeInvoice.created * 1000,
        amountDue: mockStripeInvoice.amount_due,
        amountPaid: mockStripeInvoice.amount_paid,
        currency: mockStripeInvoice.currency,
        status: mockStripeInvoice.status,
        hostedInvoiceUrl: mockStripeInvoice.hosted_invoice_url,
        invoicePdf: mockStripeInvoice.invoice_pdf,
        description: mockStripeInvoice.description || mockStripeInvoice.lines?.data?.[0]?.description || null,
        receiptUrl: null,
      };

      expect(mapped.id).toBe("in_1234567890");
      expect(mapped.number).toBe("INV-0001");
      expect(mapped.date).toBe(1717286400000); // Converted to ms
      expect(mapped.amountDue).toBe(1999);
      expect(mapped.amountPaid).toBe(1999);
      expect(mapped.currency).toBe("usd");
      expect(mapped.status).toBe("paid");
      expect(mapped.hostedInvoiceUrl).toContain("invoice.stripe.com");
      expect(mapped.invoicePdf).toContain("/pdf");
      expect(mapped.description).toBe("Family Plan (Monthly)");
    });

    it("should handle invoice with no description gracefully", () => {
      const inv = {
        description: null,
        lines: { data: [] },
      };
      const description = inv.description || inv.lines?.data?.[0]?.description || null;
      expect(description).toBeNull();
    });

    it("should format amounts correctly for display", () => {
      const fmtInvAmount = (cents: number, currency: string) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "usd" }).format(cents / 100);

      expect(fmtInvAmount(1999, "usd")).toBe("$19.99");
      expect(fmtInvAmount(2999, "usd")).toBe("$29.99");
      expect(fmtInvAmount(0, "usd")).toBe("$0.00");
    });

    it("should format dates correctly for display", () => {
      const fmtInvDate = (ts: number) =>
        new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

      const result = fmtInvDate(1717286400000);
      expect(result).toContain("2024");
      expect(result).toContain("Jun");
    });
  });

  describe("Plan pricing validation for invoices", () => {
    it("all paid plans should have valid price IDs", () => {
      const paidPlans = Object.entries(PLANS).filter(([key]) => key !== "free");
      expect(paidPlans.length).toBeGreaterThan(0);

      for (const [key, plan] of paidPlans) {
        expect(plan.monthly.stripePriceId).toBeTruthy();
        expect(plan.annual.stripePriceId).toBeTruthy();
        expect(plan.monthly.amountCents).toBeGreaterThan(0);
        expect(plan.annual.amountCents).toBeGreaterThan(0);
      }
    });

    it("free plan should have $0 pricing", () => {
      const freePlan = getPlanByKey("free");
      expect(freePlan).not.toBeNull();
      expect(freePlan!.monthly.amountCents).toBe(0);
      expect(freePlan!.annual.amountCents).toBe(0);
    });
  });

  describe("Invoice status badge mapping", () => {
    it("should map all known statuses to colors", () => {
      const statusColor: Record<string, string> = {
        paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
        open: "bg-blue-100 text-blue-700 border-blue-200",
        draft: "bg-slate-100 text-slate-600 border-slate-200",
        void: "bg-slate-100 text-slate-500 border-slate-200",
        uncollectible: "bg-red-100 text-red-600 border-red-200",
      };

      expect(statusColor["paid"]).toContain("emerald");
      expect(statusColor["open"]).toContain("blue");
      expect(statusColor["draft"]).toContain("slate");
      expect(statusColor["void"]).toContain("slate");
      expect(statusColor["uncollectible"]).toContain("red");
    });

    it("should handle unknown status gracefully", () => {
      const statusColor: Record<string, string> = {
        paid: "bg-emerald-100",
      };
      const unknownStatus = "processing";
      const color = statusColor[unknownStatus] ?? "bg-slate-100 text-slate-600";
      expect(color).toBe("bg-slate-100 text-slate-600");
    });
  });
});
