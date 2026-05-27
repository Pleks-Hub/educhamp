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
    .input(z.object({
      limit: z.number().min(1).max(1000).default(100),
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
      role: z.enum(["user", "admin"]).default("user"),
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

  updateUserStatus: adminProcedure
    .input(z.object({
      userId: z.number(),
      status: z.enum(["active", "suspended", "archived", "deleted"]),
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
      status: z.enum(["active", "archived", "suspended"]).optional(),
      diagnosticCooldownDays: z.number().min(0).max(365).optional(),
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
      await enrollUserInCourse(ctx.user.id, input.courseId);
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
});
