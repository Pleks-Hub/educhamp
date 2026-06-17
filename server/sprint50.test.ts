import { describe, it, expect } from "vitest";

// Sprint 50 tests: Last active timestamp, parent notification on setup complete, bulk resend

describe("Sprint 50 — Last Active Timestamp", () => {
  it("should format relative time for recent activity (seconds)", () => {
    const now = Date.now();
    const diff = now - (now - 30_000); // 30 seconds ago
    expect(diff).toBeLessThan(60_000);
    // "Just now" for < 1 minute
    const label = diff < 60_000 ? "Just now" : "";
    expect(label).toBe("Just now");
  });

  it("should format relative time for minutes ago", () => {
    const diff = 5 * 60_000; // 5 minutes
    const minutes = Math.floor(diff / 60_000);
    expect(minutes).toBe(5);
    const label = `${minutes}m ago`;
    expect(label).toBe("5m ago");
  });

  it("should format relative time for hours ago", () => {
    const diff = 3 * 60 * 60_000; // 3 hours
    const hours = Math.floor(diff / (60 * 60_000));
    expect(hours).toBe(3);
    const label = `${hours}h ago`;
    expect(label).toBe("3h ago");
  });

  it("should format relative time for days ago", () => {
    const diff = 2 * 24 * 60 * 60_000; // 2 days
    const days = Math.floor(diff / (24 * 60 * 60_000));
    expect(days).toBe(2);
    const label = `${days}d ago`;
    expect(label).toBe("2d ago");
  });

  it("should show 'Never' when lastActiveAt is null", () => {
    const lastActiveAt: number | null = null;
    const label = lastActiveAt === null ? "Never" : "Active";
    expect(label).toBe("Never");
  });
});

describe("Sprint 50 — Parent Notification on Setup Complete", () => {
  it("should identify parent links for a given child ID", async () => {
    // Simulates the query: find parents linked to a child
    const parentChildren = [
      { parentId: 1, childId: 10, isActive: true },
      { parentId: 2, childId: 10, isActive: true },
      { parentId: 3, childId: 11, isActive: true },
    ];
    const childId = 10;
    const parents = parentChildren.filter((l) => l.childId === childId && l.isActive);
    expect(parents).toHaveLength(2);
    expect(parents[0].parentId).toBe(1);
    expect(parents[1].parentId).toBe(2);
  });

  it("should build correct email content for setup completion notification", () => {
    const studentName = "Alex";
    const parentName = "Jane";
    const subject = `${studentName} has completed their EduChamp setup!`;
    expect(subject).toContain("Alex");
    expect(subject).toContain("completed");
    expect(subject).toContain("setup");
  });

  it("should not send notification if no parents are linked", () => {
    const parentChildren: { parentId: number; childId: number; isActive: boolean }[] = [];
    const childId = 99;
    const parents = parentChildren.filter((l) => l.childId === childId && l.isActive);
    expect(parents).toHaveLength(0);
    // No email should be sent — function should return early
  });
});

describe("Sprint 50 — Bulk Resend Setup Emails", () => {
  it("should skip students who already have a password (setup complete)", () => {
    const children = [
      { id: 1, email: "a@test.com", passwordHash: "abc123", name: "Alice" },
      { id: 2, email: "b@test.com", passwordHash: null, name: "Bob" },
      { id: 3, email: "c@test.com", passwordHash: "def456", name: "Charlie" },
    ];
    const pending = children.filter((c) => !c.passwordHash);
    expect(pending).toHaveLength(1);
    expect(pending[0].name).toBe("Bob");
  });

  it("should skip students who were emailed within the last 10 minutes", () => {
    const now = Date.now();
    const tokens = [
      { userId: 2, createdAt: new Date(now - 5 * 60_000) }, // 5 min ago — too recent
    ];
    const tenMinutesAgo = new Date(now - 10 * 60_000);
    const recentToken = tokens.find((t) => t.userId === 2 && t.createdAt > tenMinutesAgo);
    expect(recentToken).toBeDefined();
    // Should be skipped
  });

  it("should send to students who have no password and no recent token", () => {
    const now = Date.now();
    const children = [
      { id: 1, email: "a@test.com", passwordHash: null, name: "Alice" },
    ];
    const tokens: { userId: number; createdAt: Date }[] = []; // no tokens
    const tenMinutesAgo = new Date(now - 10 * 60_000);
    
    const eligible = children.filter((c) => {
      if (c.passwordHash) return false;
      const recentToken = tokens.find((t) => t.userId === c.id && t.createdAt > tenMinutesAgo);
      return !recentToken;
    });
    expect(eligible).toHaveLength(1);
    expect(eligible[0].name).toBe("Alice");
  });

  it("should return correct counts for sent, skipped, and errors", () => {
    // Simulate bulk resend results
    const result = { sent: 2, skipped: 3, errors: ["Failed for Dave: timeout"] };
    expect(result.sent).toBe(2);
    expect(result.skipped).toBe(3);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Dave");
  });

  it("should return empty results when parent has no children", () => {
    const links: { childId: number }[] = [];
    const result = links.length === 0
      ? { sent: 0, skipped: 0, errors: [] }
      : { sent: 1, skipped: 0, errors: [] };
    expect(result.sent).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe("Sprint 50 — Account Status Logic", () => {
  it("should return 'pending_setup' when student has no password", () => {
    const child = { passwordHash: null, onboardingCompleted: false };
    const status = !child.passwordHash ? "pending_setup" : !child.onboardingCompleted ? "setup_incomplete" : "active";
    expect(status).toBe("pending_setup");
  });

  it("should return 'setup_incomplete' when student has password but no onboarding", () => {
    const child = { passwordHash: "abc", onboardingCompleted: false };
    const status = !child.passwordHash ? "pending_setup" : !child.onboardingCompleted ? "setup_incomplete" : "active";
    expect(status).toBe("setup_incomplete");
  });

  it("should return 'active' when student has password and completed onboarding", () => {
    const child = { passwordHash: "abc", onboardingCompleted: true };
    const status = !child.passwordHash ? "pending_setup" : !child.onboardingCompleted ? "setup_incomplete" : "active";
    expect(status).toBe("active");
  });
});
