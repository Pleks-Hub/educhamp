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
} from "../db";
import { getMasteryLabel, getAdaptivePath } from "../educhamp-helpers";

export const parentRouter = router({
  /**
   * Upgrade the current user's account type to "parent".
   * This is a one-way operation — once a parent, always a parent.
   */
  becomeParent: protectedProcedure.mutation(async ({ ctx }) => {
    await updateUserAccountType(ctx.user.id, "parent");
    return { success: true };
  }),

  /**
   * List all children linked to the current parent, with a mastery summary for each.
   */
  listChildren: protectedProcedure.query(async ({ ctx }) => {
    const links = await getChildrenForParent(ctx.user.id);
    const allUnits = await getAllUnits();

    const children = await Promise.all(
      links.map(async ({ link, child }) => {
        if (!child) return null;
        const summary = await getChildProgressSummary(child.id);
        const mastery = summary?.mastery ?? [];

        // Compute unit-level mastery averages
        const unitMastery = allUnits.map((u) => {
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
          totalUnits: allUnits.length,
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
        };
      })
    );

    return children.filter(Boolean);
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

      const allUnits = await getAllUnits();
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
        title: `New Student Created — ${ctx.user.name}`,
        content: `${ctx.user.name} created and enrolled a new student: ${input.name} (${input.email}), Grade ${input.grade}.`,
      }).catch(() => {});

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
      // In a full implementation, you'd send an email here with the token link
      return { success: true, token };
    }),
});
