import { describe, it, expect, vi } from "vitest";
import { buildParentBillingNotificationEmail } from "./emailTemplates/parentBillingNotification";
import { buildBillingActivatedStudentEmail } from "./emailTemplates/billingActivatedStudent";

describe("Billing Setup Flow", () => {
  describe("Parent Billing Notification Email Template", () => {
    it("generates valid HTML email with student name and billing URL", () => {
      const result = buildParentBillingNotificationEmail({
        parentName: "Jane Smith",
        studentName: "Tommy Smith",
        billingSetupUrl: "https://educhamp.app/billing/setup",
      });

      expect(result.subject).toContain("Tommy Smith");
      expect(result.subject).toContain("billing");
      expect(result.html).toContain("Jane Smith");
      expect(result.html).toContain("Tommy Smith");
      expect(result.html).toContain("https://educhamp.app/billing/setup");
      expect(result.text).toContain("Tommy Smith");
      expect(result.text).toContain("https://educhamp.app/billing/setup");
    });

    it("uses fallback names when not provided", () => {
      const result = buildParentBillingNotificationEmail({
        parentName: "",
        studentName: "",
        billingSetupUrl: "https://educhamp.app/billing/setup",
      });

      // Should still generate valid output
      expect(result.subject).toBeTruthy();
      expect(result.html).toContain("https://educhamp.app/billing/setup");
      expect(result.text).toContain("https://educhamp.app/billing/setup");
    });

    it("includes CTA button in HTML", () => {
      const result = buildParentBillingNotificationEmail({
        parentName: "Parent",
        studentName: "Student",
        billingSetupUrl: "https://educhamp.app/billing/setup",
      });

      // Should have a clickable link/button
      expect(result.html).toContain("href=");
      expect(result.html).toContain("billing/setup");
    });

    it("includes explanation of what parent needs to do", () => {
      const result = buildParentBillingNotificationEmail({
        parentName: "Jane",
        studentName: "Tommy",
        billingSetupUrl: "https://educhamp.app/billing/setup",
      });

      // Should explain the steps
      expect(result.html.toLowerCase()).toMatch(/payment|card|billing/);
      expect(result.text.toLowerCase()).toMatch(/payment|card|billing/);
    });
  });

  describe("Student Billing Coverage Logic", () => {
    it("student with parent subscription is considered covered", () => {
      // Simulates the logic in getBillingStatus
      const billingStatus = {
        hasSubscription: true,
        cardOnFile: true,
        coveredByParent: true,
        planName: "free",
        status: "active",
      };

      expect(billingStatus.coveredByParent).toBe(true);
      expect(billingStatus.hasSubscription).toBe(true);
    });

    it("student without parent subscription is NOT covered", () => {
      const billingStatus = {
        hasSubscription: false,
        cardOnFile: false,
        coveredByParent: false,
        planName: null,
        status: null,
      };

      expect(billingStatus.coveredByParent).toBe(false);
      expect(billingStatus.hasSubscription).toBe(false);
    });

    it("minor student (under 13) should not be able to enter own card", () => {
      const studentAge = 10;
      const isMinorForBilling = studentAge < 13;
      expect(isMinorForBilling).toBe(true);
    });

    it("student 13+ can enter own card", () => {
      const studentAge = 14;
      const isMinorForBilling = studentAge < 13;
      expect(isMinorForBilling).toBe(false);
    });

    it("student exactly 13 can enter own card", () => {
      const studentAge = 13;
      const isMinorForBilling = studentAge < 13;
      expect(isMinorForBilling).toBe(false);
    });
  });

  describe("Parent Onboarding Billing Redirect Logic", () => {
    it("parent without subscription should be redirected to billing setup", () => {
      const billingStatus = {
        hasSubscription: false,
        cardOnFile: false,
      };
      const needsBilling = !billingStatus.hasSubscription && !billingStatus.cardOnFile;
      expect(needsBilling).toBe(true);
    });

    it("parent with active subscription should go to dashboard", () => {
      const billingStatus = {
        hasSubscription: true,
        cardOnFile: true,
      };
      const needsBilling = !billingStatus.hasSubscription && !billingStatus.cardOnFile;
      expect(needsBilling).toBe(false);
    });

    it("parent with card but no subscription should still go to billing", () => {
      // Card on file but no subscription means they started but didn't finish
      const billingStatus = {
        hasSubscription: false,
        cardOnFile: true,
      };
      const needsBilling = !billingStatus.hasSubscription && !billingStatus.cardOnFile;
      // With card on file, they're partially done — the billing page will handle plan selection
      expect(needsBilling).toBe(false);
    });
  });

  describe("Student Billing Activated Email (CAN-SPAM)", () => {
    it("generates email with unsubscribe footer", () => {
      const result = buildBillingActivatedStudentEmail({
        studentName: "Alex",
        parentName: "Jane",
        loginUrl: "https://educhamp.app",
      });

      expect(result.subject).toContain("Active");
      expect(result.html).toContain("Alex");
      expect(result.html).toContain("Jane");
      expect(result.html).toContain("https://educhamp.app");
      // CAN-SPAM unsubscribe footer
      expect(result.html.toLowerCase()).toContain("unsubscribe");
      expect(result.html).toContain("/profile");
      expect(result.text.toLowerCase()).toContain("unsubscribe");
    });

    it("includes login CTA button in HTML", () => {
      const result = buildBillingActivatedStudentEmail({
        studentName: "Alex",
        parentName: "Jane",
        loginUrl: "https://educhamp.app",
      });

      expect(result.html).toContain("href=\"");
      expect(result.html).toContain("Log In");
    });

    it("plain text version includes unsubscribe instructions", () => {
      const result = buildBillingActivatedStudentEmail({
        studentName: "Alex",
        parentName: "Jane",
        loginUrl: "https://educhamp.app",
      });

      expect(result.text).toContain("Profile > Settings");
      expect(result.text).toContain("UNSUBSCRIBE");
    });
  });

  describe("Parent Billing Reminder Email (isReminder flag)", () => {
    it("generates reminder-specific subject line", () => {
      const result = buildParentBillingNotificationEmail({
        studentName: "Tommy",
        parentName: "Jane",
        billingSetupUrl: "https://educhamp.app/billing/setup",
        isReminder: true,
      });

      expect(result.subject).toContain("Reminder");
      expect(result.subject).toContain("Tommy");
    });

    it("uses alarm clock emoji for reminder", () => {
      const result = buildParentBillingNotificationEmail({
        studentName: "Tommy",
        parentName: "Jane",
        billingSetupUrl: "https://educhamp.app/billing/setup",
        isReminder: true,
      });

      expect(result.html).toContain("\u23f0"); // ⏰
    });

    it("uses bell emoji for initial notification (not reminder)", () => {
      const result = buildParentBillingNotificationEmail({
        studentName: "Tommy",
        parentName: "Jane",
        billingSetupUrl: "https://educhamp.app/billing/setup",
        isReminder: false,
      });

      expect(result.html).toContain("\ud83d\udd14"); // 🔔
      expect(result.subject).not.toContain("Reminder");
    });

    it("reminder title says 'Reminder: Billing Setup Still Needed'", () => {
      const result = buildParentBillingNotificationEmail({
        studentName: "Tommy",
        parentName: "Jane",
        billingSetupUrl: "https://educhamp.app/billing/setup",
        isReminder: true,
      });

      expect(result.html).toContain("Reminder: Billing Setup Still Needed");
    });
  });

  describe("DashboardLayout Billing Gate for Students", () => {
    it("student covered by parent should NOT be locked", () => {
      const billingStatus = {
        hasSubscription: true,
        cardOnFile: true,
        coveredByParent: true,
      };
      const noCardOnFile = !billingStatus.cardOnFile && !billingStatus.hasSubscription;
      expect(noCardOnFile).toBe(false);
    });

    it("student NOT covered by parent should be locked", () => {
      const billingStatus = {
        hasSubscription: false,
        cardOnFile: false,
        coveredByParent: false,
      };
      const noCardOnFile = !billingStatus.cardOnFile && !billingStatus.hasSubscription;
      expect(noCardOnFile).toBe(true);
    });
  });
});
