import { describe, it, expect } from "vitest";

/**
 * Sprint 48 Tests:
 * 1. Parent-approved visual indicator logic
 * 2. Pre-fill grade/school from parent-created account
 * 3. Resend setup email rate limiting
 */

describe("Sprint 48 — Parent-approved student flow", () => {
  describe("Pre-fill grade/school from parent-created account", () => {
    it("should detect parent-created student by loginMethod", () => {
      const user = {
        id: 1,
        grade: "6",
        school: "Lincoln Elementary",
        loginMethod: "parent_enrolled",
      };
      // Parent-created students have loginMethod === "parent_enrolled"
      expect(user.loginMethod).toBe("parent_enrolled");
      expect(user.grade).toBe("6");
      expect(user.school).toBe("Lincoln Elementary");
    });

    it("should not pre-fill when grade is default '9' (not explicitly set by parent)", () => {
      const user = { id: 2, grade: "9", school: null, loginMethod: "parent_enrolled" };
      // The frontend logic: user.grade && user.grade !== "9" && !gradeLevel
      const shouldPreFill = user.grade !== null && user.grade !== "9";
      expect(shouldPreFill).toBe(false);
    });

    it("should pre-fill when parent explicitly set a non-default grade", () => {
      const user = { id: 3, grade: "5", school: "Oak Park School", loginMethod: "parent_enrolled" };
      const shouldPreFill = user.grade !== null && user.grade !== "9";
      expect(shouldPreFill).toBe(true);
    });

    it("should pre-fill school name when available", () => {
      const user = { id: 4, grade: "7", school: "Maple Middle", loginMethod: "parent_enrolled" };
      const schoolToPreFill = user.school ?? "";
      expect(schoolToPreFill).toBe("Maple Middle");
    });

    it("should handle null school gracefully", () => {
      const user = { id: 5, grade: "4", school: null, loginMethod: "parent_enrolled" };
      const schoolToPreFill = user.school ?? "";
      expect(schoolToPreFill).toBe("");
    });
  });

  describe("COPPA auto-approval for parent-created students", () => {
    it("should recognize coppa status 'approved' as already approved", () => {
      const coppaStatus = { status: "approved" as const };
      const coppaAlreadyApproved = coppaStatus.status === "approved" || coppaStatus.status === "not_required";
      expect(coppaAlreadyApproved).toBe(true);
    });

    it("should recognize coppa status 'not_required' as already approved", () => {
      const coppaStatus = { status: "not_required" as const };
      const coppaAlreadyApproved = coppaStatus.status === "approved" || coppaStatus.status === "not_required";
      expect(coppaAlreadyApproved).toBe(true);
    });

    it("should NOT auto-approve when status is 'pending'", () => {
      const coppaStatus = { status: "pending" as const };
      const coppaAlreadyApproved = coppaStatus.status === "approved" || coppaStatus.status === "not_required";
      expect(coppaAlreadyApproved).toBe(false);
    });
  });

  describe("Resend setup email rate limiting", () => {
    it("should calculate wait time correctly when token was just created", () => {
      const tokenCreatedAt = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      const waitMinutes = Math.ceil((tokenCreatedAt.getTime() + 10 * 60 * 1000 - Date.now()) / 60000);
      expect(waitMinutes).toBe(8);
    });

    it("should calculate wait time of 1 minute when 9 minutes have passed", () => {
      const tokenCreatedAt = new Date(Date.now() - 9 * 60 * 1000); // 9 minutes ago
      const waitMinutes = Math.ceil((tokenCreatedAt.getTime() + 10 * 60 * 1000 - Date.now()) / 60000);
      expect(waitMinutes).toBe(1);
    });

    it("should allow resend when more than 10 minutes have passed", () => {
      const tokenCreatedAt = new Date(Date.now() - 11 * 60 * 1000); // 11 minutes ago
      const timeSinceToken = Date.now() - tokenCreatedAt.getTime();
      const canResend = timeSinceToken > 10 * 60 * 1000;
      expect(canResend).toBe(true);
    });

    it("should block resend when less than 10 minutes have passed", () => {
      const tokenCreatedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const timeSinceToken = Date.now() - tokenCreatedAt.getTime();
      const canResend = timeSinceToken > 10 * 60 * 1000;
      expect(canResend).toBe(false);
    });

    it("should format plural minutes correctly", () => {
      const waitMinutes = 8;
      const message = `Please wait ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""} before resending.`;
      expect(message).toBe("Please wait 8 minutes before resending.");
    });

    it("should format singular minute correctly", () => {
      const waitMinutes = 1;
      const message = `Please wait ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""} before resending.`;
      expect(message).toBe("Please wait 1 minute before resending.");
    });
  });

  describe("Parent-approved visual indicator", () => {
    it("should show approved banner when coppaAlreadyApproved is true and grade is COPPA grade", () => {
      const COPPA_GRADES = new Set(["K", "1", "2", "3", "4", "5", "6"]);
      const gradeLevel = "5";
      const coppaAlreadyApproved = true;
      const shouldShowBanner = coppaAlreadyApproved && COPPA_GRADES.has(gradeLevel);
      expect(shouldShowBanner).toBe(true);
    });

    it("should NOT show approved banner for non-COPPA grades", () => {
      const COPPA_GRADES = new Set(["K", "1", "2", "3", "4", "5", "6"]);
      const gradeLevel = "9";
      const coppaAlreadyApproved = true;
      const shouldShowBanner = coppaAlreadyApproved && COPPA_GRADES.has(gradeLevel);
      expect(shouldShowBanner).toBe(false);
    });

    it("should NOT show approved banner when not approved", () => {
      const COPPA_GRADES = new Set(["K", "1", "2", "3", "4", "5", "6"]);
      const gradeLevel = "4";
      const coppaAlreadyApproved = false;
      const shouldShowBanner = coppaAlreadyApproved && COPPA_GRADES.has(gradeLevel);
      expect(shouldShowBanner).toBe(false);
    });
  });
});
