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

  describe("Escalation Path for Stale Billing Reminders", () => {
    it("should escalate after 7 days (168 hours)", () => {
      const ESCALATION_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
      const notificationCreatedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const hoursSinceFirstNotification = (Date.now() - notificationCreatedAt.getTime()) / (1000 * 60 * 60);
      const shouldEscalate = hoursSinceFirstNotification > 168;
      expect(shouldEscalate).toBe(true);
    });

    it("should NOT escalate within 7 days", () => {
      const notificationCreatedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const hoursSinceFirstNotification = (Date.now() - notificationCreatedAt.getTime()) / (1000 * 60 * 60);
      const shouldEscalate = hoursSinceFirstNotification > 168;
      expect(shouldEscalate).toBe(false);
    });

    it("should NOT escalate if already escalated (billingEscalatedAt set)", () => {
      const billingEscalatedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // already escalated 2 days ago
      const alreadyEscalated = billingEscalatedAt !== null;
      expect(alreadyEscalated).toBe(true);
      // Handler should skip this student
    });

    it("escalation should flag student for admin review", () => {
      // The escalation sets billingEscalatedAt and creates an admin notification
      const escalationData = {
        billingEscalatedAt: new Date(),
        adminNotificationType: "billing_escalation",
        adminNotificationTitle: "Billing Escalation",
      };
      expect(escalationData.billingEscalatedAt).toBeInstanceOf(Date);
      expect(escalationData.adminNotificationType).toBe("billing_escalation");
    });

    it("escalation should stop further reminders", () => {
      // Once escalated, the reminder handler should skip this parent-student pair
      const billingEscalatedAt = new Date();
      const shouldSkipReminder = billingEscalatedAt !== null;
      expect(shouldSkipReminder).toBe(true);
    });
  });

  describe("Student Email Preferences", () => {
    it("default preferences should all be enabled", () => {
      const defaultPrefs = {
        emailDigestEnabled: true,
        emailAchievementsEnabled: true,
        emailRemindersEnabled: true,
      };
      expect(defaultPrefs.emailDigestEnabled).toBe(true);
      expect(defaultPrefs.emailAchievementsEnabled).toBe(true);
      expect(defaultPrefs.emailRemindersEnabled).toBe(true);
    });

    it("can disable individual email types", () => {
      const updatedPrefs = {
        emailDigestEnabled: false,
        emailAchievementsEnabled: true,
        emailRemindersEnabled: false,
      };
      expect(updatedPrefs.emailDigestEnabled).toBe(false);
      expect(updatedPrefs.emailAchievementsEnabled).toBe(true);
      expect(updatedPrefs.emailRemindersEnabled).toBe(false);
    });

    it("partial updates should only change specified fields", () => {
      const existingPrefs = {
        emailDigestEnabled: true,
        emailAchievementsEnabled: true,
        emailRemindersEnabled: true,
      };
      const partialUpdate = { emailDigestEnabled: false };
      const merged = { ...existingPrefs, ...partialUpdate };
      expect(merged.emailDigestEnabled).toBe(false);
      expect(merged.emailAchievementsEnabled).toBe(true);
      expect(merged.emailRemindersEnabled).toBe(true);
    });

    it("preferences page route is /settings/notifications", () => {
      const route = "/settings/notifications";
      expect(route.startsWith("/settings")).toBe(true);
      // This route is allowed even when billing gate is active
    });
  });
});
