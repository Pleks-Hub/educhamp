/**
 * admin.ts — Admin router
 * Provides platform stats, user management, course management,
 * platform settings, and audit log procedures.
 * All procedures require role === "admin".
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  updateUserAccountType,
  getAllCourses,
  getCourseById,
  updateCourse,
  getPlatformSettings,
  upsertPlatformSetting,
  logAdminAction,
  getAdminAuditLog,
  enrollUserInCourse,
  getUserCourseEnrollments,
  getUnitsForCourse,
  setUserActiveCourse,
  setStudentGradeLevel,
  bulkPromoteStudentGrade,
  getStudentsByGrade,
} from "../db";

// ─── Guard ────────────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({ ctx });
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminRouter = router({
  // ── Dashboard Stats ────────────────────────────────────────────────────────
  getStats: adminProcedure.query(async () => {
    const stats = await getAdminStats();
    if (!stats) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return stats;
  }),

  // ── User Management ────────────────────────────────────────────────────────
  listUsers: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(100), offset: z.number().min(0).default(0) }))
    .query(async ({ input }) => {
      return getAllUsers(input.limit, input.offset);
    }),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["admin", "user"]) }))
    .mutation(async ({ ctx, input }) => {
      await updateUserRole(input.userId, input.role);
      await logAdminAction(ctx.user.id, "user.role_change", "user", input.userId, {
        newRole: input.role,
        changedBy: ctx.user.id,
      });
      return { success: true };
    }),

  updateUserAccountType: adminProcedure
    .input(z.object({ userId: z.number(), accountType: z.enum(["student", "parent", "teacher"]) }))
    .mutation(async ({ ctx, input }) => {
      await updateUserAccountType(input.userId, input.accountType);
      await logAdminAction(ctx.user.id, "user.account_type_change", "user", input.userId, {
        newAccountType: input.accountType,
        changedBy: ctx.user.id,
      });
      return { success: true };
    }),

  enrollUserInCourse: adminProcedure
    .input(z.object({ userId: z.number(), courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await enrollUserInCourse(input.userId, input.courseId);
      await logAdminAction(ctx.user.id, "user.course_enroll", "user", input.userId, {
        courseId: input.courseId,
        enrolledBy: ctx.user.id,
      });
      return { success: true };
    }),

  getUserEnrollments: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return getUserCourseEnrollments(input.userId);
    }),

  // ── Course Management ──────────────────────────────────────────────────────
  listCourses: adminProcedure.query(async () => {
    return getAllCourses();
  }),

  getCourse: adminProcedure
    .input(z.object({ courseId: z.number() }))
    .query(async ({ input }) => {
      const course = await getCourseById(input.courseId);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      return course;
    }),

  getCourseUnits: adminProcedure
    .input(z.object({ courseId: z.number() }))
    .query(async ({ input }) => {
      return getUnitsForCourse(input.courseId);
    }),

  updateCourse: adminProcedure
    .input(z.object({
      courseId: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { courseId, ...data } = input;
      await updateCourse(courseId, data);
      await logAdminAction(ctx.user.id, "course.update", "course", courseId, { changes: data });
      return { success: true };
    }),

  // ── Platform Settings ──────────────────────────────────────────────────────
  getSettings: adminProcedure.query(async () => {
    return getPlatformSettings();
  }),

  upsertSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertPlatformSetting(input.key, input.value, input.description, ctx.user.id);
      await logAdminAction(ctx.user.id, "setting.update", "setting", null, {
        key: input.key,
        newValue: input.value,
      });
      return { success: true };
    }),

  // ── Audit Log ──────────────────────────────────────────────────────────────
  getAuditLog: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return getAdminAuditLog(input.limit);
    }),

  // ── Public course list (for course switcher) ───────────────────────────────
  getPublicCourses: protectedProcedure.query(async () => {
    const all = await getAllCourses();
    return all.filter((c) => c.isActive);
  }),

  // ── My enrollments ─────────────────────────────────────────────────────────
  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    return getUserCourseEnrollments(ctx.user.id);
  }),

  enrollSelf: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getUserCourseEnrollments(ctx.user.id);
      await enrollUserInCourse(ctx.user.id, input.courseId);
      // If this is the first enrollment, also make it the active course
      if (existing.length === 0) {
        await setUserActiveCourse(ctx.user.id, input.courseId);
      }
      return { success: true };
    }),

  // ── Set active course (persists isCurrent flag) ────────────────────────────
  setActiveCourse: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await setUserActiveCourse(ctx.user.id, input.courseId);
      return { success: true };
    }),

  // ── Grade management ───────────────────────────────────────────────────────
  setStudentGrade: adminProcedure
    .input(z.object({ userId: z.number(), gradeLevel: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await setStudentGradeLevel(input.userId, input.gradeLevel);
      await logAdminAction(ctx.user.id, "user.setGrade", "user", input.userId, {
        gradeLevel: input.gradeLevel,
      });
      return { success: true };
    }),

  getStudentsByGrade: adminProcedure
    .input(z.object({ gradeLevel: z.string() }))
    .query(async ({ input }) => {
      return getStudentsByGrade(input.gradeLevel);
    }),

  bulkPromoteGrade: adminProcedure
    .input(z.object({ fromGrade: z.string(), toGrade: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const count = await bulkPromoteStudentGrade(input.fromGrade, input.toGrade);
      await logAdminAction(ctx.user.id, "grade.bulkPromote", "grade", null, {
        fromGrade: input.fromGrade,
        toGrade: input.toGrade,
        studentsAffected: count,
      });
      return { success: true, studentsAffected: count };
    }),

  /**
   * Schedule the end-of-year grade promotion heartbeat cron.
   * Runs once per year on a date chosen by the admin (default: June 15 at 2am UTC).
   * The site must be deployed before this cron can fire.
   */
  scheduleGradePromotion: adminProcedure
    .input(z.object({
      // 6-field cron: sec min hour dom mon dow (UTC)
      // Default: 0 0 2 15 6 * = June 15 at 02:00 UTC
      cron: z.string().default("0 0 2 15 6 *"),
    }))
    .mutation(async ({ ctx }) => {
      const { createHeartbeatJob } = await import("../_core/heartbeat");
      const { parse: parseCookie } = await import("cookie");
      const { COOKIE_NAME } = await import("../../shared/const");

      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "No session cookie" });

      const job = await createHeartbeatJob({
        name: "end-of-year-grade-promotion",
        cron: "0 0 2 15 6 *",
        path: "/api/scheduled/grade-promotion",
        description: "Annual end-of-year student grade promotion (K→1, 1→2, …, 11→12)",
      }, sessionToken);

      await upsertPlatformSetting("gradePromotionCronTaskUid", job.taskUid, "Task UID for the annual grade promotion heartbeat cron");
      await logAdminAction(ctx.user.id, "grade.schedulePromotion", "grade", null, {
        taskUid: job.taskUid,
        nextExecutionAt: job.nextExecutionAt,
      });

      return { success: true, taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt };
    }),
});
