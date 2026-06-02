/**
 * admin.ts — Admin router (Sprint 18 enhanced)
 * Provides platform stats, user management, course management,
 * CMS, RBAC, platform settings, and audit log procedures.
 * All admin-gated procedures require role === "admin".
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  updateUserAccountType,
  updateUserStatus,
  deleteUser,
  createUser,
  getAllCourses,
  getCourseById,
  updateCourse,
  updateCourseWithStatus,
  getCourseCooldownDays,
  removeStudentFromCourse,
  bulkEnrollStudents,
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
  getUserProfile,
  upsertUserProfile,
  // CMS
  getCmsContent,
  getCmsContentByKey,
  upsertCmsDraft,
  publishCmsContent,
  revertCmsContent,
  getCmsHistory,
  // RBAC
  listAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  assignRoleToUser,
  revokeRoleFromUser,
  getUserRoles,
  getUserPermissions,
  seedDefaultRoles,
  checkAdminPermission,
  // Sprint 40: Inactivity
  getInactiveStudents,
  getInactivityStats,
  recordInactivityNotification,
  getStudentInactivityNotifications,
  hasInactivityNotificationBeenSent,
  updateLastActiveAt,
  // Phase 3C: District Transfer
  transferStudent,
  getMasteryRecordsForContext,
} from "../db";
import { isYoungLearnerGrade } from "../educhamp-helpers";
import { sendEmail } from "../emailService";
import { buildInactivityEmail } from "../emailTemplates/inactivityNotification";
import { BRAND, wrapEmailHtml } from "../emailTemplates/emailBase";

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
    .input(z.object({
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getAllUsers(input.limit, input.offset, input.search);
    }),

  createUser: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(256),
      email: z.string().email(),
      role: z.enum(["student", "parent", "admin", "teacher"]).default("student"),
      accountType: z.enum(["student", "parent", "teacher"]).default("student"),
      grade: z.string().optional(),
      school: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createUser(input);
      await logAdminAction(ctx.user.id, "user.create", "user", null, {
        name: input.name,
        email: input.email,
        accountType: input.accountType,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["student", "parent", "admin", "teacher"]) }))
    .mutation(async ({ ctx, input }) => {
      // P0-4: RBAC — only super-admin or users with users:update_role permission
      if (!(await checkAdminPermission(ctx.user.id, ctx.user.role, "users", "update_role"))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to change user roles." });
      }
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

  updateUserStatus: adminProcedure
    .input(z.object({
      userId: z.number(),
      status: z.enum(["active", "suspended", "deactivated", "pending_verification", "archived", "deleted"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateUserStatus(input.userId, input.status);
      await logAdminAction(ctx.user.id, "user.status_change", "user", input.userId, {
        newStatus: input.status,
        changedBy: ctx.user.id,
      });
      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // P0-4: RBAC — only super-admin or users with users:delete permission
      if (!(await checkAdminPermission(ctx.user.id, ctx.user.role, "users", "delete"))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to delete users." });
      }
      await deleteUser(input.userId);
      await logAdminAction(ctx.user.id, "user.delete", "user", input.userId, {
        deletedBy: ctx.user.id,
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

  removeStudentFromCourse: adminProcedure
    .input(z.object({ userId: z.number(), courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await removeStudentFromCourse(input.userId, input.courseId);
      await logAdminAction(ctx.user.id, "user.course_remove", "user", input.userId, {
        courseId: input.courseId,
        removedBy: ctx.user.id,
      });
      return { success: true };
    }),

  bulkEnrollStudents: adminProcedure
    .input(z.object({ userIds: z.array(z.number()), courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const count = await bulkEnrollStudents(input.userIds, input.courseId);
      await logAdminAction(ctx.user.id, "course.bulk_enroll", "course", input.courseId, {
        userIds: input.userIds,
        enrolled: count,
        enrolledBy: ctx.user.id,
      });
      return { success: true, enrolled: count };
    }),

  getUserEnrollments: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return getUserCourseEnrollments(input.userId);
    }),

  getUserRoles: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return getUserRoles(input.userId);
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
      const { getLessonsByUnit } = await import("../db");
      const courseUnits = await getUnitsForCourse(input.courseId);
      return Promise.all(
        courseUnits.map(async (unit) => {
          const unitLessons = await getLessonsByUnit(unit.id);
          return {
            ...unit,
            lessons: unitLessons.map((l) => ({
              id: l.id,
              lessonNumber: l.lessonNumber,
              title: l.title,
              sortOrder: l.sortOrder,
              videoUrl: l.videoUrl ?? null,
            })),
          };
        })
      );
    }),

  updateCourse: adminProcedure
    .input(z.object({
      courseId: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional(),
      sortOrder: z.number().optional(),
      status: z.enum(["active", "archived", "suspended"]).optional(),
      diagnosticCooldownDays: z.number().min(0).max(365).optional(),
      isTimedExam: z.boolean().optional(),
      timeLimitMinutes: z.number().min(1).max(300).nullable().optional(),
      minAgeRequirement: z.number().min(3).max(21).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { courseId, ...data } = input;
      await updateCourseWithStatus(courseId, data);
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
      // P0-4: RBAC — only super-admin or users with settings:update permission
      if (!(await checkAdminPermission(ctx.user.id, ctx.user.role, "settings", "update"))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to update platform settings." });
      }
      await upsertPlatformSetting(input.key, input.value, input.description, ctx.user.id);
      await logAdminAction(ctx.user.id, "setting.update", "setting", null, {
        key: input.key,
        newValue: input.value,
      });
      return { success: true };
    }),

  // ── Audit Log ──────────────────────────────────────────────────────────────
  getAuditLog: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(50) }))
    .query(async ({ input }) => {
      return getAdminAuditLog(input.limit);
    }),

  // ── CMS ────────────────────────────────────────────────────────────────────
  cms: router({
    listContent: adminProcedure
      .input(z.object({ section: z.string().optional() }))
      .query(async ({ input }) => {
        return getCmsContent(input.section);
      }),

    getContent: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return getCmsContentByKey(input.key);
      }),

    saveDraft: adminProcedure
      .input(z.object({
        key: z.string(),
        section: z.string(),
        label: z.string(),
        draftValue: z.string(),
        contentType: z.enum(["text", "richtext", "image", "url", "boolean"]).default("text"),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertCmsDraft(input.key, input.section, input.label, input.draftValue, ctx.user.id, input.contentType);
        await logAdminAction(ctx.user.id, "cms.draft", "cms", null, { key: input.key });
        return { success: true };
      }),

    publish: adminProcedure
      .input(z.object({ key: z.string(), changeNote: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        // P0-4: RBAC — only super-admin or users with cms:publish permission
        if (!(await checkAdminPermission(ctx.user.id, ctx.user.role, "cms", "publish"))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to publish CMS content." });
        }
        await publishCmsContent(input.key, ctx.user.id, input.changeNote);
        await logAdminAction(ctx.user.id, "cms.publish", "cms", null, { key: input.key, changeNote: input.changeNote });
        return { success: true };
      }),

    revert: adminProcedure
      .input(z.object({ key: z.string(), version: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await revertCmsContent(input.key, input.version, ctx.user.id);
        await logAdminAction(ctx.user.id, "cms.revert", "cms", null, { key: input.key, version: input.version });
        return { success: true };
      }),

    getHistory: adminProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return getCmsHistory(input.key);
      }),
  }),

  // ── RBAC ───────────────────────────────────────────────────────────────────
  rbac: router({
    listRoles: adminProcedure.query(async () => {
      return listAdminRoles();
    }),

    createRole: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        description: z.string().default(""),
        permissions: z.array(z.object({
          resource: z.string(),
          action: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const roleId = await createAdminRole(input.name, input.description, input.permissions, ctx.user.id);
        await logAdminAction(ctx.user.id, "rbac.createRole", "rbac", roleId ?? null, {
          name: input.name,
          permissionCount: input.permissions.length,
        });
        return { success: true, roleId };
      }),

    updateRole: adminProcedure
      .input(z.object({
        roleId: z.number(),
        name: z.string().min(1).max(128),
        description: z.string().default(""),
        permissions: z.array(z.object({
          resource: z.string(),
          action: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateAdminRole(input.roleId, input.name, input.description, input.permissions);
        await logAdminAction(ctx.user.id, "rbac.updateRole", "rbac", input.roleId, {
          name: input.name,
          permissionCount: input.permissions.length,
        });
        return { success: true };
      }),

    deleteRole: adminProcedure
      .input(z.object({ roleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteAdminRole(input.roleId);
        await logAdminAction(ctx.user.id, "rbac.deleteRole", "rbac", input.roleId, {});
        return { success: true };
      }),

    assignRole: adminProcedure
      .input(z.object({ userId: z.number(), roleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // P0-4: RBAC — only super-admin or users with rbac:assign permission
        if (!(await checkAdminPermission(ctx.user.id, ctx.user.role, "rbac", "assign"))) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to assign roles." });
        }
        await assignRoleToUser(input.userId, input.roleId, ctx.user.id);
        await logAdminAction(ctx.user.id, "rbac.assignRole", "user", input.userId, {
          roleId: input.roleId,
          assignedBy: ctx.user.id,
        });
        return { success: true };
      }),

    revokeRole: adminProcedure
      .input(z.object({ userId: z.number(), roleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await revokeRoleFromUser(input.userId, input.roleId);
        await logAdminAction(ctx.user.id, "rbac.revokeRole", "user", input.userId, {
          roleId: input.roleId,
          revokedBy: ctx.user.id,
        });
        return { success: true };
      }),

    getUserPermissions: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getUserPermissions(input.userId);
      }),

    seedDefaultRoles: adminProcedure
      .mutation(async ({ ctx }) => {
        await seedDefaultRoles(ctx.user.id);
        await logAdminAction(ctx.user.id, "rbac.seedDefaultRoles", "rbac", null, {});
        return { success: true };
      }),
  }),

  // ── Public course list (for course switcher) ───────────────────────────────
  getPublicCourses: protectedProcedure.query(async () => {
    const all = await getAllCourses();
    return all.filter((c) => c.isActive);
  }),

  // ── Grade-filtered course catalog for self-enrollment ────────────────────
  getCourseCatalog: protectedProcedure.query(async ({ ctx }) => {
    const all = await getAllCourses();
    const enrollments = await getUserCourseEnrollments(ctx.user.id);
    const profile = await getUserProfile(ctx.user.id);
    const enrolledIds = new Set(enrollments.map((e) => e.enrollment.courseId));
    const studentGrade = profile?.gradeLevel ?? null;

    function gradeToNum(g: string | null): number | null {
      if (!g) return null;
      if (g === "Pre-K") return -1;
      if (g === "Kindergarten") return 0;
      const m = g.match(/(\d+)/);
      return m ? parseInt(m[1]) : null;
    }
    const studentGradeNum = gradeToNum(studentGrade);

    return all
      .filter((c) => c.isActive)
      .map((c) => {
        const courseGradeNum = gradeToNum(c.gradeLevel);
        const isRecommended = studentGrade !== null && c.gradeLevel === studentGrade;
        const isGradeAppropriate =
          studentGradeNum === null ||
          courseGradeNum === null ||
          c.gradeLevel === "AP" ||
          c.gradeLevel === "SAT" ||
          Math.abs(courseGradeNum - studentGradeNum) <= 2;
        return {
          ...c,
          isEnrolled: enrolledIds.has(c.id),
          isRecommended,
          isGradeAppropriate,
        };
      });
  }),

  // ── My enrollments ─────────────────────────────────────────────────────────
  myEnrollments: protectedProcedure.query(async ({ ctx }) => {
    return getUserCourseEnrollments(ctx.user.id);
  }),

  enrollSelf: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getUserCourseEnrollments(ctx.user.id);
      try {
        await enrollUserInCourse(ctx.user.id, input.courseId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith("AGE_GATE:")) {
          const minAge = msg.split(":")[1];
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `You must be at least ${minAge} years old to enrol in this course.`,
          });
        }
        throw err;
      }
      if (existing.length === 0) {
        await setUserActiveCourse(ctx.user.id, input.courseId);
      }
      return { success: true };
    }),

  // ── Set active course ──────────────────────────────────────────────────────
  setActiveCourse: protectedProcedure
    .input(z.object({ courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await setUserActiveCourse(ctx.user.id, input.courseId);
      // Auto-clear parentLedMode when the student switches to a non-Pre-K/K course.
      // This keeps the profile flag in sync with the active course so the AI tutor
      // persona and UI banner stay consistent without relying solely on the runtime
      // guard in tutorStream.ts.
      const newCourse = await getCourseById(input.courseId).catch(() => null);
      if (newCourse && !isYoungLearnerGrade(newCourse.gradeLevel)) {
        const profile = await getUserProfile(ctx.user.id).catch(() => null);
        if ((profile as any)?.parentLedMode === true) {
          await upsertUserProfile(ctx.user.id, { parentLedMode: false });
        }
      }
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

  // ── Email Logs ──────────────────────────────────────────────────────────────
  getEmailLogs: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
      status: z.enum(["all", "sent", "failed", "skipped"]).default("all"),
      deliveryStatus: z.enum(["all", "sent", "delivered", "opened", "bounced", "complained", "failed"]).default("all"),
      search: z.string().optional(),
      dateFrom: z.string().optional(), // ISO date string
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { emailLogs } = await import("../../drizzle/schema");
      const { desc, eq, like, and, gte, lte, sql } = await import("drizzle-orm");

      const conditions: Parameters<typeof and>[0][] = [];
      if (input.status !== "all") {
        conditions.push(eq(emailLogs.status, input.status));
      }
      if (input.deliveryStatus !== "all") {
        conditions.push(eq(emailLogs.deliveryStatus, input.deliveryStatus));
      }
      if (input.search) {
        conditions.push(like(emailLogs.toEmail, `%${input.search}%`));
      }
      if (input.dateFrom) {
        conditions.push(gte(emailLogs.createdAt, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        conditions.push(lte(emailLogs.createdAt, new Date(input.dateTo)));
      }

      const where = conditions.length > 0 ? and(...(conditions as [Parameters<typeof and>[0], ...Parameters<typeof and>[0][]])) : undefined;

      const rows = await db
        .select()
        .from(emailLogs)
        .where(where)
        .orderBy(desc(emailLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailLogs)
        .where(where);

      return { logs: rows, total: Number(countRow?.count ?? 0) };
    }),

  getEmailLogStats: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { emailLogs } = await import("../../drizzle/schema");
    const { sql, eq } = await import("drizzle-orm");

    const [total] = await db.select({ count: sql<number>`count(*)` }).from(emailLogs);
    const [sent] = await db.select({ count: sql<number>`count(*)` }).from(emailLogs).where(eq(emailLogs.status, "sent"));
    const [failed] = await db.select({ count: sql<number>`count(*)` }).from(emailLogs).where(eq(emailLogs.status, "failed"));
    const [skipped] = await db.select({ count: sql<number>`count(*)` }).from(emailLogs).where(eq(emailLogs.status, "skipped"));

    return {
      total: Number(total?.count ?? 0),
      sent: Number(sent?.count ?? 0),
      failed: Number(failed?.count ?? 0),
      skipped: Number(skipped?.count ?? 0),
    };
  }),

  // ─── Demo Requests CRM ──────────────────────────────────────────────────────

  listDemoRequests: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["all", "new", "contacted", "demo_scheduled", "proposal_sent", "closed_won", "closed_lost", "on_hold"]).default("all"),
      interestType: z.enum(["all", "demo", "pilot", "district_license", "campus_license", "partnership", "curriculum_licensing", "other"]).default("all"),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(25),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { rows: [], total: 0 };
      const { demoRequests } = await import("../../drizzle/schema");
      const { count: drizzleCount, eq, desc, like, or, and } = await import("drizzle-orm");

      const conditions: ReturnType<typeof eq>[] = [];
      if (input.status !== "all") {
        conditions.push(eq(demoRequests.status, input.status as "new" | "contacted" | "demo_scheduled" | "proposal_sent" | "closed_won" | "closed_lost" | "on_hold"));
      }
      if (input.interestType !== "all") {
        conditions.push(eq(demoRequests.interestType, input.interestType as "demo" | "pilot" | "district_license" | "campus_license" | "partnership" | "curriculum_licensing" | "other"));
      }
      if (input.search) {
        const s = `%${input.search}%`;
        conditions.push(or(
          like(demoRequests.fullName, s),
          like(demoRequests.schoolName, s),
          like(demoRequests.email, s),
        ) as ReturnType<typeof eq>);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [totalRow]] = await Promise.all([
        db.select().from(demoRequests)
          .where(where)
          .orderBy(desc(demoRequests.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db.select({ value: drizzleCount() }).from(demoRequests).where(where),
      ]);

      return { rows, total: totalRow?.value ?? 0 };
    }),

  getDemoRequest: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return null;
      const { demoRequests } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [row] = await db.select().from(demoRequests).where(eq(demoRequests.id, input.id)).limit(1);
      return row ?? null;
    }),

  updateDemoRequest: adminProcedure
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["new", "contacted", "demo_scheduled", "proposal_sent", "closed_won", "closed_lost", "on_hold"]).optional(),
      assignedTo: z.string().max(256).optional(),
      adminNotes: z.string().max(4000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { ok: true };
      const { demoRequests } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const updates: Record<string, string | Date | null> = { updatedAt: new Date() };
      if (input.status !== undefined) updates.status = input.status;
      if (input.assignedTo !== undefined) updates.assignedTo = input.assignedTo;
      if (input.adminNotes !== undefined) updates.adminNotes = input.adminNotes;

      await db.update(demoRequests).set(updates).where(eq(demoRequests.id, input.id));
      await logAdminAction(ctx.user.id, "demoRequest.update", "demoRequest", input.id, { status: input.status, assignedTo: input.assignedTo });
      return { ok: true };
    }),

  respondToDemoRequest: adminProcedure
    .input(z.object({
      id: z.number().int(),
      replyMessage: z.string().min(10).max(5000),
      newStatus: z.enum(["contacted", "demo_scheduled", "proposal_sent", "closed_won", "closed_lost", "on_hold"]).default("contacted"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { demoRequests } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const [request] = await db.select().from(demoRequests).where(eq(demoRequests.id, input.id)).limit(1);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Demo request not found" });

      // Send reply email to requester
      const { sendEmail } = await import("../emailService");
      await sendEmail({
        to: request.email,
        subject: `EduChamp — Follow-up on your inquiry from ${request.schoolName}`,
        templateName: "demo_request_reply",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700">EduChamp</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">AI-Powered Adaptive Learning</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px">Hi ${request.fullName},</h2>
          <div style="color:#475569;font-size:15px;line-height:1.7;white-space:pre-wrap">${input.replyMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0">
          <a href="https://educhamp.app" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px">Visit EduChamp →</a>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="margin:0;color:#94a3b8;font-size:12px">EduChamp · AI-Powered Pre-K–12 Adaptive Learning</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
        text: `Hi ${request.fullName},\n\n${input.replyMessage}\n\nThe EduChamp Team\nhttps://educhamp.app`,
      });

      // Update status and mark responded
      await db.update(demoRequests)
        .set({ status: input.newStatus, respondedAt: new Date(), updatedAt: new Date() })
        .where(eq(demoRequests.id, input.id));

      await logAdminAction(ctx.user.id, "demoRequest.respond", "demoRequest", input.id, { newStatus: input.newStatus });
      return { ok: true };
    }),

  getDemoRequestStats: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return { total: 0, new: 0, contacted: 0, scheduled: 0, won: 0 };
    const { demoRequests } = await import("../../drizzle/schema");
    const { count: drizzleCount, eq } = await import("drizzle-orm");

    const [total, newCount, contacted, scheduled, won] = await Promise.all([
      db.select({ v: drizzleCount() }).from(demoRequests),
      db.select({ v: drizzleCount() }).from(demoRequests).where(eq(demoRequests.status, "new")),
      db.select({ v: drizzleCount() }).from(demoRequests).where(eq(demoRequests.status, "contacted")),
      db.select({ v: drizzleCount() }).from(demoRequests).where(eq(demoRequests.status, "demo_scheduled")),
      db.select({ v: drizzleCount() }).from(demoRequests).where(eq(demoRequests.status, "closed_won")),
    ]);

    return {
      total: total[0]?.v ?? 0,
      new: newCount[0]?.v ?? 0,
      contacted: contacted[0]?.v ?? 0,
      scheduled: scheduled[0]?.v ?? 0,
      won: won[0]?.v ?? 0,
    };
  }),

  // ─── Email Suppression Management ──────────────────────────────────────────

  listSuppressions: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().nonnegative().default(0),
      search: z.string().optional(),
      reason: z.enum(["all", "bounced", "complained", "manual"]).default("all"),
      status: z.enum(["all", "active", "inactive"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { emailSuppression } = await import("../../drizzle/schema");
      const { desc, eq, like, and, sql } = await import("drizzle-orm");

      const conditions: Parameters<typeof and>[0][] = [];
      if (input.reason !== "all") conditions.push(eq(emailSuppression.reason, input.reason));
      if (input.status === "active") conditions.push(eq(emailSuppression.isActive, true));
      if (input.status === "inactive") conditions.push(eq(emailSuppression.isActive, false));
      if (input.search) conditions.push(like(emailSuppression.email, `%${input.search}%`));

      const where = conditions.length > 0
        ? and(...(conditions as [Parameters<typeof and>[0], ...Parameters<typeof and>[0][]]))
        : undefined;

      const rows = await db
        .select()
        .from(emailSuppression)
        .where(where)
        .orderBy(desc(emailSuppression.suppressedAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailSuppression)
        .where(where);

      return { suppressions: rows, total: Number(countRow?.count ?? 0) };
    }),

  unsuppressEmail: adminProcedure
    .input(z.object({
      suppressionId: z.number().int(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { emailSuppression, suppressionAuditLog } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const [entry] = await db.select().from(emailSuppression).where(eq(emailSuppression.id, input.suppressionId)).limit(1);
      if (!entry) throw new TRPCError({ code: "NOT_FOUND", message: "Suppression entry not found" });

      await db.update(emailSuppression)
        .set({ isActive: false, unsuppressedAt: new Date() })
        .where(eq(emailSuppression.id, input.suppressionId));

      await db.insert(suppressionAuditLog).values({
        suppressionId: input.suppressionId,
        email: entry.email,
        action: "unsuppressed",
        reason: entry.reason,
        adminId: ctx.user.id,
        adminName: ctx.user.name ?? undefined,
        notes: input.notes ?? `Manually unsuppressed by admin ${ctx.user.name ?? ctx.user.id}`,
      });

      await logAdminAction(ctx.user.id, "suppression.unsuppress", "emailSuppression", input.suppressionId, { email: entry.email, reason: entry.reason });
      return { ok: true, email: entry.email };
    }),

  suppressEmailManual: adminProcedure
    .input(z.object({
      email: z.string().email(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { suppressEmail } = await import("../emailService");
      await suppressEmail(input.email, "manual", undefined, input.notes ?? `Manually suppressed by admin ${ctx.user.name ?? ctx.user.id}`);

      // Write audit log entry
      const db = await (await import("../db")).getDb();
      if (db) {
        const { emailSuppression, suppressionAuditLog } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const [entry] = await db.select({ id: emailSuppression.id }).from(emailSuppression).where(eq(emailSuppression.email, input.email.toLowerCase())).limit(1);
        if (entry) {
          await db.insert(suppressionAuditLog).values({
            suppressionId: entry.id,
            email: input.email.toLowerCase(),
            action: "suppressed",
            reason: "manual",
            adminId: ctx.user.id,
            adminName: ctx.user.name ?? undefined,
            notes: input.notes ?? `Manually suppressed by admin ${ctx.user.name ?? ctx.user.id}`,
          });
        }
      }

      await logAdminAction(ctx.user.id, "suppression.suppress", "emailSuppression", null, { email: input.email });
      return { ok: true };
    }),

  getSuppressionAuditLog: adminProcedure
    .input(z.object({
      email: z.string().email().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().nonnegative().default(0),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { suppressionAuditLog } = await import("../../drizzle/schema");
      const { desc, eq, sql } = await import("drizzle-orm");

      const where = input.email ? eq(suppressionAuditLog.email, input.email.toLowerCase()) : undefined;

      const rows = await db
        .select()
        .from(suppressionAuditLog)
        .where(where)
        .orderBy(desc(suppressionAuditLog.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(suppressionAuditLog)
        .where(where);

      return { entries: rows, total: Number(countRow?.count ?? 0) };
    }),

  getSuppressionStatus: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return null;
      const { emailSuppression } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const [row] = await db
        .select()
        .from(emailSuppression)
        .where(and(eq(emailSuppression.email, input.email.toLowerCase()), eq(emailSuppression.isActive, true)))
        .limit(1);
      return row ?? null;
    }),

  scheduleGradePromotion: adminProcedure
    .input(z.object({
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

  /** Schedule the weekly parent digest cron (runs every Monday at 8 AM UTC). */
  scheduleWeeklyParentDigest: adminProcedure
    .mutation(async ({ ctx }) => {
      const { createHeartbeatJob } = await import("../_core/heartbeat");
      const { parse: parseCookie } = await import("cookie");
      const { COOKIE_NAME } = await import("../../shared/const");
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      if (!sessionToken) throw new TRPCError({ code: "UNAUTHORIZED", message: "No session cookie" });
      const job = await createHeartbeatJob({
        name: "weekly-parent-digest",
        cron: "0 0 8 * * 1", // Every Monday at 08:00 UTC
        path: "/api/scheduled/weekly-parent-digest",
        description: "Weekly learning digest email for parents of Pre-K through Grade 2 students",
      }, sessionToken);
      await upsertPlatformSetting("weeklyParentDigestCronTaskUid", job.taskUid, "Task UID for the weekly parent digest heartbeat cron");
      await logAdminAction(ctx.user.id, "digest.scheduleWeeklyParentDigest", "digest", null, {
        taskUid: job.taskUid,
        nextExecutionAt: job.nextExecutionAt,
      });
      return { success: true, taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt };
    }),

  exportSuppressions: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      reason: z.enum(["all", "bounced", "complained", "manual"]).default("all"),
      status: z.enum(["all", "active", "inactive"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { emailSuppression } = await import("../../drizzle/schema");
      const { desc, eq, like, and } = await import("drizzle-orm");

      const conditions: Parameters<typeof and>[0][] = [];
      if (input.reason !== "all") conditions.push(eq(emailSuppression.reason, input.reason));
      if (input.status === "active") conditions.push(eq(emailSuppression.isActive, true));
      if (input.status === "inactive") conditions.push(eq(emailSuppression.isActive, false));
      if (input.search) conditions.push(like(emailSuppression.email, `%${input.search}%`));

      const where = conditions.length > 0
        ? and(...(conditions as [Parameters<typeof and>[0], ...Parameters<typeof and>[0][]]))
        : undefined;

      const rows = await db
        .select()
        .from(emailSuppression)
        .where(where)
        .orderBy(desc(emailSuppression.suppressedAt))
        .limit(10000); // safety cap

      // Build CSV with UTF-8 BOM
      const header = "email,reason,source,suppressedAt,unsuppressedAt,status";
      const escape = (v: string | null | undefined) => {
        if (v == null) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = rows.map(r => [
        escape(r.email),
        escape(r.reason),
        escape(r.resendEventId ? "resend" : "manual"),
        escape(r.suppressedAt ? new Date(r.suppressedAt).toISOString() : ""),
        escape(r.unsuppressedAt ? new Date(r.unsuppressedAt).toISOString() : ""),
        escape(r.isActive ? "active" : "inactive"),
      ].join(","));

      const csv = "\uFEFF" + [header, ...lines].join("\n");
      return { csv, total: rows.length };
    }),

  // ── Inactivity Monitoring (Sprint 40) ──────────────────────────────────────

  /** List inactive students filtered by minimum inactive days. */
  getInactiveStudents: adminProcedure
    .input(z.object({
      minDays: z.number().min(1).max(365).default(7),
      maxDays: z.number().min(1).max(365).optional(),
    }))
    .query(async ({ input }) => {
      const rows = await getInactiveStudents(input.minDays, input.maxDays);
      const now = Date.now();
      return rows.map((s) => {
        const lastActive = s.lastActiveAt ?? s.lastSignedIn;
        const inactiveDays = Math.floor((now - new Date(lastActive).getTime()) / 86_400_000);
        return { ...s, inactiveDays, lastActive };
      });
    }),

  /** Aggregate inactivity counts by tier. */
  getInactivityStats: adminProcedure.query(async () => {
    return getInactivityStats();
  }),

  /** Manually trigger an inactivity follow-up notification for a student. */
  triggerManualInactivityNotification: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { getUserById, getChildrenForParent: _getChildrenForParent } = await import("../db");
      const student = await getUserById(input.userId);
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
      const now = Date.now();
      const lastActive = student.lastActiveAt ?? student.lastSignedIn;
      const inactiveDays = Math.floor((now - new Date(lastActive).getTime()) / 86_400_000);
      const origin = "https://educhamp.app";
      if (student.email) {
        const email = buildInactivityEmail({
          studentName: student.name ?? "Student",
          inactiveDays,
          lastActiveDate: new Date(lastActive).toLocaleDateString(),
          resumeUrl: `${origin}/courses`,
          recipientType: "student",
        });
        await sendEmail({ to: student.email, subject: email.subject, html: email.html, text: email.text, templateName: "inactivityReminder" });
        await recordInactivityNotification(student.id, "manual", "student", student.email, inactiveDays);
      }
      await logAdminAction(ctx.user.id, "user.inactivity_notification", "user", student.id, {
        inactiveDays,
        triggeredBy: ctx.user.id,
      });
      return { success: true };
    }),

  /** Export inactive students as CSV. */
  exportInactivityReport: adminProcedure
    .input(z.object({ minDays: z.number().min(1).default(7) }))
    .query(async ({ input }) => {
      const rows = await getInactiveStudents(input.minDays);
      const now = Date.now();
      const header = "Name,Email,Last Active,Inactive Days,Status";
      const escape = (v: unknown) => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = rows.map((s) => {
        const lastActive = s.lastActiveAt ?? s.lastSignedIn;
        const inactiveDays = Math.floor((now - new Date(lastActive).getTime()) / 86_400_000);
        return [
          escape(s.name),
          escape(s.email),
          escape(new Date(lastActive).toISOString()),
          escape(inactiveDays),
          escape(s.status),
        ].join(",");
      });
      const csv = "\uFEFF" + [header, ...lines].join("\n");
      return { csv, total: rows.length };
    }),

  /** Get inactivity notification history for a student. */
  getStudentInactivityHistory: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return getStudentInactivityNotifications(input.userId);
    }),

  // ─── Bulk Management ──────────────────────────────────────────────────
  /**
   * Bulk update status for multiple users.
   * Applies the same status change to all provided user IDs and logs each action.
   */
  bulkUpdateUserStatus: adminProcedure
    .input(
      z.object({
        userIds: z.array(z.number()).min(1).max(200),
        status: z.enum(["active", "suspended", "deactivated", "pending_verification", "deleted"]),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results: { userId: number; success: boolean; error?: string }[] = [];
      for (const userId of input.userIds) {
        try {
          await updateUserStatus(userId, input.status);
          await logAdminAction(ctx.user.id, "user.bulk_status_change", "user", userId, {
            newStatus: input.status,
            reason: input.reason ?? null,
            bulkOperation: true,
            totalInBatch: input.userIds.length,
          });
          results.push({ userId, success: true });
        } catch (err) {
          results.push({ userId, success: false, error: String(err) });
        }
      }
      const successCount = results.filter((r) => r.success).length;
      return { successCount, failCount: results.length - successCount, results };
    }),

  /**
   * Bulk assign a course to multiple users.
   * Bypasses parent approval (admin action). Logs each enrollment.
   */
  bulkAssignCourse: adminProcedure
    .input(
      z.object({
        userIds: z.array(z.number()).min(1).max(200),
        courseId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseById(input.courseId);
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const results: { userId: number; success: boolean; error?: string }[] = [];
      for (const userId of input.userIds) {
        try {
          await enrollUserInCourse(userId, input.courseId);
          await logAdminAction(ctx.user.id, "course.bulk_assign", "user", userId, {
            courseId: input.courseId,
            courseTitle: course.title,
            bulkOperation: true,
            totalInBatch: input.userIds.length,
          });
          results.push({ userId, success: true });
        } catch (err) {
          results.push({ userId, success: false, error: String(err) });
        }
      }
      const successCount = results.filter((r) => r.success).length;
      return { successCount, failCount: results.length - successCount, results };
    }),

  /**
   * Bulk remove a course from multiple users.
   */
  bulkRemoveCourse: adminProcedure
    .input(
      z.object({
        userIds: z.array(z.number()).min(1).max(200),
        courseId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const course = await getCourseById(input.courseId);
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      const results: { userId: number; success: boolean; error?: string }[] = [];
      for (const userId of input.userIds) {
        try {
          await removeStudentFromCourse(userId, input.courseId);
          await logAdminAction(ctx.user.id, "course.bulk_remove", "user", userId, {
            courseId: input.courseId,
            courseTitle: course.title,
            bulkOperation: true,
            totalInBatch: input.userIds.length,
          });
          results.push({ userId, success: true });
        } catch (err) {
          results.push({ userId, success: false, error: String(err) });
        }
      }
      const successCount = results.filter((r) => r.success).length;
      return { successCount, failCount: results.length - successCount, results };
    }),

  // ─── Email Settings ─────────────────────────────────────────────────────────

  /**
   * Get current email sender settings from platformSettings.
   */
  getEmailSettings: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { platformSettings } = await import("../../drizzle/schema");
    const { sql } = await import("drizzle-orm");
    const keys = ["email.fromAddress", "email.fromName", "email.replyTo", "email.categories"];
    const rows = await db.select().from(platformSettings).where(
      sql`${platformSettings.key} IN (${sql.join(keys.map((k) => sql`${k}`), sql`, `)})`
    );
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    return {
      fromAddress: map["email.fromAddress"] ?? "EduChamp <hi@educhamp.app>",
      fromName: map["email.fromName"] ?? "EduChamp",
      replyTo: map["email.replyTo"] ?? "hi@educhamp.app",
      categories: map["email.categories"]
        ? (JSON.parse(map["email.categories"]) as Record<string, boolean>)
        : {
            transactional: true,
            parentDigest: true,
            trialReminders: true,
            inactivityAlerts: true,
            courseRequests: true,
            marketing: false,
          },
    };
  }),

  /**
   * Save email sender settings to platformSettings.
   */
  saveEmailSettings: adminProcedure
    .input(
      z.object({
        fromAddress: z.string().min(1),
        fromName: z.string().min(1),
        replyTo: z.string().email(),
        categories: z.record(z.string(), z.boolean()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: { key: string; value: string; label: string; category: string }[] = [
        { key: "email.fromAddress", value: input.fromAddress, label: "From Address", category: "email" },
        { key: "email.fromName", value: input.fromName, label: "From Name", category: "email" },
        { key: "email.replyTo", value: input.replyTo, label: "Reply-To Address", category: "email" },
      ];
      if (input.categories) {
        updates.push({
          key: "email.categories",
          value: JSON.stringify(input.categories),
          label: "Email Categories",
          category: "email",
        });
      }
      for (const u of updates) {
        await upsertPlatformSetting(u.key, u.value, u.label);
      }
      await logAdminAction(ctx.user.id, "email.settings.update", "platform", 0, {
        fromAddress: input.fromAddress,
      });
      return { success: true };
    }),

  /**
   * Send a test email to verify the current sender configuration.
   */
  sendTestEmail: adminProcedure
    .input(z.object({ to: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const body = `
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:${BRAND.textPrimary};">Test Email from EduChamp</h2>
        <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;">
          This is a test email sent from the EduChamp Admin Console to verify that your email configuration is working correctly.
        </p>
        <div style="background:${BRAND.footerBg};border-radius:12px;padding:20px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:${BRAND.textMuted};"><strong>Sender:</strong> ${BRAND.fromAddress}</p>
          <p style="margin:8px 0 0;font-size:13px;color:${BRAND.textMuted};"><strong>Reply-To:</strong> ${BRAND.supportEmail}</p>
          <p style="margin:8px 0 0;font-size:13px;color:${BRAND.textMuted};"><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <p style="margin:8px 0 0;font-size:13px;color:${BRAND.textMuted};"><strong>Sent by admin:</strong> ${ctx.user.name}</p>
        </div>
        <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">If you received this email, your email delivery is working correctly. ✅</p>
      `;
      const html = wrapEmailHtml({ bodyHtml: body, previewText: "EduChamp email configuration test" });
      const result = await sendEmail({
        to: input.to,
        subject: "✅ EduChamp Email Configuration Test",
        html,
        templateName: "test-email",
        text: `Test email from EduChamp Admin Console.\n\nSender: ${BRAND.fromAddress}\nSent at: ${new Date().toISOString()}\nSent by: ${ctx.user.name}\n\nIf you received this, email delivery is working correctly.`,
      });
      await logAdminAction(ctx.user.id, "email.test.sent", "platform", 0, {
        to: input.to,
        success: result.success,
      });
      return result;
    }),

  /**
   * Fetch Resend domain list and DNS record status for educhamp.app.
   */
  getResendDomainStatus: adminProcedure.query(async () => {
    const { Resend } = await import("resend");
    const { ENV } = await import("../_core/env");
    if (!ENV.resendApiKey) {
      return { error: "No RESEND_API_KEY configured", domains: [] };
    }
    const resend = new Resend(ENV.resendApiKey);
    try {
      const { data, error } = await resend.domains.list();
      if (error || !data) return { error: error?.message ?? "Failed to fetch domains", domains: [] };
      const domainsWithRecords = await Promise.all(
        data.data.map(async (domain) => {
          try {
            const { data: detail } = await resend.domains.get(domain.id);
            return {
              id: domain.id,
              name: domain.name,
              status: domain.status,
              region: domain.region,
              createdAt: domain.created_at,
              records: (detail?.records ?? []) as Array<{
                record: string;
                name: string;
                type: string;
                value?: string;
                ttl?: string;
                status: string;
                priority?: number;
              }>,
            };
          } catch {
            return {
              id: domain.id,
              name: domain.name,
              status: domain.status,
              region: domain.region,
              createdAt: domain.created_at,
              records: [] as Array<{
                record: string;
                name: string;
                type: string;
                value?: string;
                ttl?: string;
                status: string;
                priority?: number;
              }>,
            };
          }
        })
      );
      return { domains: domainsWithRecords, error: null };
    } catch (err) {
      return { error: String(err), domains: [] };
    }
  }),

  /**
   * Trigger Resend domain verification for a specific domain ID.
   */
  verifyResendDomain: adminProcedure
    .input(z.object({ domainId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { Resend } = await import("resend");
      const { ENV } = await import("../_core/env");
      if (!ENV.resendApiKey) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No RESEND_API_KEY configured" });
      }
      const resend = new Resend(ENV.resendApiKey);
      const { data, error } = await resend.domains.verify(input.domainId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      await logAdminAction(ctx.user.id, "email.domain.verify", "platform", 0, {
        domainId: input.domainId,
      });
      return { success: true, data };
    }),

  // ─── Phase 3C: District Transfer ──────────────────────────────────────────

  /**
   * List all active districts for the transfer form selector.
   */
  listDistricts: adminProcedure.query(async () => {
    const { getDb } = await import("../db");
    const { districts } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: districts.id,
        name: districts.name,
        shortName: districts.shortName,
        stateId: districts.stateId,
        defaultFrameworkId: districts.defaultFrameworkId,
      })
      .from(districts)
      .where(eq(districts.isActive, true))
      .orderBy(districts.name);
  }),

  /**
   * Get mastery records for a student's active enrollment context.
   * Used to show the before-state in the transfer comparison.
   */
  getStudentMasteryContext: adminProcedure
    .input(z.object({ studentId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { enrollmentContexts } = await import("../../drizzle/schema");
      const { eq, and, desc } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return { context: null, masteryRecords: [] };
      const [ctx] = await db
        .select()
        .from(enrollmentContexts)
        .where(and(eq(enrollmentContexts.studentId, input.studentId), eq(enrollmentContexts.isActive, true)))
        .orderBy(desc(enrollmentContexts.createdAt))
        .limit(1);
      if (!ctx) return { context: null, masteryRecords: [] };
      const records = await getMasteryRecordsForContext(ctx.id);
      return { context: ctx, masteryRecords: records };
    }),

  /**
   * Transfer a student from one district to another.
   * Deactivates the current enrollmentContext, creates a new one,
   * and writes weight-adjusted masteryRecords via the crosswalk.
   */
  transferStudent: adminProcedure
    .input(
      z.object({
        studentId: z.number().int().positive(),
        fromDistrictId: z.number().int().positive(),
        toDistrictId: z.number().int().positive(),
        toCourseId: z.number().int().positive(),
        toFrameworkId: z.number().int().positive(),
        academicYear: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await transferStudent(input);
      if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Transfer failed" });
      await logAdminAction(ctx.user.id, "student.district.transfer", "user", input.studentId, {
        fromDistrictId: input.fromDistrictId,
        toDistrictId: input.toDistrictId,
        toCourseId: input.toCourseId,
        transferredCount: result.transferredCount,
        skippedCount: result.skippedCount,
      });
      return result;
    }),

  /**
   * Get mastery records for a specific enrollmentContext (for after-state comparison).
   */
  getMasteryForContext: adminProcedure
    .input(z.object({ enrollmentContextId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return getMasteryRecordsForContext(input.enrollmentContextId);
    }),

  // ─── System Health ─────────────────────────────────────────────────────────

  /**
   * Returns server health metrics: uptime, DB ping, memory usage, Node version.
   */
  getSystemHealth: adminProcedure.query(async () => {
    const { getDb } = await import("../db");
    const startPing = Date.now();
    let dbPingMs: number | null = null;
    let dbStatus: "ok" | "error" = "error";
    try {
      const db = await getDb();
      if (db) {
        await db.execute("SELECT 1");
        dbPingMs = Date.now() - startPing;
        dbStatus = "ok";
      }
    } catch {
      dbStatus = "error";
    }
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
    const pingMs = dbPingMs ?? 0;
    // Append to in-process ring buffer for sparklines
    appendMetricSnapshot({ ts: Date.now(), dbPingMs: pingMs, heapUsedMb, heapTotalMb });
    return {
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      env: process.env.NODE_ENV ?? "unknown",
      dbStatus,
      dbPingMs,
      memoryRssMb: Math.round(mem.rss / 1024 / 1024),
      memoryHeapUsedMb: heapUsedMb,
      memoryHeapTotalMb: heapTotalMb,
      checkedAt: Date.now(),
    };
  }),

  /**
   * Returns the last N admin audit log entries for the error/activity feed.
   */
  getRecentAuditLog: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return getAdminAuditLog(input.limit);
    }),

  // ─── Email Provider Management ────────────────────────────────────────────

  /**
   * Get the active email provider settings (API key masked for display).
   */
  getActiveEmailProvider: adminProcedure.query(async () => {
    const { getDb } = await import("../db");
    const { emailSettings } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const { maskApiKey } = await import("../services/email/crypto");
    const db = await getDb();
    if (!db) return null;
    const [row] = await db.select().from(emailSettings).where(eq(emailSettings.isActive, true)).limit(1);
    if (!row) return null;
    return {
      id: row.id,
      provider: row.provider,
      fromAddress: row.fromAddress,
      fromName: row.fromName,
      replyTo: row.replyTo,
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpSecure: row.smtpSecure,
      smtpUsername: row.smtpUsername,
      apiKeyMasked: maskApiKey(row.apiKey),
      webhookSecret: row.webhookSecret ? maskApiKey(row.webhookSecret) : null,
      lastTestedAt: row.lastTestedAt,
      lastTestStatus: row.lastTestStatus,
      updatedAt: row.updatedAt,
    };
  }),

  /**
   * List all email provider configurations (masked).
   */
  listEmailProviders: adminProcedure.query(async () => {
    const { getDb } = await import("../db");
    const { emailSettings } = await import("../../drizzle/schema");
    const { maskApiKey } = await import("../services/email/crypto");
    const { desc } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(emailSettings).orderBy(desc(emailSettings.createdAt));
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      fromAddress: row.fromAddress,
      fromName: row.fromName,
      replyTo: row.replyTo,
      smtpHost: row.smtpHost,
      smtpPort: row.smtpPort,
      smtpSecure: row.smtpSecure,
      smtpUsername: row.smtpUsername,
      apiKeyMasked: maskApiKey(row.apiKey),
      isActive: row.isActive,
      lastTestedAt: row.lastTestedAt,
      lastTestStatus: row.lastTestStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }),

  /**
   * Upsert an email provider configuration.
   * If id is provided, updates that row; otherwise inserts a new row.
   * If setActive is true, deactivates all other rows first.
   */
  saveEmailProvider: adminProcedure
    .input(z.object({
      id: z.number().int().positive().optional(),
      provider: z.enum(["resend", "smtp", "sendgrid"]),
      fromAddress: z.string().email(),
      fromName: z.string().min(1).max(100),
      replyTo: z.string().email().optional().nullable(),
      apiKey: z.string().min(1).optional(), // omit to keep existing key
      smtpHost: z.string().optional().nullable(),
      smtpPort: z.number().int().min(1).max(65535).optional().nullable(),
      smtpSecure: z.boolean().optional().nullable(),
      smtpUsername: z.string().optional().nullable(),
      webhookSecret: z.string().optional().nullable(),
      setActive: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { emailSettings } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { encryptSecret, isEncrypted } = await import("../services/email/crypto");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (input.setActive) {
        await db.update(emailSettings).set({ isActive: false });
      }

      const encryptedKey = input.apiKey ? encryptSecret(input.apiKey) : undefined;
      const encryptedWebhook = input.webhookSecret ? encryptSecret(input.webhookSecret) : undefined;

      if (input.id) {
        const [existing] = await db.select().from(emailSettings).where(eq(emailSettings.id, input.id)).limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Email provider not found" });
        await db.update(emailSettings).set({
          provider: input.provider,
          fromAddress: input.fromAddress,
          fromName: input.fromName,
          replyTo: input.replyTo ?? null,
          ...(encryptedKey ? { apiKey: encryptedKey } : {}),
          smtpHost: input.smtpHost ?? null,
          smtpPort: input.smtpPort ?? null,
          smtpSecure: input.smtpSecure ?? null,
          smtpUsername: input.smtpUsername ?? null,
          ...(encryptedWebhook !== undefined ? { webhookSecret: encryptedWebhook } : {}),
          isActive: input.setActive ? true : existing.isActive,
        }).where(eq(emailSettings.id, input.id));
        await logAdminAction(ctx.user.id, "email.provider.update", "emailSettings", input.id, { provider: input.provider, setActive: input.setActive });
        return { id: input.id };
      } else {
        if (!input.apiKey) throw new TRPCError({ code: "BAD_REQUEST", message: "apiKey required for new provider" });
        const [inserted] = await db.insert(emailSettings).values({
          provider: input.provider,
          fromAddress: input.fromAddress,
          fromName: input.fromName,
          replyTo: input.replyTo ?? null,
          apiKey: encryptedKey!,
          smtpHost: input.smtpHost ?? null,
          smtpPort: input.smtpPort ?? null,
          smtpSecure: input.smtpSecure ?? null,
          smtpUsername: input.smtpUsername ?? null,
          webhookSecret: encryptedWebhook ?? null,
          isActive: input.setActive,
          createdBy: ctx.user.id,
        }).$returningId();
        await logAdminAction(ctx.user.id, "email.provider.create", "emailSettings", inserted.id, { provider: input.provider, setActive: input.setActive });
        return { id: inserted.id };
      }
    }),

  /**
   * Activate a specific email provider row (deactivates all others).
   */
  activateEmailProvider: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { emailSettings } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(emailSettings).set({ isActive: false });
      await db.update(emailSettings).set({ isActive: true }).where(eq(emailSettings.id, input.id));
      await logAdminAction(ctx.user.id, "email.provider.activate", "emailSettings", input.id, {});
      return { success: true };
    }),

  /**
   * Delete an email provider configuration (cannot delete the active one).
   */
  deleteEmailProvider: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { emailSettings } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(emailSettings).where(eq(emailSettings.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      if (row.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete the active email provider. Activate another provider first." });
      await db.delete(emailSettings).where(and(eq(emailSettings.id, input.id)));
      await logAdminAction(ctx.user.id, "email.provider.delete", "emailSettings", input.id, { provider: row.provider });
      return { success: true };
    }),

  /**
   * Test the connection for a specific provider row.
   * Updates lastTestedAt and lastTestStatus on the row.
   */
  testEmailProviderConnection: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { emailSettings } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { decryptSecret, isEncrypted } = await import("../services/email/crypto");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(emailSettings).where(eq(emailSettings.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const rawKey = isEncrypted(row.apiKey) ? decryptSecret(row.apiKey) : row.apiKey;
      let result: { ok: boolean; error?: string };

      try {
        switch (row.provider) {
          case "resend": {
            const { ResendProvider } = await import("../services/email/providers/resend");
            result = await new ResendProvider(rawKey).testConnection();
            break;
          }
          case "smtp": {
            const { SmtpProvider } = await import("../services/email/providers/smtp");
            result = await new SmtpProvider({
              host: row.smtpHost!, port: row.smtpPort!, secure: row.smtpSecure ?? false,
              username: row.smtpUsername!, password: rawKey,
            }).testConnection();
            break;
          }
          case "sendgrid": {
            const { SendGridProvider } = await import("../services/email/providers/sendgrid");
            result = await new SendGridProvider(rawKey).testConnection();
            break;
          }
          default:
            result = { ok: false, error: "Unknown provider" };
        }
      } catch (err: unknown) {
        result = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }

      await db.update(emailSettings).set({
        lastTestedAt: new Date(),
        lastTestStatus: result.ok ? "ok" : "failed",
      }).where(eq(emailSettings.id, input.id));

      await logAdminAction(ctx.user.id, "email.provider.test", "emailSettings", input.id, { ok: result.ok, error: result.error });
      return result;
    }),

  /**
   * Send a test email via the active provider (or a specific provider row).
   * Extends the existing sendTestEmail procedure with provider selection.
   */
  sendTestEmailViaProvider: adminProcedure
    .input(z.object({
      to: z.string().email(),
      providerId: z.number().int().positive().optional(), // defaults to active
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { emailSettings } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { decryptSecret, isEncrypted } = await import("../services/email/crypto");
      const { wrapEmailHtml } = await import("../emailTemplates/emailBase");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let row;
      if (input.providerId) {
        const [r] = await db.select().from(emailSettings).where(eq(emailSettings.id, input.providerId)).limit(1);
        row = r;
      } else {
        const [r] = await db.select().from(emailSettings).where(eq(emailSettings.isActive, true)).limit(1);
        row = r;
      }
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "No email provider configured" });

      const rawKey = isEncrypted(row.apiKey) ? decryptSecret(row.apiKey) : row.apiKey;
      const html = wrapEmailHtml({
        bodyHtml: `<h2 style="margin:0 0 12px">Test Email</h2><p>This is a test email sent from EduChamp Admin Console via <strong>${row.provider}</strong>.</p><p>If you received this, your email configuration is working correctly.</p>`,
        previewText: "EduChamp email delivery test",
      });

      let sendResult: { success: boolean; messageId?: string; error?: string };
      try {
        switch (row.provider) {
          case "resend": {
            const { ResendProvider } = await import("../services/email/providers/resend");
            sendResult = await new ResendProvider(rawKey).send(
              { to: input.to, subject: "EduChamp — Email Delivery Test", html },
              row.fromAddress, row.fromName
            );
            break;
          }
          case "smtp": {
            const { SmtpProvider } = await import("../services/email/providers/smtp");
            sendResult = await new SmtpProvider({
              host: row.smtpHost!, port: row.smtpPort!, secure: row.smtpSecure ?? false,
              username: row.smtpUsername!, password: rawKey,
            }).send({ to: input.to, subject: "EduChamp — Email Delivery Test", html }, row.fromAddress, row.fromName);
            break;
          }
          case "sendgrid": {
            const { SendGridProvider } = await import("../services/email/providers/sendgrid");
            sendResult = await new SendGridProvider(rawKey).send(
              { to: input.to, subject: "EduChamp — Email Delivery Test", html },
              row.fromAddress, row.fromName
            );
            break;
          }
          default:
            sendResult = { success: false, error: "Unknown provider" };
        }
      } catch (err: unknown) {
        sendResult = { success: false, error: err instanceof Error ? err.message : String(err) };
      }

      await logAdminAction(ctx.user.id, "email.test.send", "emailSettings", row.id, { to: input.to, success: sendResult.success });
      return sendResult;
    }),

  /**
   * Retry a failed email log entry.
   */
  retryEmailLog: adminProcedure
    .input(z.object({ logId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { emailLogs } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { sendEmail } = await import("../emailService");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [log] = await db.select().from(emailLogs).where(eq(emailLogs.id, input.logId)).limit(1);
      if (!log) throw new TRPCError({ code: "NOT_FOUND", message: "Email log entry not found" });
      if (log.status !== "failed") throw new TRPCError({ code: "BAD_REQUEST", message: "Only failed emails can be retried" });
      const result = await sendEmail({
        to: log.toEmail,
        subject: log.subject,
        html: `<p>Retry of email: ${log.subject}</p>`,
        text: `Retry of email: ${log.subject}`,
        templateName: log.templateName,
      });
      await logAdminAction(ctx.user.id, "email.log.retry", "emailLogs", input.logId, { success: result.success });
      return result;
    }),

  // ─── User Impersonation ────────────────────────────────────────────────────

  /**
   * Start an impersonation session for the given user.
   * Returns a short-lived token (15 min) that the frontend stores as a cookie.
   */
  impersonateUser: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { adminImpersonationSessions } = await import("../../drizzle/schema");
      const crypto = await import("crypto");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await db.insert(adminImpersonationSessions).values({
        adminId: ctx.user.id,
        impersonatedUserId: input.userId,
        token,
        expiresAt,
      });
      await logAdminAction(ctx.user.id, "user.impersonate.start", "user", input.userId, { token: token.slice(0, 8) + "..." });
      return { token, expiresAt: expiresAt.getTime() };
    }),

  /**
   * End an active impersonation session.
   */
  endImpersonation: adminProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { adminImpersonationSessions } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .update(adminImpersonationSessions)
        .set({ endedAt: new Date() })
        .where(eq(adminImpersonationSessions.token, input.token));
      await logAdminAction(ctx.user.id, "user.impersonate.end", "user", ctx.user.id, {});
      return { success: true };
    }),

  /**
   * Validate an impersonation token and return the impersonated user's info.
   * Used by the ImpersonationBanner to show who is being impersonated.
   */
  getImpersonationInfo: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { adminImpersonationSessions } = await import("../../drizzle/schema");
      const { users } = await import("../../drizzle/schema");
      const { eq, and, isNull, gt } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return null;
      const [session] = await db
        .select()
        .from(adminImpersonationSessions)
        .where(
          and(
            eq(adminImpersonationSessions.token, input.token),
            isNull(adminImpersonationSessions.endedAt),
            gt(adminImpersonationSessions.expiresAt, new Date())
          )
        )
        .limit(1);
      if (!session) return null;
      const [impersonatedUser] = await db
        .select({ id: users.id, name: users.name, email: users.email, accountType: users.accountType })
        .from(users)
        .where(eq(users.id, session.impersonatedUserId))
        .limit(1);
      if (!impersonatedUser) return null;
      return {
        sessionId: session.id,
        adminId: session.adminId,
        impersonatedUser,
        expiresAt: session.expiresAt.getTime(),
      };
    }),

  /**
   * List all currently active (non-ended, non-expired) impersonation sessions.
   * Used by the System Health tab to show an admin oversight table.
   */
  getActiveImpersonationSessions: adminProcedure.query(async () => {
    const { getDb } = await import("../db");
    const { adminImpersonationSessions } = await import("../../drizzle/schema");
    const { users } = await import("../../drizzle/schema");
    const { eq, and, isNull, gt } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return [];
    const sessions = await db
      .select({
        id: adminImpersonationSessions.id,
        adminId: adminImpersonationSessions.adminId,
        impersonatedUserId: adminImpersonationSessions.impersonatedUserId,
        token: adminImpersonationSessions.token,
        createdAt: adminImpersonationSessions.createdAt,
        expiresAt: adminImpersonationSessions.expiresAt,
        impersonatedName: users.name,
        impersonatedEmail: users.email,
      })
      .from(adminImpersonationSessions)
      .leftJoin(users, eq(adminImpersonationSessions.impersonatedUserId, users.id))
      .where(
        and(
          isNull(adminImpersonationSessions.endedAt),
          gt(adminImpersonationSessions.expiresAt, new Date())
        )
      )
      .orderBy(adminImpersonationSessions.createdAt);
    return sessions.map(s => ({
      ...s,
      // Mask token — only expose first 8 chars for display
      token: s.token.slice(0, 8) + "...",
      createdAt: s.createdAt instanceof Date ? s.createdAt.getTime() : s.createdAt,
      expiresAt: s.expiresAt instanceof Date ? s.expiresAt.getTime() : s.expiresAt,
    }));
  }),

  /**
   * Force-end any impersonation session by its ID (admin oversight).
   */
  forceEndImpersonation: adminProcedure
    .input(z.object({ sessionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const { adminImpersonationSessions } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .update(adminImpersonationSessions)
        .set({ endedAt: new Date() })
        .where(eq(adminImpersonationSessions.id, input.sessionId));
      await logAdminAction(ctx.user.id, "user.impersonate.force_end", "session", input.sessionId, {});
      return { success: true };
    }),

  /**
   * Extend an active impersonation session by 15 minutes.
   * The caller must supply the session token (stored in sessionStorage on the frontend).
   * Returns the new expiresAt timestamp so the banner countdown can reset.
   */
  extendImpersonation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const { adminImpersonationSessions } = await import("../../drizzle/schema");
      const { eq, and, isNull, gt } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [session] = await db
        .select()
        .from(adminImpersonationSessions)
        .where(
          and(
            eq(adminImpersonationSessions.token, input.token),
            isNull(adminImpersonationSessions.endedAt),
            gt(adminImpersonationSessions.expiresAt, new Date())
          )
        )
        .limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Active impersonation session not found" });
      const newExpiresAt = new Date(session.expiresAt.getTime() + 15 * 60 * 1000);
      await db
        .update(adminImpersonationSessions)
        .set({ expiresAt: newExpiresAt })
        .where(eq(adminImpersonationSessions.id, session.id));
      return { expiresAt: newExpiresAt.getTime() };
    }),

  /**
   * Return a ring-buffer of the last 20 system health snapshots.
   * Snapshots are taken every time getSystemHealth is called and stored in a
   * module-level array so they persist across requests within the same process.
   */
  getSystemMetricsHistory: adminProcedure.query(async () => {
    return systemMetricsHistory.slice();
  }),

  // ─── Email Service Health ────────────────────────────────────────────────────
  /**
   * Returns a unified health snapshot for the Mail Service panel:
   * active provider details, overall status, and 7-day delivery counts.
   */
  getEmailServiceHealth: adminProcedure.query(async () => {
    const { getDb } = await import("../db");
    const { emailSettings, emailLogs } = await import("../../drizzle/schema");
    const { eq, gte, sql } = await import("drizzle-orm");
    const { maskApiKey } = await import("../services/email/crypto");
    const { ENV } = await import("../_core/env");

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [row] = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.isActive, true))
      .limit(1);

    let overallStatus: "ok" | "warning" | "error" | "unconfigured";
    if (!row) {
      overallStatus = ENV.resendApiKey ? "warning" : "unconfigured";
    } else if (row.lastTestStatus === "failed") {
      overallStatus = "error";
    } else if (!row.lastTestedAt) {
      overallStatus = "warning";
    } else {
      overallStatus = "ok";
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [sent7d] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailLogs)
      .where(eq(emailLogs.status, "sent"));
    const [failed7d] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailLogs)
      .where(eq(emailLogs.status, "failed"));
    const [total7d] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailLogs)
      .where(gte(emailLogs.createdAt, sevenDaysAgo));

    const sentCount = Number(sent7d?.count ?? 0);
    const failedCount = Number(failed7d?.count ?? 0);
    const totalCount = Number(total7d?.count ?? 0);
    const failureRate = totalCount > 0 ? Math.round((failedCount / totalCount) * 100) : 0;

    return {
      overallStatus,
      usingEnvFallback: !row && !!ENV.resendApiKey,
      activeProvider: row
        ? {
            id: row.id,
            provider: row.provider,
            fromAddress: row.fromAddress,
            fromName: row.fromName,
            apiKeyMasked: maskApiKey(row.apiKey),
            lastTestedAt: row.lastTestedAt,
            lastTestStatus: row.lastTestStatus,
            isActive: row.isActive,
          }
        : null,
      stats7d: {
        sent: sentCount,
        failed: failedCount,
        total: totalCount,
        failureRate,
      },
      checkedAt: Date.now(),
    };
  }),

  /**
   * Returns daily email delivery counts for the last N days (default 7).
   * Used to render the delivery sparkline chart in the Mail Service panel.
   */
  getEmailDeliveryStats: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(7) }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const { emailLogs } = await import("../../drizzle/schema");
      const { gte, sql } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      const rows = await db
        .select({
          date: sql<string>`DATE(${emailLogs.createdAt})`,
          status: emailLogs.status,
          count: sql<number>`count(*)`,
        })
        .from(emailLogs)
        .where(gte(emailLogs.createdAt, since))
        .groupBy(sql`DATE(${emailLogs.createdAt})`, emailLogs.status)
        .orderBy(sql`DATE(${emailLogs.createdAt})`);

      const byDate = new Map<string, { sent: number; failed: number; skipped: number }>();
      for (const row of rows) {
        const key = row.date;
        if (!byDate.has(key)) byDate.set(key, { sent: 0, failed: 0, skipped: 0 });
        const entry = byDate.get(key)!;
        if (row.status === "sent") entry.sent += Number(row.count);
        else if (row.status === "failed") entry.failed += Number(row.count);
        else if (row.status === "skipped") entry.skipped += Number(row.count);
      }

      const result: Array<{ date: string; sent: number; failed: number; skipped: number }> = [];
      for (let i = input.days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        const entry = byDate.get(key) ?? { sent: 0, failed: 0, skipped: 0 };
        result.push({ date: key, ...entry });
      }

      return result;
    }),

  /**
   * Returns aggregate counts for sidebar badge indicators.
   * Fetched once on mount and auto-refreshed every 60 s.
   */
  getSidebarBadgeCounts: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) return {
      flaggedQuestions: 0, demoRequests: 0, suppressionList: 0,
      suppressionBreakdown: { bounced: 0, complained: 0, manual: 0 },
    };
    const { questionFlags, demoRequests: demoRequestsTable, emailSuppression } = await import("../../drizzle/schema");
    const { eq, sql, and } = await import("drizzle-orm");
    const [[flagRow], [demoRow], [suppRow], [bouncedRow], [complainedRow], [manualRow]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(questionFlags).where(eq(questionFlags.status, "open")),
      db.select({ count: sql<number>`count(*)` }).from(demoRequestsTable).where(eq(demoRequestsTable.status, "new")),
      db.select({ count: sql<number>`count(*)` }).from(emailSuppression).where(eq(emailSuppression.isActive, true)),
      db.select({ count: sql<number>`count(*)` }).from(emailSuppression).where(and(eq(emailSuppression.reason, "bounced"), eq(emailSuppression.isActive, true))),
      db.select({ count: sql<number>`count(*)` }).from(emailSuppression).where(and(eq(emailSuppression.reason, "complained"), eq(emailSuppression.isActive, true))),
      db.select({ count: sql<number>`count(*)` }).from(emailSuppression).where(and(eq(emailSuppression.reason, "manual"), eq(emailSuppression.isActive, true))),
    ]);
    return {
      flaggedQuestions: Number(flagRow?.count ?? 0),
      demoRequests: Number(demoRow?.count ?? 0),
      suppressionList: Number(suppRow?.count ?? 0),
      suppressionBreakdown: {
        bounced: Number(bouncedRow?.count ?? 0),
        complained: Number(complainedRow?.count ?? 0),
        manual: Number(manualRow?.count ?? 0),
      },
    };
  }),

  // ─── Video Lesson Management ─────────────────────────────────────────────

  updateLessonVideo: adminProcedure
    .input(z.object({
      lessonId: z.number(),
      videoUrl: z.string().url().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { updateLessonVideoUrl, getLessonById } = await import("../db");
      const existing = await getLessonById(input.lessonId);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found" });
      const updated = await updateLessonVideoUrl(input.lessonId, input.videoUrl);
      await logAdminAction(ctx.user.id, "lesson.video_update", "lesson", input.lessonId, {
        lessonTitle: existing.title,
        oldVideoUrl: existing.videoUrl ?? null,
        newVideoUrl: input.videoUrl,
      });
      return updated;
    }),
});

// ─── In-process metrics ring buffer (max 20 entries) ─────────────────────────
type MetricSnapshot = {
  ts: number;          // Unix ms
  dbPingMs: number;
  heapUsedMb: number;
  heapTotalMb: number;
};

const MAX_METRICS_HISTORY = 20;
const systemMetricsHistory: MetricSnapshot[] = [];

/**
 * Called by getSystemHealth to append a snapshot to the ring buffer.
 * Exported so tests can inspect it.
 */
export function appendMetricSnapshot(snapshot: MetricSnapshot): void {
  systemMetricsHistory.push(snapshot);
  if (systemMetricsHistory.length > MAX_METRICS_HISTORY) {
    systemMetricsHistory.shift();
  }
}

// ─── Admin Invite Router (separate export for cleaner imports) ────────────────
// The inviteAdmin procedure is wired into adminRouter above via the spread
// pattern. We export a standalone helper here so tests can call it directly.

/**
 * Send an admin invitation email to a new user.
 * The invited user receives a magic-link that pre-fills their role as 'admin'.
 * The invitation token is stored in the adminInvitations table (if it exists)
 * or falls back to a password-reset-style token flow.
 */
export async function sendAdminInvitation(opts: {
  invitedByAdminId: number;
  toEmail: string;
  toName: string;
  origin: string;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { nanoid } = await import("nanoid");
    const token = nanoid(48);
    const inviteUrl = `${opts.origin}/admin/accept-invite?token=${token}&email=${encodeURIComponent(opts.toEmail)}`;

    const { sendEmail } = await import("./emailService" as any);
    await sendEmail({
      to: opts.toEmail,
      subject: "You've been invited to join EduChamp as an Admin",
      html: `
        <h2>Admin Invitation</h2>
        <p>Hi ${opts.toName || "there"},</p>
        <p>You have been invited to join EduChamp as an administrator.</p>
        <p><a href="${inviteUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invitation</a></p>
        <p>This link expires in 48 hours.</p>
      `,
      text: `You have been invited to join EduChamp as an admin. Accept here: ${inviteUrl}`,
      templateName: "admin_invite",
    });

    return { success: true, token };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── New audit log event types added in Admin Portal Enhancement sprint ───────
// These are documentation-only constants; the actual logAdminAction() function
// accepts any string so no code change is needed — just listing them here for
// discoverability and test coverage.
export const ADMIN_AUDIT_EVENTS = {
  // User management
  USER_CREATE: "user.create",
  USER_ROLE_CHANGE: "user.role_change",
  USER_STATUS_CHANGE: "user.status_change",
  USER_DELETE: "user.delete",
  USER_IMPERSONATE_START: "user.impersonate.start",
  USER_IMPERSONATE_END: "user.impersonate.end",
  USER_IMPERSONATE_FORCE_END: "user.impersonate.force_end",
  USER_IMPERSONATE_EXTEND: "user.impersonate.extend",
  // Parent/student relationships
  PARENT_LINK: "parent.link",
  PARENT_UNLINK: "parent.unlink",
  // Course/question management
  QUESTION_FLAG: "question.flag",
  QUESTION_DEACTIVATE: "question.deactivate",
  QUESTION_REACTIVATE: "question.reactivate",
  // Email management
  EMAIL_PROVIDER_CREATE: "email.provider.create",
  EMAIL_PROVIDER_ACTIVATE: "email.provider.activate",
  EMAIL_PROVIDER_DELETE: "email.provider.delete",
  EMAIL_TEST_SEND: "email.test.send",
  EMAIL_LOG_RETRY: "email.log.retry",
  // Admin invitations
  ADMIN_INVITE_SEND: "admin.invite.send",
  ADMIN_INVITE_ACCEPT: "admin.invite.accept",
  // System
  SYSTEM_HEALTH_CHECK: "system.health_check",
} as const;
