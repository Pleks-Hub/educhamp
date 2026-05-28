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
  // Sprint 40: Inactivity
  getInactiveStudents,
  getInactivityStats,
  recordInactivityNotification,
  getStudentInactivityNotifications,
  hasInactivityNotificationBeenSent,
  updateLastActiveAt,
} from "../db";
import { sendEmail } from "../emailService";
import { buildInactivityEmail } from "../emailTemplates/inactivityNotification";

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
          <p style="margin:0;color:#94a3b8;font-size:12px">EduChamp · AI-Powered K-12 Adaptive Learning</p>
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
});
