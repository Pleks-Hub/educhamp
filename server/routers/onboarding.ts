/**
 * Onboarding Router
 * Handles extended demographic profile collection, AI goal alignment,
 * and parent-issued student invite tokens.
 */
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getUserProfile,
  upsertUserProfile,
  markOnboardingComplete,
  createStudentInviteToken,
  getStudentInviteToken,
  acceptStudentInviteToken,
  enrollChild,
  updateUserAccountType,
  getParentChildLink,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const studentProfileSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("US"),
  schoolDistrict: z.string().optional(),
  schoolType: z.enum(["public", "private", "homeschool", "charter", "other"]).optional(),
  schoolName: z.string().optional(),
  gradeLevel: z.string().optional(),
});

const parentProfileSchema = studentProfileSchema.extend({
  parentSignupReason: z.string().min(1).max(2000).optional(),
  parentGoalCategory: z.enum([
    "grade_improvement",
    "test_prep",
    "enrichment",
    "remediation",
    "homeschool_supplement",
    "other",
  ]).optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const onboardingRouter = router({
  /**
   * Get the current user's profile + onboarding state.
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return {
      user: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        accountType: ctx.user.accountType,
        grade: ctx.user.grade,
        school: ctx.user.school,
      },
      profile: profile ?? null,
      onboardingCompleted: profile?.onboardingCompleted ?? false,
    };
  }),

  /**
   * Save student demographic profile (step 1 of student onboarding).
   */
  saveStudentProfile: protectedProcedure
    .input(studentProfileSchema)
    .mutation(async ({ ctx, input }) => {
      await upsertUserProfile(ctx.user.id, {
        ...input,
        onboardingStep: 1,
      });
      return { success: true };
    }),

  /**
   * Save parent demographic profile + signup reason (step 1 of parent onboarding).
   */
  saveParentProfile: protectedProcedure
    .input(parentProfileSchema)
    .mutation(async ({ ctx, input }) => {
      await upsertUserProfile(ctx.user.id, {
        ...input,
        onboardingStep: 1,
      });
      return { success: true };
    }),

  /**
   * AI-powered goal alignment: given the parent's signup reason and goal category,
   * generate a personalised goal statement and tracking plan.
   * Returns the AI-generated goal detail and saves it to the profile.
   */
  generateGoalAlignment: protectedProcedure
    .input(z.object({
      parentSignupReason: z.string().min(1).max(2000),
      parentGoalCategory: z.string(),
      childName: z.string().optional(),
      childGrade: z.string().optional(),
      schoolType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const categoryLabels: Record<string, string> = {
        grade_improvement: "improving their child's grades",
        test_prep: "preparing for standardized tests (STAAR, SAT, ACT)",
        enrichment: "enriching their child's math skills beyond the classroom",
        remediation: "addressing learning gaps and catching up in Algebra I",
        homeschool_supplement: "supplementing their homeschool curriculum with structured Algebra I content",
        other: "supporting their child's math education",
      };

      const goalLabel = categoryLabels[input.parentGoalCategory] ?? "supporting their child's math education";
      const childInfo = input.childName ? `Their child's name is ${input.childName}` : "Their child";
      const gradeInfo = input.childGrade ? `, currently in Grade ${input.childGrade}` : "";
      const schoolInfo = input.schoolType && input.schoolType !== "public"
        ? ` (${input.schoolType === "homeschool" ? "homeschooled" : `attending a ${input.schoolType} school`})`
        : "";

      const systemPrompt = `You are EduChamp's onboarding advisor. Your job is to create a personalised, actionable learning goal statement for a parent who has just enrolled their child in EduChamp Algebra I. Be warm, specific, and encouraging. Keep the response to 3-4 sentences maximum.`;

      const userPrompt = `A parent has signed up for EduChamp with the following goal: "${input.parentSignupReason}"

Their primary objective is: ${goalLabel}.
${childInfo}${gradeInfo}${schoolInfo}.

Please write a personalised goal statement that:
1. Acknowledges their specific reason for signing up
2. Connects it to measurable outcomes in EduChamp (mastery scores, quiz performance, unit completion)
3. Gives 1-2 concrete ways EduChamp's tracking will help them achieve this goal
4. Ends with an encouraging, forward-looking sentence

Keep it to 3-4 sentences. Write directly to the parent (use "your child" or their child's name).`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content ?? "";
      const goalDetail = typeof rawContent === "string" ? rawContent : "";

      // Save to profile
      await upsertUserProfile(ctx.user.id, {
        parentSignupReason: input.parentSignupReason,
        parentGoalCategory: input.parentGoalCategory,
        parentGoalDetail: goalDetail,
        onboardingStep: 2,
      });

      return { goalDetail };
    }),

  /**
   * Mark onboarding as complete for the current user.
   */
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await markOnboardingComplete(ctx.user.id);
    return { success: true };
  }),

  // ─── Student Invite Tokens ─────────────────────────────────────────────────

  /**
   * Parent: generate a student invite token (link) for a child.
   * The child uses this link to sign up and get auto-linked to the parent.
   */
  createStudentInvite: protectedProcedure
    .input(z.object({
      childName: z.string().min(1).max(256).optional(),
      childEmail: z.string().email().optional(),
      childGrade: z.string().optional(),   // parent pre-sets child's grade level
    }))
    .mutation(async ({ ctx, input }) => {
      // Upgrade to parent if needed
      if (ctx.user.accountType !== "parent") {
        await updateUserAccountType(ctx.user.id, "parent");
      }
      const invite = await createStudentInviteToken(ctx.user.id, input.childName, input.childEmail, input.childGrade);
      if (!invite) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create invite." });
      return { token: invite.token, expiresAt: invite.expiresAt };
    }),

  /**
   * Public: look up a student invite token (for the sign-up landing page).
   */
  lookupStudentInvite: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invite = await getStudentInviteToken(input.token);
      if (!invite) return { valid: false, invite: null };
      if (invite.status !== "pending") return { valid: false, invite: null, reason: invite.status };
      if (new Date(invite.expiresAt) < new Date()) return { valid: false, invite: null, reason: "expired" };
      return {
        valid: true,
        invite: {
          token: invite.token,
          childName: invite.childName,
          childEmail: invite.childEmail,
          childGrade: invite.childGrade,   // pre-fills grade in StudentOnboarding
          expiresAt: invite.expiresAt,
        },
      };
    }),

  /**
   * Protected: accept a student invite token after the student has signed in.
   * Links the student to the parent and marks the token as used.
   */
  acceptStudentInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await getStudentInviteToken(input.token);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite token." });
      if (invite.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `This invite has already been ${invite.status}.` });
      }
      if (new Date(invite.expiresAt) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invite link has expired. Ask your parent to send a new one." });
      }
      if (ctx.user.accountType === "parent") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Parent accounts cannot accept student invites. Please sign in with a student account." });
      }

      // Check not already linked
      const existing = await getParentChildLink(invite.parentId, ctx.user.id);
      if (existing?.isActive) {
        throw new TRPCError({ code: "CONFLICT", message: "You are already linked to this parent account." });
      }

      // Link student to parent
      await enrollChild(invite.parentId, ctx.user.id, invite.childName ?? undefined, "parent");
      await acceptStudentInviteToken(input.token, ctx.user.id);

      notifyOwner({
        title: "Student Invite Accepted",
        content: `${ctx.user.name ?? ctx.user.email} accepted a student invite from parent ID ${invite.parentId}.`,
      }).catch(() => {});

      return { success: true, parentId: invite.parentId };
    }),

  /**
   * Parent: list pending student invites they have sent.
   */
  listStudentInvites: protectedProcedure.query(async ({ ctx }) => {
    const { getPendingStudentInvitesForParent } = await import("../db");
    return getPendingStudentInvitesForParent(ctx.user.id);
  }),

  /** Get personalization settings for the current user. */
  getPersonalization: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    return {
      colorPalette: (profile as any)?.colorPalette ?? "indigo",
      displayName: (profile as any)?.displayName ?? null,
      preferredName: (profile as any)?.preferredName ?? null,
      aiWelcomeMessage: (profile as any)?.aiWelcomeMessage ?? null,
    };
  }),

  /** Save personalization settings for the current user. */
  savePersonalization: protectedProcedure
    .input(
      z.object({
        colorPalette: z.enum(["indigo", "emerald", "rose", "violet", "amber", "teal"]).optional(),
        displayName: z.string().max(128).optional(),
        preferredName: z.string().max(64).optional().nullable(),
        aiWelcomeMessage: z.string().max(500).optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertUserProfile(ctx.user.id, {
        ...(input.colorPalette !== undefined ? { colorPalette: input.colorPalette } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.preferredName !== undefined && input.preferredName !== null
          ? { preferredName: input.preferredName }
          : {}),
        ...(input.aiWelcomeMessage !== undefined && input.aiWelcomeMessage !== null
          ? { aiWelcomeMessage: input.aiWelcomeMessage }
          : {}),
      });
      return { success: true };
    }),
});
