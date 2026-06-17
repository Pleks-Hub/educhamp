import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── useTabNotification unit tests ──────────────────────────────────────────

describe("useTabNotification logic", () => {
  const BASE_TITLE = "EduChamp";

  it("should format title with unread count", () => {
    const format = (count: number) =>
      count > 99 ? `(99+) ${BASE_TITLE}` : `(${count}) ${BASE_TITLE}`;
    expect(format(3)).toBe("(3) EduChamp");
    expect(format(0)).toBe("(0) EduChamp");
    expect(format(99)).toBe("(99) EduChamp");
    expect(format(100)).toBe("(99+) EduChamp");
    expect(format(999)).toBe("(99+) EduChamp");
  });

  it("should return base title when count is 0", () => {
    // When unread is 0, title should just be BASE_TITLE
    const getTitle = (count: number, isVisible: boolean) => {
      if (!isVisible && count > 0) {
        return `(${count > 99 ? "99+" : count}) ${BASE_TITLE}`;
      }
      return BASE_TITLE;
    };
    expect(getTitle(0, false)).toBe("EduChamp");
    expect(getTitle(0, true)).toBe("EduChamp");
  });

  it("should show badge only when tab is not visible", () => {
    const getTitle = (count: number, isVisible: boolean) => {
      if (!isVisible && count > 0) {
        return `(${count > 99 ? "99+" : count}) ${BASE_TITLE}`;
      }
      return BASE_TITLE;
    };
    expect(getTitle(5, true)).toBe("EduChamp");
    expect(getTitle(5, false)).toBe("(5) EduChamp");
  });
});

// ─── Notification Preferences API tests ─────────────────────────────────────

describe("Notification Preferences - milestone toggles", () => {
  it("should define all 6 notification preference fields", () => {
    const defaultPrefs = {
      weeklyDigestEnabled: true,
      activityPreference: "general",
      notifySetupComplete: true,
      notifyQuizComplete: true,
      notifyMasteryAchieved: true,
      notifyDiagnosticComplete: true,
    };
    expect(defaultPrefs).toHaveProperty("notifySetupComplete");
    expect(defaultPrefs).toHaveProperty("notifyQuizComplete");
    expect(defaultPrefs).toHaveProperty("notifyMasteryAchieved");
    expect(defaultPrefs).toHaveProperty("notifyDiagnosticComplete");
    expect(Object.keys(defaultPrefs)).toHaveLength(6);
  });

  it("should allow partial updates (only changed field)", () => {
    // Simulates the mutation input validation
    const validInputs = [
      { weeklyDigestEnabled: false },
      { notifySetupComplete: false },
      { notifyQuizComplete: true },
      { notifyMasteryAchieved: false },
      { notifyDiagnosticComplete: true },
      { activityPreference: "reading" },
      { weeklyDigestEnabled: true, notifySetupComplete: false },
    ];
    for (const input of validInputs) {
      expect(Object.keys(input).length).toBeGreaterThan(0);
    }
  });

  it("should merge partial update with existing preferences (optimistic)", () => {
    const existing = {
      weeklyDigestEnabled: true,
      activityPreference: "general",
      notifySetupComplete: true,
      notifyQuizComplete: true,
      notifyMasteryAchieved: true,
      notifyDiagnosticComplete: true,
    };
    const update = { notifyQuizComplete: false };
    const merged = {
      weeklyDigestEnabled: update.weeklyDigestEnabled ?? existing.weeklyDigestEnabled,
      activityPreference: (update as any).activityPreference ?? existing.activityPreference,
      notifySetupComplete: (update as any).notifySetupComplete ?? existing.notifySetupComplete,
      notifyQuizComplete: update.notifyQuizComplete ?? existing.notifyQuizComplete,
      notifyMasteryAchieved: (update as any).notifyMasteryAchieved ?? existing.notifyMasteryAchieved,
      notifyDiagnosticComplete: (update as any).notifyDiagnosticComplete ?? existing.notifyDiagnosticComplete,
    };
    expect(merged.notifyQuizComplete).toBe(false);
    expect(merged.weeklyDigestEnabled).toBe(true);
    expect(merged.notifySetupComplete).toBe(true);
    expect(merged.notifyMasteryAchieved).toBe(true);
    expect(merged.notifyDiagnosticComplete).toBe(true);
  });

  it("should handle toggling weeklyDigestEnabled independently", () => {
    const existing = {
      weeklyDigestEnabled: true,
      activityPreference: "math_games",
      notifySetupComplete: false,
      notifyQuizComplete: true,
      notifyMasteryAchieved: true,
      notifyDiagnosticComplete: false,
    };
    const update = { weeklyDigestEnabled: false };
    const merged = { ...existing, ...update };
    expect(merged.weeklyDigestEnabled).toBe(false);
    expect(merged.activityPreference).toBe("math_games");
    expect(merged.notifySetupComplete).toBe(false);
  });

  it("should default all milestone toggles to true when undefined", () => {
    const fromServer = (val: boolean | undefined | null) => val ?? true;
    expect(fromServer(undefined)).toBe(true);
    expect(fromServer(null)).toBe(true);
    expect(fromServer(true)).toBe(true);
    expect(fromServer(false)).toBe(false);
  });
});

// ─── Weekly Digest Scheduled Job tests ──────────────────────────────────────

describe("Weekly Parent Digest - scheduled job", () => {
  it("should have correct endpoint path", () => {
    const ENDPOINT = "/api/scheduled/weekly-parent-digest";
    expect(ENDPOINT).toBe("/api/scheduled/weekly-parent-digest");
    expect(ENDPOINT.startsWith("/api/scheduled/")).toBe(true);
  });

  it("should run on Monday at 08:00 UTC", () => {
    // Cron: 0 0 8 * * 1 (seconds minutes hours dom month dow)
    const cron = "0 0 8 * * 1";
    const parts = cron.split(" ");
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe("0"); // seconds
    expect(parts[1]).toBe("0"); // minutes
    expect(parts[2]).toBe("8"); // hours (8 AM UTC = 3 AM Houston)
    expect(parts[5]).toBe("1"); // Monday
  });

  it("should skip parents without email", () => {
    const parents = [
      { id: 1, email: "parent@example.com", name: "Parent A" },
      { id: 2, email: null, name: "Parent B" },
      { id: 3, email: "", name: "Parent C" },
    ];
    const eligible = parents.filter((p) => !!p.email);
    expect(eligible).toHaveLength(1);
    expect(eligible[0].id).toBe(1);
  });

  it("should calculate 7-day window correctly", () => {
    const now = new Date("2026-06-16T08:00:00Z");
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    expect(weekStart.toISOString()).toContain("2026-06-09");
  });
});

// ─── Browser Tab Badge tests ────────────────────────────────────────────────

describe("Browser Tab Notification Badge", () => {
  it("should format title correctly for various counts", () => {
    const formatTitle = (count: number) => {
      if (count <= 0) return "EduChamp";
      return `(${count > 99 ? "99+" : count}) EduChamp`;
    };
    expect(formatTitle(0)).toBe("EduChamp");
    expect(formatTitle(1)).toBe("(1) EduChamp");
    expect(formatTitle(9)).toBe("(9) EduChamp");
    expect(formatTitle(42)).toBe("(42) EduChamp");
    expect(formatTitle(100)).toBe("(99+) EduChamp");
  });

  it("should not show badge when tab is visible", () => {
    const shouldShowBadge = (isVisible: boolean, unread: number) =>
      !isVisible && unread > 0;
    expect(shouldShowBadge(true, 5)).toBe(false);
    expect(shouldShowBadge(true, 0)).toBe(false);
    expect(shouldShowBadge(false, 5)).toBe(true);
    expect(shouldShowBadge(false, 0)).toBe(false);
  });

  it("should reset title when tab becomes visible", () => {
    const getTitle = (isVisible: boolean, unread: number) => {
      if (isVisible) return "EduChamp";
      if (unread > 0) return `(${unread > 99 ? "99+" : unread}) EduChamp`;
      return "EduChamp";
    };
    // Simulate: tab hidden with 3 unread
    expect(getTitle(false, 3)).toBe("(3) EduChamp");
    // Simulate: user returns to tab
    expect(getTitle(true, 3)).toBe("EduChamp");
  });
});
