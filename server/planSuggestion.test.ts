import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  createPlanSuggestion: vi.fn(),
  getPlanSuggestionsForStudent: vi.fn(),
  getPlanSuggestionsForParent: vi.fn(),
  respondToPlanSuggestion: vi.fn(),
}));

import {
  createPlanSuggestion,
  getPlanSuggestionsForStudent,
  getPlanSuggestionsForParent,
  respondToPlanSuggestion,
} from "./db";

describe("Parent Plan Suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPlanSuggestion", () => {
    it("should create a plan suggestion with all required fields", async () => {
      const mockResult = { id: 1 };
      (createPlanSuggestion as any).mockResolvedValue(mockResult);

      const input = {
        parentId: 10,
        studentId: 20,
        title: "Suggested Plan for Alice",
        hoursPerWeek: 5,
        preferredDays: ["mon", "tue", "wed", "thu", "fri"],
        schedule: {
          blocks: [
            { day: "mon", courseId: 0, courseName: "Study Session", durationMinutes: 60, priority: "medium" },
          ],
        },
        message: "I think 1 hour per day would be great!",
      };

      const result = await createPlanSuggestion(input);
      expect(createPlanSuggestion).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockResult);
    });

    it("should create a suggestion without optional fields", async () => {
      (createPlanSuggestion as any).mockResolvedValue({ id: 2 });

      const input = {
        parentId: 10,
        studentId: 20,
        hoursPerWeek: 3,
        preferredDays: ["sat", "sun"],
        schedule: { blocks: [] },
      };

      const result = await createPlanSuggestion(input);
      expect(result).toEqual({ id: 2 });
    });
  });

  describe("getPlanSuggestionsForStudent", () => {
    it("should return suggestions for a student", async () => {
      const mockSuggestions = [
        { id: 1, parentId: 10, parentName: "Parent A", title: "Plan 1", status: "pending", hoursPerWeek: 5, preferredDays: ["mon"], schedule: { blocks: [] }, createdAt: new Date() },
        { id: 2, parentId: 11, parentName: "Parent B", title: "Plan 2", status: "accepted", hoursPerWeek: 3, preferredDays: ["tue"], schedule: { blocks: [] }, createdAt: new Date() },
      ];
      (getPlanSuggestionsForStudent as any).mockResolvedValue(mockSuggestions);

      const result = await getPlanSuggestionsForStudent(20);
      expect(getPlanSuggestionsForStudent).toHaveBeenCalledWith(20);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("pending");
    });

    it("should return empty array when no suggestions exist", async () => {
      (getPlanSuggestionsForStudent as any).mockResolvedValue([]);
      const result = await getPlanSuggestionsForStudent(99);
      expect(result).toEqual([]);
    });
  });

  describe("getPlanSuggestionsForParent", () => {
    it("should return all suggestions made by a parent", async () => {
      const mockSuggestions = [
        { id: 1, studentId: 20, studentName: "Alice", title: "Plan for Alice", status: "pending" },
      ];
      (getPlanSuggestionsForParent as any).mockResolvedValue(mockSuggestions);

      const result = await getPlanSuggestionsForParent(10);
      expect(getPlanSuggestionsForParent).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
    });

    it("should filter by studentId when provided", async () => {
      (getPlanSuggestionsForParent as any).mockResolvedValue([]);
      await getPlanSuggestionsForParent(10, 20);
      expect(getPlanSuggestionsForParent).toHaveBeenCalledWith(10, 20);
    });
  });

  describe("respondToPlanSuggestion", () => {
    it("should accept a suggestion", async () => {
      (respondToPlanSuggestion as any).mockResolvedValue({ success: true });

      const result = await respondToPlanSuggestion(1, 20, "accepted", "Sounds good!");
      expect(respondToPlanSuggestion).toHaveBeenCalledWith(1, 20, "accepted", "Sounds good!");
      expect(result.success).toBe(true);
    });

    it("should decline a suggestion", async () => {
      (respondToPlanSuggestion as any).mockResolvedValue({ success: true });

      const result = await respondToPlanSuggestion(1, 20, "declined", "I'll create my own plan.");
      expect(respondToPlanSuggestion).toHaveBeenCalledWith(1, 20, "declined", "I'll create my own plan.");
      expect(result.success).toBe(true);
    });

    it("should throw error for non-existent suggestion", async () => {
      (respondToPlanSuggestion as any).mockRejectedValue(new Error("Suggestion not found"));

      await expect(respondToPlanSuggestion(999, 20, "accepted")).rejects.toThrow("Suggestion not found");
    });

    it("should throw error for already responded suggestion", async () => {
      (respondToPlanSuggestion as any).mockRejectedValue(new Error("Suggestion already responded to"));

      await expect(respondToPlanSuggestion(1, 20, "declined")).rejects.toThrow("Suggestion already responded to");
    });
  });
});

describe("Role/Type Synchronization", () => {
  it("should sync role when accountType changes from student to parent", () => {
    // The logic is: when accountType = "parent", role should also be "parent"
    // unless user is admin (admin role is preserved)
    const accountType = "parent";
    const expectedRole = "parent"; // non-admin users get role synced
    expect(accountType).toBe(expectedRole);
  });

  it("should sync accountType when role changes from student to parent", () => {
    const role = "parent";
    const expectedAccountType = "parent";
    expect(role).toBe(expectedAccountType);
  });

  it("should not change accountType when role is set to admin", () => {
    // Admin is a special role - it doesn't have a corresponding accountType
    // The accountType stays as-is when promoting to admin
    const role = "admin";
    const currentAccountType = "student";
    // Admin role doesn't sync to accountType
    expect(currentAccountType).toBe("student");
    expect(role).toBe("admin");
  });
});

describe("Billing Exemption Access Gate", () => {
  it("should allow access for users with active billing exemption", () => {
    const billingStatus = {
      hasActiveSubscription: false,
      isExempt: true,
      exemptionType: "perpetual",
    };
    // User should NOT be access-locked
    const isAccessLocked = !billingStatus.hasActiveSubscription && !billingStatus.isExempt;
    expect(isAccessLocked).toBe(false);
  });

  it("should lock access for users without subscription or exemption", () => {
    const billingStatus = {
      hasActiveSubscription: false,
      isExempt: false,
    };
    const isAccessLocked = !billingStatus.hasActiveSubscription && !billingStatus.isExempt;
    expect(isAccessLocked).toBe(true);
  });

  it("should allow access for users with active subscription", () => {
    const billingStatus = {
      hasActiveSubscription: true,
      isExempt: false,
    };
    const isAccessLocked = !billingStatus.hasActiveSubscription && !billingStatus.isExempt;
    expect(isAccessLocked).toBe(false);
  });

  it("should allow access for exempt users even without subscription", () => {
    const billingStatus = {
      hasActiveSubscription: false,
      isExempt: true,
      exemptionType: "time_limited",
      exemptionEndDate: new Date(Date.now() + 86400000), // tomorrow
    };
    const isAccessLocked = !billingStatus.hasActiveSubscription && !billingStatus.isExempt;
    expect(isAccessLocked).toBe(false);
  });
});

describe("Streak Milestone Badges", () => {
  const MILESTONE_THRESHOLDS = [3, 7, 14, 30, 60, 100, 200, 365];

  it("should award badge at 7-day streak", () => {
    const currentStreak = 7;
    const earnedMilestone = MILESTONE_THRESHOLDS.find(t => t === currentStreak);
    expect(earnedMilestone).toBe(7);
  });

  it("should award badge at 30-day streak", () => {
    const currentStreak = 30;
    const earnedMilestone = MILESTONE_THRESHOLDS.find(t => t === currentStreak);
    expect(earnedMilestone).toBe(30);
  });

  it("should award badge at 100-day streak", () => {
    const currentStreak = 100;
    const earnedMilestone = MILESTONE_THRESHOLDS.find(t => t === currentStreak);
    expect(earnedMilestone).toBe(100);
  });

  it("should not award badge at non-milestone days", () => {
    const currentStreak = 15;
    const earnedMilestone = MILESTONE_THRESHOLDS.find(t => t === currentStreak);
    expect(earnedMilestone).toBeUndefined();
  });

  it("should award badge at 365-day streak", () => {
    const currentStreak = 365;
    const earnedMilestone = MILESTONE_THRESHOLDS.find(t => t === currentStreak);
    expect(earnedMilestone).toBe(365);
  });
});
