/**
 * Admin User Detail Router
 *
 * Provides rich detail views for individual users in the admin portal:
 * - getStudentDetail: profile + enrolled courses + mastery + sessions + parents
 * - getParentDetail:  profile + connected students + co-parents + sessions
 * - getAdminDetail:   profile + sessions + invitedBy
 * - linkParentToStudent / removeParentLink / getFamilyOverview
 * - deactivateQuestion / reactivateQuestion / flagQuestion
 * - getCourseList / getCourseDetail
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  users,
  parentChildren,
  userSessions,
  courses,
  userCourseEnrollments,
  userMastery,
  quizQuestions,
  units,
  lessons,
} from "../../drizzle/schema";
import { eq, and, desc, inArray, isNull } from "drizzle-orm";
import { getUserSessionHistory } from "../services/sessionTracker";
import { logAdminAction } from "../db";

// ─── Student Detail ───────────────────────────────────────────────────────────

async function fetchStudentDetail(studentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  // Profile
  const [student] = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
  if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });

  // Enrolled courses
  const enrollments = await db
    .select({
      enrollmentId: userCourseEnrollments.id,
      courseId: userCourseEnrollments.courseId,
      enrolledAt: userCourseEnrollments.enrolledAt,
      courseName: courses.title,
      courseGrade: courses.gradeLevel,
    })
    .from(userCourseEnrollments)
    .leftJoin(courses, eq(userCourseEnrollments.courseId, courses.id))
    .where(eq(userCourseEnrollments.userId, studentId));

  // Mastery (top 20 skills by mastery score)
  const mastery = await db
    .select()
    .from(userMastery)
    .where(eq(userMastery.userId, studentId))
    .orderBy(desc(userMastery.score))
    .limit(20);

  // Sessions (last 10)
  const sessions = await getUserSessionHistory(studentId, 10);

  // Parents / guardians
  const parentLinks = await db
    .select({
      linkId: parentChildren.id,
      parentId: parentChildren.parentId,
      relationshipType: parentChildren.relationshipType,
      addedAt: parentChildren.addedAt,
      parentName: users.name,
      parentEmail: users.email,
    })
    .from(parentChildren)
    .leftJoin(users, eq(parentChildren.parentId, users.id))
    .where(eq(parentChildren.childId, studentId));

  return {
    profile: student,
    enrollments,
    mastery,
    sessions: sessions.map(s => ({
      ...s,
      loginAt: s.loginAt instanceof Date ? s.loginAt.getTime() : s.loginAt,
      lastActiveAt: s.lastActiveAt instanceof Date ? s.lastActiveAt.getTime() : s.lastActiveAt,
      loggedOutAt: s.loggedOutAt instanceof Date ? s.loggedOutAt?.getTime() : s.loggedOutAt,
    })),
    parents: parentLinks,
  };
}

// ─── Parent Detail ────────────────────────────────────────────────────────────

async function fetchParentDetail(parentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const [parent] = await db.select().from(users).where(eq(users.id, parentId)).limit(1);
  if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent not found" });

  // Connected students
  const studentLinks = await db
    .select({
      linkId: parentChildren.id,
      childId: parentChildren.childId,
      relationshipType: parentChildren.relationshipType,
      addedAt: parentChildren.addedAt,
      studentName: users.name,
      studentEmail: users.email,
      studentGrade: users.grade,
    })
    .from(parentChildren)
    .leftJoin(users, eq(parentChildren.childId, users.id))
    .where(eq(parentChildren.parentId, parentId));

  // Co-parents: other parents linked to the same students
  const childIds = studentLinks.map(l => l.childId).filter(Boolean) as number[];
  let coParents: Array<{ parentId: number; parentName: string | null; parentEmail: string | null; sharedStudentCount: number }> = [];
  if (childIds.length > 0) {
    const otherLinks = await db
      .select({
        parentId: parentChildren.parentId,
        parentName: users.name,
        parentEmail: users.email,
      })
      .from(parentChildren)
      .leftJoin(users, eq(parentChildren.parentId, users.id))
      .where(and(inArray(parentChildren.childId, childIds)));

    // Deduplicate and count shared students
    const coParentMap = new Map<number, { parentName: string | null; parentEmail: string | null; count: number }>();
    for (const link of otherLinks) {
      if (link.parentId === parentId) continue;
      const existing = coParentMap.get(link.parentId);
      if (existing) {
        existing.count++;
      } else {
        coParentMap.set(link.parentId, { parentName: link.parentName, parentEmail: link.parentEmail, count: 1 });
      }
    }
    coParents = Array.from(coParentMap.entries()).map(([pid, v]) => ({
      parentId: pid,
      parentName: v.parentName,
      parentEmail: v.parentEmail,
      sharedStudentCount: v.count,
    }));
  }

  // Sessions (last 10)
  const sessions = await getUserSessionHistory(parentId, 10);

  return {
    profile: parent,
    students: studentLinks,
    coParents,
    sessions: sessions.map(s => ({
      ...s,
      loginAt: s.loginAt instanceof Date ? s.loginAt.getTime() : s.loginAt,
      lastActiveAt: s.lastActiveAt instanceof Date ? s.lastActiveAt.getTime() : s.lastActiveAt,
      loggedOutAt: s.loggedOutAt instanceof Date ? s.loggedOutAt?.getTime() : s.loggedOutAt,
    })),
  };
}

// ─── Admin Detail ─────────────────────────────────────────────────────────────

async function fetchAdminDetail(adminId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const [admin] = await db.select().from(users).where(eq(users.id, adminId)).limit(1);
  if (!admin) throw new TRPCError({ code: "NOT_FOUND", message: "Admin not found" });

  // Sessions (last 10)
  const sessions = await getUserSessionHistory(adminId, 10);

  // Invited by
  let invitedBy: { id: number; name: string | null; email: string | null } | null = null;
  if (admin.invitedByAdminId) {
    const [inv] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, admin.invitedByAdminId))
      .limit(1);
    invitedBy = inv ?? null;
  }

  return {
    profile: admin,
    sessions: sessions.map(s => ({
      ...s,
      loginAt: s.loginAt instanceof Date ? s.loginAt.getTime() : s.loginAt,
      lastActiveAt: s.lastActiveAt instanceof Date ? s.lastActiveAt.getTime() : s.lastActiveAt,
      loggedOutAt: s.loggedOutAt instanceof Date ? s.loggedOutAt?.getTime() : s.loggedOutAt,
    })),
    invitedBy,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminUserDetailRouter = router({
  getStudentDetail: adminProcedure
    .input(z.object({ studentId: z.number().int().positive() }))
    .query(async ({ input }) => fetchStudentDetail(input.studentId)),

  getParentDetail: adminProcedure
    .input(z.object({ parentId: z.number().int().positive() }))
    .query(async ({ input }) => fetchParentDetail(input.parentId)),

  getAdminDetail: adminProcedure
    .input(z.object({ adminId: z.number().int().positive() }))
    .query(async ({ input }) => fetchAdminDetail(input.adminId)),

  // ─── Relationship management ─────────────────────────────────────────────

  linkParentToStudent: adminProcedure
    .input(z.object({
      parentId: z.number().int().positive().optional(),
      parentEmail: z.string().email().optional(),
      studentId: z.number().int().positive(),
      relationshipType: z.enum(["parent", "guardian", "co-parent"]).default("parent"),
    }).refine(d => d.parentId !== undefined || d.parentEmail !== undefined, {
      message: "Either parentId or parentEmail must be provided",
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Resolve parent by email if parentId not provided
      let resolvedParentId = input.parentId;
      if (!resolvedParentId && input.parentEmail) {
        const [found] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, input.parentEmail)).limit(1);
        if (!found) throw new TRPCError({ code: "NOT_FOUND", message: `No user found with email ${input.parentEmail}` });
        resolvedParentId = found.id;
      }

      // Check both users exist
      const [parent] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, resolvedParentId!)).limit(1);
      const [student] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.studentId)).limit(1);
      if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent user not found" });
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Student user not found" });

      // Check for existing link
      const [existing] = await db
        .select()
        .from(parentChildren)
        .where(and(eq(parentChildren.parentId, resolvedParentId!), eq(parentChildren.childId, input.studentId)))
        .limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "This parent-student link already exists" });

      await db.insert(parentChildren).values({
        parentId: resolvedParentId!,
        childId: input.studentId,
        relationshipType: input.relationshipType,
        addedByAdminId: ctx.user.id,
        addedAt: new Date(),
      });

      await logAdminAction(ctx.user.id, "parent.link", "parentChildren", null, {
        parentId: resolvedParentId!,
        studentId: input.studentId,
        relationshipType: input.relationshipType,
      });

      return { success: true };
    }),

  removeParentLink: adminProcedure
    .input(z.object({
      parentId: z.number().int().positive(),
      studentId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db
        .select()
        .from(parentChildren)
        .where(and(eq(parentChildren.parentId, input.parentId), eq(parentChildren.childId, input.studentId)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Parent-student link not found" });

      await db
        .delete(parentChildren)
        .where(and(eq(parentChildren.parentId, input.parentId), eq(parentChildren.childId, input.studentId)));

      await logAdminAction(ctx.user.id, "parent.unlink", "parentChildren", null, {
        parentId: input.parentId,
        studentId: input.studentId,
      });

      return { success: true };
    }),

  getFamilyOverview: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      // Collect all related user IDs
      const asParent = await db
        .select({ childId: parentChildren.childId })
        .from(parentChildren)
        .where(eq(parentChildren.parentId, input.userId));
      const asChild = await db
        .select({ parentId: parentChildren.parentId })
        .from(parentChildren)
        .where(eq(parentChildren.childId, input.userId));

      const childIds = asParent.map(r => r.childId).filter(Boolean) as number[];
      const parentIds = asChild.map(r => r.parentId).filter(Boolean) as number[];

      const allIds = Array.from(new Set([...childIds, ...parentIds]));
      const relatedUsers = allIds.length > 0
        ? await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, accountType: users.accountType }).from(users).where(inArray(users.id, allIds))
        : [];

      return {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, accountType: user.accountType },
        children: relatedUsers.filter(u => childIds.includes(u.id)),
        parents: relatedUsers.filter(u => parentIds.includes(u.id)),
      };
    }),

  // ─── Course & Question Management ────────────────────────────────────────

  getCourseList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const allCourses = await db.select().from(courses).orderBy(courses.sortOrder);
    // Enrollment counts
    const enrollmentCounts = await db
      .select({ courseId: userCourseEnrollments.courseId })
      .from(userCourseEnrollments);
    const countMap = new Map<number, number>();
    for (const e of enrollmentCounts) {
      countMap.set(e.courseId, (countMap.get(e.courseId) ?? 0) + 1);
    }
    return allCourses.map(c => ({ ...c, enrolledCount: countMap.get(c.id) ?? 0 }));
  }),

  getCourseDetail: adminProcedure
    .input(z.object({ courseId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [course] = await db.select().from(courses).where(eq(courses.id, input.courseId)).limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });

      const courseUnits = await db.select().from(units).where(eq(units.courseId, input.courseId)).orderBy(units.unitNumber);
      const unitIds = courseUnits.map(u => u.id);

      const courseLessons = unitIds.length > 0
        ? await db.select().from(lessons).where(inArray(lessons.unitId, unitIds)).orderBy(lessons.sortOrder)
        : [];

      const questions = unitIds.length > 0
        ? await db.select().from(quizQuestions).where(inArray(quizQuestions.unitId, unitIds)).orderBy(desc(quizQuestions.id))
        : [];

      const enrolledStudents = await db
        .select({
          userId: userCourseEnrollments.userId,
          enrolledAt: userCourseEnrollments.enrolledAt,
          studentName: users.name,
          studentEmail: users.email,
        })
        .from(userCourseEnrollments)
        .leftJoin(users, eq(userCourseEnrollments.userId, users.id))
        .where(eq(userCourseEnrollments.courseId, input.courseId));

      return { course, units: courseUnits, lessons: courseLessons, questions, enrolledStudents };
    }),

  deactivateQuestion: adminProcedure
    .input(z.object({ questionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db.select({ id: quizQuestions.id }).from(quizQuestions).where(eq(quizQuestions.id, input.questionId)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      await db.update(quizQuestions).set({ isActive: false }).where(eq(quizQuestions.id, input.questionId));
      await logAdminAction(ctx.user.id, "question.deactivate", "quizQuestions", input.questionId, {});
      return { success: true };
    }),

  reactivateQuestion: adminProcedure
    .input(z.object({ questionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db.select({ id: quizQuestions.id }).from(quizQuestions).where(eq(quizQuestions.id, input.questionId)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      await db.update(quizQuestions).set({ isActive: true }).where(eq(quizQuestions.id, input.questionId));
      await logAdminAction(ctx.user.id, "question.reactivate", "quizQuestions", input.questionId, {});
      return { success: true };
    }),

  flagQuestion: adminProcedure
    .input(z.object({
      questionId: z.number().int().positive(),
      flagNote: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db.select({ id: quizQuestions.id }).from(quizQuestions).where(eq(quizQuestions.id, input.questionId)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      await db.update(quizQuestions).set({
        flaggedByAdminId: ctx.user.id,
        flaggedByAdminAt: new Date(),
        flagNote: input.flagNote ?? null,
      }).where(eq(quizQuestions.id, input.questionId));
      await logAdminAction(ctx.user.id, "question.flag", "quizQuestions", input.questionId, { flagNote: input.flagNote });
      return { success: true };
    }),
});
