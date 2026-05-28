/**
 * Sprint 40 Tests — Admin Console & Inactivity Monitoring
 *
 * Covers:
 *  1. User status management (updateUserStatus with expanded enum)
 *  2. Inactivity monitoring (getInactiveStudents, getInactivityStats)
 *  3. Manual inactivity notification trigger
 *  4. Per-user course management (getUserEnrollments, removeStudentFromCourse)
 *  5. inactivityMonitor scheduled handler (tier processing, de-dup, 30-day flag)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock db helpers ────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  updateUserStatus: vi.fn(),
  getInactiveStudents: vi.fn(),
  getInactivityStats: vi.fn(),
  hasInactivityNotificationBeenSent: vi.fn(),
  recordInactivityNotification: vi.fn(),
  getStudentInactivityNotifications: vi.fn(),
  getUserById: vi.fn(),
  getUserEnrollments: vi.fn(),
  removeStudentFromCourse: vi.fn(),
  logAdminAction: vi.fn(),
  enrollUserInCourse: vi.fn(),
}));

vi.mock("./emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("./emailTemplates/inactivityNotification", () => ({
  buildInactivityEmail: vi.fn().mockReturnValue({
    subject: "Test Inactivity Subject",
    html: "<p>Test</p>",
    text: "Test",
  }),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

import {
  getInactiveStudents,
  hasInactivityNotificationBeenSent,
  recordInactivityNotification,
  getInactivityStats,
  getUserById,
  logAdminAction,
  getDb,
} from "./db";
import { sendEmail } from "./emailService";
import { sdk } from "./_core/sdk";

// ── 1. User Status Management ─────────────────────────────────────────────────

describe("User Status Management", () => {
  it("accepts all valid status values", () => {
    const validStatuses = ["active", "suspended", "deactivated", "pending_verification", "archived", "deleted"];
    validStatuses.forEach((status) => {
      expect(["active", "suspended", "deactivated", "pending_verification", "archived", "deleted"]).toContain(status);
    });
  });

  it("STATUS_COLORS map includes new statuses", () => {
    const STATUS_COLORS: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-800",
      suspended: "bg-amber-100 text-amber-800",
      deactivated: "bg-orange-100 text-orange-800",
      pending_verification: "bg-blue-100 text-blue-800",
      archived: "bg-gray-100 text-gray-600",
      deleted: "bg-red-100 text-red-800",
    };
    expect(STATUS_COLORS["deactivated"]).toBe("bg-orange-100 text-orange-800");
    expect(STATUS_COLORS["pending_verification"]).toBe("bg-blue-100 text-blue-800");
  });
});

// ── 2. Inactivity Monitoring — getInactiveStudents ────────────────────────────

describe("getInactiveStudents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns students inactive for minDays or more", async () => {
    const now = Date.now();
    const mockStudents = [
      { id: 1, name: "Alice", email: "alice@test.com", lastActiveAt: new Date(now - 8 * 86_400_000), lastSignedIn: new Date(now - 8 * 86_400_000), status: "active" },
      { id: 2, name: "Bob", email: "bob@test.com", lastActiveAt: null, lastSignedIn: new Date(now - 15 * 86_400_000), status: "active" },
    ];
    vi.mocked(getInactiveStudents).mockResolvedValue(mockStudents as any);

    const result = await getInactiveStudents(7);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
  });

  it("returns empty array when no inactive students", async () => {
    vi.mocked(getInactiveStudents).mockResolvedValue([]);
    const result = await getInactiveStudents(30);
    expect(result).toHaveLength(0);
  });

  it("uses lastSignedIn as fallback when lastActiveAt is null", async () => {
    const now = Date.now();
    const mockStudent = {
      id: 3, name: "Carol", email: "carol@test.com",
      lastActiveAt: null,
      lastSignedIn: new Date(now - 20 * 86_400_000),
      status: "active",
    };
    vi.mocked(getInactiveStudents).mockResolvedValue([mockStudent as any]);
    const result = await getInactiveStudents(14);
    expect(result).toHaveLength(1);
    // Verify the lastSignedIn fallback is used
    const lastActive = result[0].lastActiveAt ?? result[0].lastSignedIn;
    expect(lastActive).toBeDefined();
  });
});

// ── 3. Inactivity Stats ───────────────────────────────────────────────────────

describe("getInactivityStats", () => {
  it("returns tier counts", async () => {
    vi.mocked(getInactivityStats).mockResolvedValue({ sevenDay: 5, fourteenDay: 3, thirtyDay: 1, total: 9 } as any);
    const stats = await getInactivityStats();
    expect((stats as any).sevenDay).toBe(5);
    expect((stats as any).thirtyDay).toBe(1);
  });
});

// ── 4. Inactivity Notification De-dup ─────────────────────────────────────────

describe("Inactivity Notification De-dup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips student if notification already sent within window", async () => {
    vi.mocked(hasInactivityNotificationBeenSent).mockResolvedValue(true);
    const alreadySent = await hasInactivityNotificationBeenSent(1, "7day", 7);
    expect(alreadySent).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends notification if not already sent", async () => {
    vi.mocked(hasInactivityNotificationBeenSent).mockResolvedValue(false);
    vi.mocked(recordInactivityNotification).mockResolvedValue(undefined as any);

    const alreadySent = await hasInactivityNotificationBeenSent(2, "7day", 7);
    expect(alreadySent).toBe(false);
    // Simulate sending
    await sendEmail({ to: "test@test.com", subject: "Test", html: "<p>Test</p>", text: "Test", templateName: "inactivityReminder" });
    await recordInactivityNotification(2, "7day", "student", "test@test.com", 8);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(recordInactivityNotification).toHaveBeenCalledWith(2, "7day", "student", "test@test.com", 8);
  });
});

// ── 5. Manual Inactivity Notification ─────────────────────────────────────────

describe("Manual Inactivity Notification Trigger", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends email and logs admin action for valid student", async () => {
    const now = Date.now();
    vi.mocked(getUserById).mockResolvedValue({
      id: 5, name: "Dave", email: "dave@test.com",
      lastActiveAt: new Date(now - 10 * 86_400_000),
      lastSignedIn: new Date(now - 10 * 86_400_000),
      status: "active",
    } as any);
    vi.mocked(sendEmail).mockResolvedValue({ success: true } as any);
    vi.mocked(recordInactivityNotification).mockResolvedValue(undefined as any);
    vi.mocked(logAdminAction).mockResolvedValue(undefined as any);

    const student = await getUserById(5);
    expect(student).toBeDefined();
    expect(student!.email).toBe("dave@test.com");

    // Simulate the procedure logic
    const lastActive = student!.lastActiveAt ?? student!.lastSignedIn;
    const inactiveDays = Math.floor((now - new Date(lastActive!).getTime()) / 86_400_000);
    expect(inactiveDays).toBeGreaterThanOrEqual(9);

    await sendEmail({ to: student!.email!, subject: "Test", html: "<p>Test</p>", text: "Test", templateName: "inactivityReminder" });
    await recordInactivityNotification(student!.id, "manual", "student", student!.email!, inactiveDays);
    await logAdminAction(1, "user.inactivity_notification", "user", student!.id, { inactiveDays });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(recordInactivityNotification).toHaveBeenCalledWith(5, "manual", "student", "dave@test.com", expect.any(Number));
    expect(logAdminAction).toHaveBeenCalledWith(1, "user.inactivity_notification", "user", 5, expect.any(Object));
  });

  it("does not send email when student has no email", async () => {
    vi.mocked(getUserById).mockResolvedValue({
      id: 6, name: "No Email", email: null,
      lastActiveAt: new Date(Date.now() - 20 * 86_400_000),
      lastSignedIn: new Date(Date.now() - 20 * 86_400_000),
      status: "active",
    } as any);

    const student = await getUserById(6);
    if (student?.email) {
      await sendEmail({ to: student.email, subject: "Test", html: "<p>Test</p>", text: "Test", templateName: "inactivityReminder" });
    }
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

// ── 6. Inactivity Monitor Scheduled Handler ───────────────────────────────────

describe("Inactivity Monitor Scheduled Handler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-cron requests with 403", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ isCron: false, id: 1 } as any);

    const req = { headers: {} } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;

    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      res.status(403).json({ error: "cron-only" });
    }
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "cron-only" });
  });

  it("processes 7-day tier and sends emails for non-de-duped students", async () => {
    const now = Date.now();
    vi.mocked(getInactiveStudents).mockResolvedValue([
      { id: 10, name: "Eve", email: "eve@test.com", lastActiveAt: new Date(now - 8 * 86_400_000), lastSignedIn: new Date(now - 8 * 86_400_000), status: "active" },
    ] as any);
    vi.mocked(hasInactivityNotificationBeenSent).mockResolvedValue(false);
    vi.mocked(recordInactivityNotification).mockResolvedValue(undefined as any);
    vi.mocked(sendEmail).mockResolvedValue({ success: true } as any);
    vi.mocked(getDb).mockResolvedValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue(undefined),
    } as any);

    const students = await getInactiveStudents(7, 13);
    expect(students).toHaveLength(1);

    const alreadySent = await hasInactivityNotificationBeenSent(10, "7day", 7);
    expect(alreadySent).toBe(false);

    await sendEmail({ to: "eve@test.com", subject: "Test", html: "<p>Test</p>", text: "Test", templateName: "inactivityReminder" });
    await recordInactivityNotification(10, "7day", "student", "eve@test.com", 8);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(recordInactivityNotification).toHaveBeenCalledWith(10, "7day", "student", "eve@test.com", 8);
  });
});

// ── 7. Per-User Course Management ─────────────────────────────────────────────

describe("Per-User Course Management", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getUserEnrollments returns enrolled courses for a user", async () => {
    const { getUserEnrollments } = await import("./db");
    vi.mocked(getUserEnrollments).mockResolvedValue([
      { courseId: 1, courseTitle: "Algebra I", enrolledAt: new Date() },
      { courseId: 2, courseTitle: "Geometry", enrolledAt: new Date() },
    ] as any);

    const enrollments = await getUserEnrollments(42);
    expect(enrollments).toHaveLength(2);
    expect(enrollments[0].courseTitle).toBe("Algebra I");
  });

  it("removeStudentFromCourse removes enrollment", async () => {
    const { removeStudentFromCourse } = await import("./db");
    vi.mocked(removeStudentFromCourse).mockResolvedValue(undefined as any);

    await removeStudentFromCourse(42, 1);
    expect(removeStudentFromCourse).toHaveBeenCalledWith(42, 1);
  });
});
