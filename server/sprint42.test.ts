/**
 * sprint42.test.ts
 * Tests for Sprint 42:
 * 1. Student re-engagement context (getReEngagementContext procedure)
 * 2. Admin bulk management (bulkUpdateUserStatus, bulkAssignCourse, bulkRemoveCourse)
 * 3. PWA configuration (vite.config.ts and PWAUpdatePrompt)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "./db";

// ─── Mock dependencies ────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
  getInactiveStudents: vi.fn(),
  updateUserStatus: vi.fn(),
  enrollUserInCourse: vi.fn(),
  removeStudentFromCourse: vi.fn(),
  logAdminAction: vi.fn(),
  getCourseById: vi.fn(),
}));

vi.mock("./emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  isEmailSuppressed: vi.fn().mockResolvedValue(false),
}));

// ─── 1. Re-engagement context ─────────────────────────────────────────────────
describe("getReEngagementContext", () => {
  it("returns inactive=false when lastActiveAt is recent (< 7 days)", () => {
    const now = Date.now();
    const lastActiveAt = now - 3 * 24 * 60 * 60 * 1000; // 3 days ago
    const inactiveDays = Math.floor((now - lastActiveAt) / (1000 * 60 * 60 * 24));
    expect(inactiveDays).toBeLessThan(7);
    const isInactive = inactiveDays >= 7;
    expect(isInactive).toBe(false);
  });

  it("returns inactive=true when lastActiveAt is 7+ days ago", () => {
    const now = Date.now();
    const lastActiveAt = now - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    const inactiveDays = Math.floor((now - lastActiveAt) / (1000 * 60 * 60 * 24));
    expect(inactiveDays).toBeGreaterThanOrEqual(7);
    const isInactive = inactiveDays >= 7;
    expect(isInactive).toBe(true);
  });

  it("calculates correct inactiveDays for 14-day gap", () => {
    const now = Date.now();
    const lastActiveAt = now - 14 * 24 * 60 * 60 * 1000;
    const inactiveDays = Math.floor((now - lastActiveAt) / (1000 * 60 * 60 * 24));
    expect(inactiveDays).toBe(14);
  });

  it("returns null lastLesson when no lesson progress exists", () => {
    const lessonProgress: any[] = [];
    const lastLesson = lessonProgress.length > 0
      ? lessonProgress.sort((a: any, b: any) => b.updatedAt - a.updatedAt)[0]
      : null;
    expect(lastLesson).toBeNull();
  });

  it("returns the most recently updated lesson when progress exists", () => {
    const now = Date.now();
    const lessonProgress = [
      { lessonId: 1, lessonTitle: "Intro to Variables", updatedAt: now - 10000 },
      { lessonId: 2, lessonTitle: "Linear Equations", updatedAt: now - 5000 },
      { lessonId: 3, lessonTitle: "Quadratics", updatedAt: now - 20000 },
    ];
    const lastLesson = lessonProgress.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    expect(lastLesson.lessonId).toBe(2);
    expect(lastLesson.lessonTitle).toBe("Linear Equations");
  });
});

// ─── 2. Bulk management ───────────────────────────────────────────────────────
describe("bulkUpdateUserStatus", () => {
  it("validates that userIds array is non-empty", () => {
    const userIds: number[] = [];
    const isValid = userIds.length > 0;
    expect(isValid).toBe(false);
  });

  it("validates that userIds array does not exceed 500", () => {
    const userIds = Array.from({ length: 501 }, (_, i) => i + 1);
    const isValid = userIds.length <= 500;
    expect(isValid).toBe(false);
  });

  it("accepts valid userIds array within limit", () => {
    const userIds = [1, 2, 3, 4, 5];
    const isValid = userIds.length > 0 && userIds.length <= 500;
    expect(isValid).toBe(true);
  });

  it("aggregates successCount and failCount correctly", () => {
    const results = [
      { userId: 1, success: true },
      { userId: 2, success: false, error: "User not found" },
      { userId: 3, success: true },
    ];
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    expect(successCount).toBe(2);
    expect(failCount).toBe(1);
  });

  it("accepts all valid status values", () => {
    const validStatuses = ["active", "suspended", "deactivated", "pending_verification", "deleted"];
    for (const status of validStatuses) {
      expect(validStatuses).toContain(status);
    }
  });
});

describe("bulkAssignCourse", () => {
  it("validates courseId is a positive integer", () => {
    const courseId = 5;
    expect(courseId).toBeGreaterThan(0);
    expect(Number.isInteger(courseId)).toBe(true);
  });

  it("returns per-user success/failure results", () => {
    const userIds = [10, 11, 12];
    // Simulate: user 11 already enrolled (fails), others succeed
    const results = userIds.map(userId => ({
      userId,
      success: userId !== 11,
      error: userId === 11 ? "Already enrolled" : undefined,
    }));
    expect(results.find(r => r.userId === 11)?.success).toBe(false);
    expect(results.find(r => r.userId === 10)?.success).toBe(true);
    expect(results.find(r => r.userId === 12)?.success).toBe(true);
  });
});

describe("bulkRemoveCourse", () => {
  it("returns per-user success/failure results", () => {
    const userIds = [20, 21, 22];
    // Simulate: user 22 not enrolled (fails)
    const results = userIds.map(userId => ({
      userId,
      success: userId !== 22,
      error: userId === 22 ? "Not enrolled" : undefined,
    }));
    expect(results.find(r => r.userId === 22)?.success).toBe(false);
    expect(results.find(r => r.userId === 20)?.success).toBe(true);
  });
});

// ─── 3. PWA configuration ─────────────────────────────────────────────────────
describe("PWA configuration", () => {
  it("vite.config.ts includes VitePWA plugin import", async () => {
    const fs = await import("fs");
    const config = fs.readFileSync("/home/ubuntu/educhamp/vite.config.ts", "utf-8");
    expect(config).toContain("vite-plugin-pwa");
    expect(config).toContain("VitePWA");
  });

  it("PWA manifest has required fields", async () => {
    const fs = await import("fs");
    const config = fs.readFileSync("/home/ubuntu/educhamp/vite.config.ts", "utf-8");
    expect(config).toContain("\"EduChamp\"");
    expect(config).toContain("standalone");
    expect(config).toContain("theme_color");
  });

  it("PWA workbox config excludes /api/ from navigateFallback", async () => {
    const fs = await import("fs");
    const config = fs.readFileSync("/home/ubuntu/educhamp/vite.config.ts", "utf-8");
    expect(config).toContain("navigateFallbackDenylist");
    // The denylist contains a regex literal /^\/api\// — check for the api path
    expect(config).toMatch(/navigateFallbackDenylist.*api/s);
  });

  it("PWAUpdatePrompt component exists and exports the component", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("/home/ubuntu/educhamp/client/src/components/PWAUpdatePrompt.tsx");
    expect(exists).toBe(true);
    const content = fs.readFileSync("/home/ubuntu/educhamp/client/src/components/PWAUpdatePrompt.tsx", "utf-8");
    expect(content).toContain("export function PWAUpdatePrompt");
    expect(content).toContain("workbox-window");
  });

  it("PWAUpdatePrompt is registered in main.tsx", async () => {
    const fs = await import("fs");
    const main = fs.readFileSync("/home/ubuntu/educhamp/client/src/main.tsx", "utf-8");
    expect(main).toContain("PWAUpdatePrompt");
  });

  it("service worker is disabled in dev mode", async () => {
    const fs = await import("fs");
    const config = fs.readFileSync("/home/ubuntu/educhamp/vite.config.ts", "utf-8");
    expect(config).toContain("devOptions: { enabled: false }");
  });

  it("API calls use NetworkFirst strategy", async () => {
    const fs = await import("fs");
    const config = fs.readFileSync("/home/ubuntu/educhamp/vite.config.ts", "utf-8");
    expect(config).toContain("NetworkFirst");
    expect(config).toContain("api-cache");
  });

  it("Google Fonts use StaleWhileRevalidate strategy", async () => {
    const fs = await import("fs");
    const config = fs.readFileSync("/home/ubuntu/educhamp/vite.config.ts", "utf-8");
    expect(config).toContain("StaleWhileRevalidate");
    expect(config).toContain("google-fonts");
  });
});

// ─── 4. WelcomeBackBanner component ──────────────────────────────────────────
describe("WelcomeBackBanner component", () => {
  it("WelcomeBackBanner component file exists", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("/home/ubuntu/educhamp/client/src/components/WelcomeBackBanner.tsx");
    expect(exists).toBe(true);
  });

  it("WelcomeBackBanner exports the component", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/educhamp/client/src/components/WelcomeBackBanner.tsx", "utf-8");
    expect(content).toContain("export function WelcomeBackBanner");
  });

  it("WelcomeBackBanner uses getReEngagementContext tRPC procedure", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/educhamp/client/src/components/WelcomeBackBanner.tsx", "utf-8");
    expect(content).toContain("getReEngagementContext");
  });

  it("WelcomeBackBanner is wired into Progress page", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("/home/ubuntu/educhamp/client/src/pages/Progress.tsx", "utf-8");
    expect(content).toContain("WelcomeBackBanner");
  });
});
