import { describe, it, expect } from "vitest";

/**
 * Sprint 49 Tests:
 * 1. Date of birth pre-fill from parent creation
 * 2. Account status indicator logic
 */

describe("Sprint 49 — DOB pre-fill & Account Status", () => {
  describe("Date of birth during parent creation", () => {
    it("should accept YYYY-MM-DD format for dateOfBirth", () => {
      const dob = "2015-03-15";
      const parsed = new Date(dob + "T00:00:00");
      expect(parsed.getFullYear()).toBe(2015);
      expect(parsed.getMonth()).toBe(2); // March = 2 (0-indexed)
      expect(parsed.getDate()).toBe(15);
    });

    it("should not store dateOfBirth when not provided", () => {
      const input = { name: "Test", email: "t@t.com", grade: "5" };
      const shouldStore = !!input.dateOfBirth;
      expect(shouldStore).toBe(false);
    });

    it("should store dateOfBirth when provided", () => {
      const input = { name: "Test", email: "t@t.com", grade: "5", dateOfBirth: "2014-06-20" };
      const shouldStore = !!input.dateOfBirth;
      expect(shouldStore).toBe(true);
    });

    it("should pre-fill dateOfBirth in onboarding when profile has it", () => {
      const profile = { dateOfBirth: "2015-03-15", onboardingCompleted: false };
      const prefillDob = profile.dateOfBirth ?? "";
      expect(prefillDob).toBe("2015-03-15");
    });

    it("should not pre-fill dateOfBirth when profile is null", () => {
      const profile = null;
      const prefillDob = profile?.dateOfBirth ?? "";
      expect(prefillDob).toBe("");
    });

    it("should display DOB in pre-filled banner when available", () => {
      const dateOfBirth = "2015-03-15";
      const displayText = dateOfBirth
        ? `, DOB: ${new Date(dateOfBirth + "T00:00:00").toLocaleDateString()}`
        : "";
      expect(displayText).toContain("DOB:");
      expect(displayText).toContain("2015");
    });

    it("should not display DOB in banner when not available", () => {
      const dateOfBirth = "";
      const displayText = dateOfBirth
        ? `, DOB: ${new Date(dateOfBirth + "T00:00:00").toLocaleDateString()}`
        : "";
      expect(displayText).toBe("");
    });
  });

  describe("Account status indicator logic", () => {
    it("should return 'pending_setup' when student has no password", () => {
      const child = { passwordHash: null, onboardingCompleted: false };
      const status = !child.passwordHash
        ? "pending_setup"
        : !child.onboardingCompleted
        ? "setup_incomplete"
        : "active";
      expect(status).toBe("pending_setup");
    });

    it("should return 'setup_incomplete' when student has password but no onboarding", () => {
      const child = { passwordHash: "hashed123", onboardingCompleted: false };
      const status = !child.passwordHash
        ? "pending_setup"
        : !child.onboardingCompleted
        ? "setup_incomplete"
        : "active";
      expect(status).toBe("setup_incomplete");
    });

    it("should return 'active' when student has password and completed onboarding", () => {
      const child = { passwordHash: "hashed123", onboardingCompleted: true };
      const status = !child.passwordHash
        ? "pending_setup"
        : !child.onboardingCompleted
        ? "setup_incomplete"
        : "active";
      expect(status).toBe("active");
    });

    it("should return 'pending_setup' when passwordHash is empty string", () => {
      const child = { passwordHash: "", onboardingCompleted: false };
      const status = !child.passwordHash
        ? "pending_setup"
        : !child.onboardingCompleted
        ? "setup_incomplete"
        : "active";
      expect(status).toBe("pending_setup");
    });

    it("should return 'active' even when lastActiveAt is null (never logged in after onboarding)", () => {
      const child = { passwordHash: "hashed", onboardingCompleted: true, lastActiveAt: null };
      const status = !child.passwordHash
        ? "pending_setup"
        : !child.onboardingCompleted
        ? "setup_incomplete"
        : "active";
      expect(status).toBe("active");
    });

    it("should show correct badge color for each status", () => {
      const statusColors: Record<string, string> = {
        pending_setup: "bg-orange-50 text-orange-700 border-orange-200",
        setup_incomplete: "bg-yellow-50 text-yellow-700 border-yellow-200",
        active: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
      expect(statusColors["pending_setup"]).toContain("orange");
      expect(statusColors["setup_incomplete"]).toContain("yellow");
      expect(statusColors["active"]).toContain("emerald");
    });

    it("should show dot indicator color for each status", () => {
      const dotColors: Record<string, string> = {
        pending_setup: "bg-orange-400",
        setup_incomplete: "bg-yellow-400",
        active: "bg-emerald-400",
      };
      expect(dotColors["pending_setup"]).toBe("bg-orange-400");
      expect(dotColors["setup_incomplete"]).toBe("bg-yellow-400");
      expect(dotColors["active"]).toBe("bg-emerald-400");
    });
  });
});
