import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import {
  getChildrenForParent,
  getChildProgressSummary,
  enrollChild,
  removeChildFromParent,
  updateChildNickname,
  updateUserAccountType,
  getUserByEmail,
  createChildAccount,
  createEnrolmentInvitation,
  getPendingInvitationsForParent,
  getParentChildLink,
  getAllUnits,
  getUserMastery,
  getAllCourseProgressForUser,
  getCourseById,
  enrollUserInCourse,
  removeStudentCourseEnrollment,
  getUserCourseEnrollments,
  createCourseRequest,
  getCourseRequestsForStudent,
  getPendingRequestsForParentStudents,
  getAllRequestsForParentStudents,
  approveCourseRequest,
  rejectCourseRequest,
  getCourseRequestById,
  getUserById,
  getUserProfile,
  getActiveCourseIdForUser,
  getUnitsForCourse,
  getDb,
} from "../db";
import { getMasteryLabel, getAdaptivePath, isYoungLearnerGrade } from "../educhamp-helpers";
import { sendEmail } from "../emailService";
import { buildCourseRequestOutcomeEmail } from "../emailTemplates/courseRequestNotification";
import { buildStudentSetupEmail } from "../emailTemplates/studentSetup";
import { passwordResetTokens } from "../../drizzle/schema";
import { nanoid } from "nanoid";

export const parentRouter = router({
  /**
   * Upgrade the current user's account type to "parent".
   * This is a one-way operation — once a parent, always a parent.
   */
  becomeParent: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.accountType === "student") {
      throw new TRPCError({ code: "FORBIDDEN", message: "A student account cannot also be a parent account. Please sign in with a separate parent or guardian account." });
    }
    await updateUserAccountType(ctx.user.id, "parent");
    return { success: true };
  }),

  /**
   * List all children linked to the current parent, with a mastery summary for each.
   */
  listChildren: protectedProcedure.query(async ({ ctx }) => {
    const links = await getChildrenForParent(ctx.user.id);

    const children = await Promise.all(
      links.map(async ({ link, child }) => {
        if (!child) return null;
        const summary = await getChildProgressSummary(child.id);
        const mastery = summary?.mastery ?? [];

        // Get units for the child's active course (not ALL units across all courses)
        const childActiveCourseId = await getActiveCourseIdForUser(child.id);
        const childCourseUnits = await getUnitsForCourse(childActiveCourseId);

        // Compute unit-level mastery averages
        const unitMastery = childCourseUnits.map((u) => {
          const unitSkills = mastery.filter((m) => m.skillId.startsWith(`ALG1-U${u.unitNumber}-`));
          const avg =
            unitSkills.length > 0
              ? Math.round(unitSkills.reduce((s, m) => s + m.score, 0) / unitSkills.length)
              : null;
          const progress = summary?.progress.find((p) => p.unitNumber === u.unitNumber);
          return {
            unitNumber: u.unitNumber,
            title: u.title,
            avgMastery: avg,
            status: progress?.status ?? "locked",
            quizScore: progress?.quizScore ?? null,
          };
        });

        const overallAvg =
          mastery.length > 0
            ? Math.round(mastery.reduce((s, m) => s + m.score, 0) / mastery.length)
            : null;

        const childProfile = await getUserProfile(child.id).catch(() => null);

        const completedUnits = summary?.progress.filter((p) => p.status === "completed").length ?? 0;
        const inProgressUnits = summary?.progress.filter((p) => p.status === "in_progress" || p.status === "quiz_unlocked").length ?? 0;

        return {
          linkId: link.id,
          childId: child.id,
          name: link.nickname ?? child.name ?? "Student",
          displayName: child.name ?? "Student",
          nickname: link.nickname,
          email: child.email,
          grade: child.grade,
          school: child.school,
          relationship: link.relationship,
          enrolledAt: link.enrolledAt,
          accountType: child.accountType,
          overallMastery: overallAvg,
          masteryLabel: overallAvg !== null ? getMasteryLabel(overallAvg) : null,
          completedUnits,
          inProgressUnits,
          totalUnits: childCourseUnits.length,
          unitMastery,
          recentQuizzes: (summary?.quizHistory ?? []).slice(0, 5).map((q) => ({
            unitNumber: q.unitNumber,
            score: q.score,
            completedAt: q.completedAt,
          })),
          placement: summary?.diagnostic
            ? {
                score: summary.diagnostic.overallScore,
                recommendation: summary.diagnostic.placementRecommendation,
                completedAt: summary.diagnostic.completedAt,
              }
            : null,
          adaptivePath: overallAvg !== null ? getAdaptivePath(overallAvg) : null,
          // Personalization fields for Parent Dashboard display
          parentLedMode: (childProfile as any)?.parentLedMode ?? false,
          languageLevel: ((childProfile as any)?.languageLevel ?? "standard") as "simplified" | "standard" | "advanced",
        };
      })
    );

    return children.filter(Boolean);
  }),

  /**
   * Get all course progress for a single child (multi-course parent view).
   */
  getChildAllCourses: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ ctx, input }) => {
      const link = await getParentChildLink(ctx.user.id, input.childId);
      if (!link || !link.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student." });
      }
      return getAllCourseProgressForUser(input.childId);
    }),

  /**
   * Get detailed progress for a single child.
   */
  getChildDetail: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify this parent has access to this child
      const link = await getParentChildLink(ctx.user.id, input.childId);
      if (!link || !link.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student." });
      }

      // Get units for the child's active course (not ALL units across all courses)
      const childActiveCourseId = await getActiveCourseIdForUser(input.childId);
      const allUnits = await getUnitsForCourse(childActiveCourseId);
      const summary = await getChildProgressSummary(input.childId);
      const mastery = summary?.mastery ?? [];

      const unitDetails = allUnits.map((u) => {
        const unitSkills = mastery.filter((m) => m.skillId.startsWith(`ALG1-U${u.unitNumber}-`));
        const avg =
          unitSkills.length > 0
            ? Math.round(unitSkills.reduce((s, m) => s + m.score, 0) / unitSkills.length)
            : null;
        const progress = summary?.progress.find((p) => p.unitNumber === u.unitNumber);
        return {
          unitNumber: u.unitNumber,
          title: u.title,
          avgMastery: avg,
          masteryLabel: avg !== null ? getMasteryLabel(avg) : null,
          adaptivePath: avg !== null ? getAdaptivePath(avg) : null,
          status: progress?.status ?? "locked",
          quizScore: progress?.quizScore ?? null,
          quizAttempts: progress?.quizAttempts ?? 0,
          lessonsCompleted: progress?.lessonsCompleted ?? 0,
          totalLessons: progress?.totalLessons ?? 0,
          skills: unitSkills.map((s) => ({
            skillId: s.skillId,
            score: s.score,
            masteryLabel: getMasteryLabel(s.score),
            attemptCount: s.attemptCount,
            lastAttemptAt: s.lastAttemptAt,
          })),
        };
      });

      return {
        nickname: link.nickname,
        relationship: link.relationship,
        enrolledAt: link.enrolledAt,
        unitDetails,
        recentQuizzes: (summary?.quizHistory ?? []).map((q) => ({
          unitNumber: q.unitNumber,
          score: q.score,
          correctCount: q.correctCount,
          totalQuestions: q.totalQuestions,
          completedAt: q.completedAt,
        })),
        placement: summary?.diagnostic
          ? {
              score: summary.diagnostic.overallScore,
              prerequisiteScore: summary.diagnostic.prerequisiteScore,
              recommendation: summary.diagnostic.placementRecommendation,
              unitResults: summary.diagnostic.unitResults,
              completedAt: summary.diagnostic.completedAt,
            }
          : null,
      };
    }),

  /**
   * Enrol an existing student by their email address.
   */
  enrollByEmail: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        nickname: z.string().optional(),
        relationship: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upgrade caller to parent if not already
      if (ctx.user.accountType !== "parent") {
        await updateUserAccountType(ctx.user.id, "parent");
      }

      const child = await getUserByEmail(input.email);
      if (!child) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No student account found with that email address. You can create a new student account instead.",
        });
      }
      if (child.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot enrol yourself." });
      }

      // Check if already enrolled
      const existing = await getParentChildLink(ctx.user.id, child.id);
      if (existing?.isActive) {
        throw new TRPCError({ code: "CONFLICT", message: "This student is already linked to your account." });
      }

      await enrollChild(ctx.user.id, child.id, input.nickname, input.relationship ?? "parent");

      // Notify owner
      notifyOwner({
        title: `New Enrolment — ${ctx.user.name}`,
        content: `${ctx.user.name} enrolled ${child.name ?? child.email} as their child on EduChamp.`,
      }).catch(() => {});

      return { success: true, childName: child.name ?? child.email };
    }),

  /**
   * Create a brand-new student account and immediately enrol them.
   */
  createAndEnroll: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        grade: z.string().default("9"),
        school: z.string().optional(),
        nickname: z.string().optional(),
        relationship: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upgrade caller to parent if not already
      if (ctx.user.accountType !== "parent") {
        await updateUserAccountType(ctx.user.id, "parent");
      }

      // Check if email already exists
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists. Use 'Enrol by Email' instead.",
        });
      }

      const child = await createChildAccount(input.name, input.email, input.grade, input.school);
      if (!child) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create student account." });
      }

      await enrollChild(ctx.user.id, child.id, input.nickname ?? input.name, input.relationship ?? "parent");

      notifyOwner({
        title: `New Student Created \u2014 ${ctx.user.name}`,
        content: `${ctx.user.name} created and enrolled a new student: ${input.name} (${input.email}), Grade ${input.grade}.`,
      }).catch(() => {});

      // Send setup email to the newly enrolled student (non-blocking)
      try {
        const db = await getDb();
        if (db) {
          const token = nanoid(48);
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
          await db.insert(passwordResetTokens).values({ userId: child.id, token, expiresAt });
          const origin = ctx.req.headers.origin || "https://educhamp.co";
          const setupUrl = `${origin}/student-setup?token=${token}`;
          const emailContent = buildStudentSetupEmail({
            studentName: input.name,
            parentName: ctx.user.name ?? "Your parent",
            setupUrl,
          });
          await sendEmail({
            to: input.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            templateName: "studentSetup",
          });
        }
      } catch (err) {
        console.error("[createAndEnroll] Failed to send setup email:", err);
      }

      return { success: true, childId: child.id, childName: child.name };
    }),

  /**
   * Update the display nickname for a child in the parent's view.
   */
  updateNickname: protectedProcedure
    .input(z.object({ childId: z.number(), nickname: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const link = await getParentChildLink(ctx.user.id, input.childId);
      if (!link || !link.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student." });
      }
      await updateChildNickname(ctx.user.id, input.childId, input.nickname);
      return { success: true };
    }),

  /**
   * Remove (unlink) a child from the parent's account.
   * Does NOT delete the child's account or data.
   */
  removeChild: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const link = await getParentChildLink(ctx.user.id, input.childId);
      if (!link) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Child not found in your account." });
      }
      await removeChildFromParent(ctx.user.id, input.childId);
      return { success: true };
    }),

  /**
   * Get pending invitations sent by this parent.
   */
  getPendingInvitations: protectedProcedure.query(async ({ ctx }) => {
    return getPendingInvitationsForParent(ctx.user.id);
  }),

  /**
   * Send an email invitation to a child (creates a pending invitation record).
   */
  sendInvitation: protectedProcedure
    .input(z.object({ childEmail: z.string().email(), childName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.accountType !== "parent") {
        await updateUserAccountType(ctx.user.id, "parent");
      }
      const token = await createEnrolmentInvitation(ctx.user.id, input.childEmail, input.childName);
      return { success: true, token };
    }),

  // ─── Course Request Procedures ────────────────────────────────────────────

  /**
   * Parent: list all pending course requests for their linked students.
   */
  getPendingCourseRequests: protectedProcedure.query(async ({ ctx }) => {
    const links = await getChildrenForParent(ctx.user.id);
    const studentIds = links.map((l) => l.child?.id).filter(Boolean) as number[];
    if (studentIds.length === 0) return [];
    const rows = await getPendingRequestsForParentStudents(studentIds);
    return rows.map((r) => ({
      id: r.request.id,
      studentId: r.request.studentId,
      courseId: r.request.courseId,
      courseName: r.course.title,
      courseDescription: r.course.description,
      status: r.request.status,
      createdAt: r.request.createdAt,
    }));
  }),

  /**
   * Parent: list all course requests (all statuses) for their linked students.
   */
  getAllCourseRequests: protectedProcedure.query(async ({ ctx }) => {
    const links = await getChildrenForParent(ctx.user.id);
    const studentIds = links.map((l) => l.child?.id).filter(Boolean) as number[];
    if (studentIds.length === 0) return [];
    const rows = await getAllRequestsForParentStudents(studentIds);
    return rows.map((r) => ({
      id: r.request.id,
      studentId: r.request.studentId,
      courseId: r.request.courseId,
      courseName: r.course.title,
      status: r.request.status,
      approvedAt: r.request.approvedAt,
      rejectedAt: r.request.rejectedAt,
      rejectionReason: r.request.rejectionReason,
      createdAt: r.request.createdAt,
    }));
  }),

  /**
   * Parent: approve a pending course request and enroll the student.
   * Sends a branded confirmation email to the student after a successful DB update.
   */
  approveCourseRequest: protectedProcedure
    .input(z.object({ requestId: z.number(), origin: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const request = await getCourseRequestById(input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found." });
      if (request.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Request is no longer pending." });

      // Verify the parent owns this student
      const link = await getParentChildLink(ctx.user.id, request.studentId);
      if (!link || !link.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student." });

      await approveCourseRequest(input.requestId, ctx.user.id);
      await enrollUserInCourse(request.studentId, request.courseId);

      // Send student notification email (fire-and-forget — don't block the response)
      try {
        const [course, student] = await Promise.all([
          getCourseById(request.courseId),
          getUserById(request.studentId),
        ]);
        if (student?.email && course) {
          const origin = input.origin ?? "https://educhamp.co";
          const emailContent = buildCourseRequestOutcomeEmail({
            studentName: student.name ?? "Student",
            courseName: course.title,
            approved: true,
            dashboardUrl: `${origin}/courses`,
          });
          await sendEmail({
            to: student.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            templateName: "courseRequestApproved",
            referenceId: String(request.id),
          });
        }
      } catch (emailErr) {
        console.error("[approveCourseRequest] Failed to send student notification email:", emailErr);
      }

      return { success: true };
    }),

  /**
   * Parent: reject a pending course request.
   * Sends a branded notification email to the student after a successful DB update.
   */
  rejectCourseRequest: protectedProcedure
    .input(z.object({ requestId: z.number(), rejectionReason: z.string().optional(), origin: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const request = await getCourseRequestById(input.requestId);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found." });
      if (request.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Request is no longer pending." });

      const link = await getParentChildLink(ctx.user.id, request.studentId);
      if (!link || !link.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student." });

      await rejectCourseRequest(input.requestId, ctx.user.id, input.rejectionReason);

      // Send student notification email (fire-and-forget — don't block the response)
      try {
        const [course, student] = await Promise.all([
          getCourseById(request.courseId),
          getUserById(request.studentId),
        ]);
        if (student?.email && course) {
          const origin = input.origin ?? "https://educhamp.co";
          const emailContent = buildCourseRequestOutcomeEmail({
            studentName: student.name ?? "Student",
            courseName: course.title,
            approved: false,
            rejectionReason: input.rejectionReason,
            dashboardUrl: `${origin}/courses`,
          });
          await sendEmail({
            to: student.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
            templateName: "courseRequestRejected",
            referenceId: String(request.id),
          });
        }
      } catch (emailErr) {
        console.error("[rejectCourseRequest] Failed to send student notification email:", emailErr);
      }

      return { success: true };
    }),

  /**
   * Parent: directly assign a course to a linked student (no request needed).
   */
  assignCourseToStudent: protectedProcedure
    .input(z.object({ studentId: z.number(), courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const link = await getParentChildLink(ctx.user.id, input.studentId);
      if (!link || !link.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student." });
      const course = await getCourseById(input.courseId);
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      void course; // type-checked
      await enrollUserInCourse(input.studentId, input.courseId);
      return { success: true };
    }),

  /**
   * Parent: remove a course from a linked student's enrollments.
   */
  removeCourseFromStudent: protectedProcedure
    .input(z.object({ studentId: z.number(), courseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const link = await getParentChildLink(ctx.user.id, input.studentId);
      if (!link || !link.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student." });
      await removeStudentCourseEnrollment(input.studentId, input.courseId);
      return { success: true };
    }),

  /**
   * Parent: get all courses for a linked student (enrolled + available).
   */
  getStudentCourses: protectedProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const link = await getParentChildLink(ctx.user.id, input.studentId);
      if (!link || !link.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student." });
      const enrollments = await getUserCourseEnrollments(input.studentId);
      return enrollments.map((e) => ({
        courseId: e.course.id,
        courseName: e.course.title,
        description: e.course.description,
        isActive: e.enrollment.isActive,
        isCurrent: e.enrollment.isCurrent,
      }));
    }),

  /**
   * Parent: get all available courses (for the Add Course dialog).
   */
  getAvailableCourses: protectedProcedure.query(async () => {
    const { getAllCourses } = await import("../db");
    const all = await getAllCourses();
    return all.map((c) => ({ id: c.id, title: c.title, description: c.description, gradeLevel: c.gradeLevel, subject: c.subject }));
  }),

  /**
   * Parent: override the grade level for a linked child.
   * This controls which courses the child can access in the catalog (\u00b12 grade window).
   * Only a linked parent may call this for their own children.
   */
  setChildGradeLevel: protectedProcedure
    .input(
      z.object({
        childId: z.number(),
        gradeLevel: z.string().max(32),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getParentChildLink, upsertUserProfile } = await import("../db");
      // Verify the caller is a linked parent of this child
      const link = await getParentChildLink(ctx.user.id, input.childId);
      if (!link) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not linked to this student." });
      }
      await upsertUserProfile(input.childId, { gradeLevel: input.gradeLevel });
      return { success: true, gradeLevel: input.gradeLevel };
    }),
});

// ─── Public token-based approve/reject endpoint ───────────────────────────────
// Exported separately so it can be registered as a publicProcedure in routers.ts
import { publicProcedure } from "../_core/trpc";

export const courseRequestTokenRouter = router({
  /**
   * Public: approve or reject a course request via email token link.
   * Token encodes the action (approve/reject) and is single-use with 7-day expiry.
   */
  handleToken: publicProcedure
    .input(z.object({ token: z.string(), action: z.enum(["approve", "reject"]) }))
    .mutation(async ({ input }) => {
      const { getCourseRequestByToken, approveCourseRequest: doApprove, rejectCourseRequest: doReject, enrollUserInCourse: doEnroll } = await import("../db");
      const request = await getCourseRequestByToken(input.token);
      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired link." });
      if (request.tokenUsedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This link has already been used." });
      if (request.tokenExpiresAt && new Date() > request.tokenExpiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This link has expired. Please log in to approve or reject from your dashboard." });
      }
      if (request.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "This request has already been actioned." });

      if (input.action === "approve") {
        await doApprove(request.id, 0); // 0 = system/email action
        await doEnroll(request.studentId, request.courseId);
      } else {
        await doReject(request.id, 0, "Rejected via email link");
      }
      return { success: true, action: input.action };
    }),
});
