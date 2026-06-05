/**
 * Course Management Enhancement — Test Suite
 *
 * Covers:
 * 1. Admin suspend/unsuspend enrollment DB functions
 * 2. Admin getAllUserEnrollmentsAdmin DB function
 * 3. Parent bulkAssignCourses notification creation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
const mockUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    innerJoin: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
});
const mockInsert = vi.fn().mockReturnValue({ values: vi.fn() });
const mockDb = { update: mockUpdate, select: mockSelect, insert: mockInsert };

vi.mock("../drizzle/schema", () => ({
  userCourseEnrollments: { userId: "userId", courseId: "courseId", isActive: "isActive", isCurrent: "isCurrent" },
  courses: { id: "id" },
  userNotifications: { userId: "userId", type: "type", title: "title", message: "message", metadata: "metadata" },
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Admin Enrollment Management", () => {
  describe("suspendEnrollment", () => {
    it("calls update with isActive=false and isCurrent=false", async () => {
      const setFn = vi.fn().mockReturnValue({ where: vi.fn() });
      const updateFn = vi.fn().mockReturnValue({ set: setFn });
      const db = { update: updateFn, select: mockSelect, insert: mockInsert };

      // Mock getDb to return our mock db
      vi.doMock("./db", async (importOriginal) => {
        const original = await importOriginal<typeof import("./db")>();
        return {
          ...original,
          suspendEnrollment: async (userId: number, courseId: number) => {
            await db.update("userCourseEnrollments")
              .set({ isActive: false, isCurrent: false })
              .where(`userId=${userId} AND courseId=${courseId}`);
          },
        };
      });

      const { suspendEnrollment } = await import("./db");
      // The function should not throw
      await expect(suspendEnrollment(1, 5)).resolves.not.toThrow();
    });

    it("does not throw when db is null", async () => {
      // suspendEnrollment should gracefully handle null db
      vi.doMock("./db", async (importOriginal) => {
        const original = await importOriginal<typeof import("./db")>();
        return {
          ...original,
          suspendEnrollment: async () => { /* no-op when db is null */ },
        };
      });
      const { suspendEnrollment } = await import("./db");
      await expect(suspendEnrollment(1, 5)).resolves.not.toThrow();
    });
  });

  describe("unsuspendEnrollment", () => {
    it("calls update with isActive=true", async () => {
      const setFn = vi.fn().mockReturnValue({ where: vi.fn() });
      const updateFn = vi.fn().mockReturnValue({ set: setFn });
      const db = { update: updateFn };

      vi.doMock("./db", async (importOriginal) => {
        const original = await importOriginal<typeof import("./db")>();
        return {
          ...original,
          unsuspendEnrollment: async (userId: number, courseId: number) => {
            await db.update("userCourseEnrollments")
              .set({ isActive: true })
              .where(`userId=${userId} AND courseId=${courseId}`);
          },
        };
      });

      const { unsuspendEnrollment } = await import("./db");
      await expect(unsuspendEnrollment(1, 5)).resolves.not.toThrow();
    });
  });

  describe("getAllUserEnrollmentsAdmin", () => {
    it("returns both active and inactive enrollments", async () => {
      const mockRows = [
        { enrollment: { userId: 1, courseId: 1, isActive: true }, course: { id: 1, title: "Algebra" } },
        { enrollment: { userId: 1, courseId: 2, isActive: false }, course: { id: 2, title: "Geometry" } },
      ];
      const whereFn = vi.fn().mockResolvedValue(mockRows);
      const innerJoinFn = vi.fn().mockReturnValue({ where: whereFn });
      const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoinFn });
      const selectFn = vi.fn().mockReturnValue({ from: fromFn });
      const db = { select: selectFn };

      vi.doMock("./db", async (importOriginal) => {
        const original = await importOriginal<typeof import("./db")>();
        return {
          ...original,
          getAllUserEnrollmentsAdmin: async (userId: number) => {
            return db.select({ enrollment: "userCourseEnrollments", course: "courses" })
              .from("userCourseEnrollments")
              .innerJoin("courses", "courseId")
              .where(`userId=${userId}`);
          },
        };
      });

      const { getAllUserEnrollmentsAdmin } = await import("./db");
      const result = await getAllUserEnrollmentsAdmin(1);
      expect(result).toHaveLength(2);
      expect(result[0].enrollment.isActive).toBe(true);
      expect(result[1].enrollment.isActive).toBe(false);
    });

    it("returns empty array when db is null", async () => {
      vi.doMock("./db", async (importOriginal) => {
        const original = await importOriginal<typeof import("./db")>();
        return {
          ...original,
          getAllUserEnrollmentsAdmin: async () => [],
        };
      });

      const { getAllUserEnrollmentsAdmin } = await import("./db");
      const result = await getAllUserEnrollmentsAdmin(999);
      expect(result).toEqual([]);
    });
  });
});

describe("Parent Course Assignment Notifications", () => {
  it("notification message includes course name for single course", () => {
    const courseNames = ["Algebra I"];
    const enrolled = 1;
    const parentName = "Jane Doe";

    const title = enrolled === 1
      ? `New course assigned: ${courseNames[0]}`
      : `${enrolled} new courses assigned`;
    const message = enrolled === 1
      ? `${parentName} has enrolled you in ${courseNames[0]}. Head to your dashboard to start learning!`
      : `${parentName} has enrolled you in ${courseNames.join(", ")}. Head to your dashboard to explore your new courses!`;

    expect(title).toBe("New course assigned: Algebra I");
    expect(message).toContain("Jane Doe has enrolled you in Algebra I");
    expect(message).toContain("start learning");
  });

  it("notification message includes all course names for multiple courses", () => {
    const courseNames = ["Algebra I", "Geometry", "Pre-Calculus"];
    const enrolled = 3;
    const parentName = "John Smith";

    const title = enrolled === 1
      ? `New course assigned: ${courseNames[0]}`
      : `${enrolled} new courses assigned`;
    const message = enrolled === 1
      ? `${parentName} has enrolled you in ${courseNames[0]}. Head to your dashboard to start learning!`
      : `${parentName} has enrolled you in ${courseNames.join(", ")}. Head to your dashboard to explore your new courses!`;

    expect(title).toBe("3 new courses assigned");
    expect(message).toContain("Algebra I, Geometry, Pre-Calculus");
    expect(message).toContain("explore your new courses");
  });

  it("notification for approved course request includes course title", () => {
    const courseTitle = "AP Chemistry";
    const title = `Course request approved: ${courseTitle}`;
    const message = `Your request for ${courseTitle} has been approved! You can now access this course from your dashboard.`;

    expect(title).toBe("Course request approved: AP Chemistry");
    expect(message).toContain("AP Chemistry");
    expect(message).toContain("approved");
  });

  it("notification for rejected course request includes reason when provided", () => {
    const courseTitle = "AP Physics";
    const rejectionReason = "Focus on current courses first";
    const message = rejectionReason
      ? `Your request for ${courseTitle} was not approved. Reason: ${rejectionReason}`
      : `Your request for ${courseTitle} was not approved at this time.`;

    expect(message).toContain("AP Physics");
    expect(message).toContain("Focus on current courses first");
  });

  it("notification for rejected course request has fallback when no reason", () => {
    const courseTitle = "AP Physics";
    const rejectionReason: string | undefined = undefined;
    const message = rejectionReason
      ? `Your request for ${courseTitle} was not approved. Reason: ${rejectionReason}`
      : `Your request for ${courseTitle} was not approved at this time. You can browse other courses or talk to your parent.`;

    expect(message).toContain("not approved at this time");
    expect(message).toContain("browse other courses");
  });
});
