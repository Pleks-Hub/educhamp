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
  createParentInviteToken,
  getParentInviteToken,
  acceptParentInviteToken,
  rejectParentInviteToken,
  getPendingParentInvitesForStudent,
  getPendingInvitesForParentEmail,
  updateParentInviteStudentContext,
  subscribeToNewsletter,
  enrollChild,
  updateUserAccountType,
  updateUserGrade,
  getParentChildLink,
  getGradeDefaultCourse,
  enrollUserInCourse,
  setUserActiveCourse,
  getUserCourseEnrollments,
  getUserById,
  getActiveCourseIdForUser,
  getCourseById,
  getUserByEmail,
} from "../db";
import { isYoungLearnerGrade } from "../educhamp-helpers";
import { validateGuardianAge, validateStudentAge } from "../../shared/ageValidation";
import { buildParentInviteEmail } from "../emailTemplates/parentInvite";
import { buildParentBillingNotificationEmail } from "../emailTemplates/parentBillingNotification";
import { sendEmail } from "../emailService";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const studentProfileSchema = z.object({
  // DOB is required for age eligibility verification
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("US"),
  schoolDistrict: z.string().optional(),
  schoolType: z.enum(["public", "private", "homeschool", "charter", "other"]).optional(),
  schoolName: z.string().optional(),
  gradeLevel: z.string().optional(),
});

const parentProfileSchema = z.object({
  // DOB + state are required for state-aware age-of-majority verification
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  state: z.string().min(1, "State is required to determine the age of majority in your location"),
  gender: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("US"),
  schoolDistrict: z.string().optional(),
  schoolType: z.enum(["public", "private", "homeschool", "charter", "other"]).optional(),
  schoolName: z.string().optional(),
  gradeLevel: z.string().optional(),
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
      // Enforce student age eligibility before saving
      const ageCheck = validateStudentAge(input.dateOfBirth);
      if (!ageCheck.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: ageCheck.reason });
      }
      // Auto-enable Parent-Led Mode for Pre-K and Kindergarten
      const earlyGrades = ["Pre-K", "Kindergarten"];
      const autoParentLed = earlyGrades.includes(input.gradeLevel ?? "");
      await upsertUserProfile(ctx.user.id, {
        ...input,
        onboardingStep: 1,
        ...(autoParentLed ? { parentLedMode: true } : {}),
      });
      // Sync gradeLevel to users.grade so auto-enrollment uses the correct grade
      if (input.gradeLevel) {
        const normalised = input.gradeLevel.replace(/^Grade\s+/i, "").trim();
        await updateUserGrade(ctx.user.id, normalised || input.gradeLevel);
      }
      return { success: true };
    }),

  /**
   * Save parent demographic profile + signup reason (step 1 of parent onboarding).
   * Enforces state-aware age-of-majority check before saving.
   */
  saveParentProfile: protectedProcedure
    .input(parentProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // Enforce guardian age-of-majority for the given state
      const ageCheck = validateGuardianAge(input.dateOfBirth, input.state);
      if (!ageCheck.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: ageCheck.reason });
      }
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
        test_prep: "preparing for standardized tests (SAT, ACT, AP, or state assessments)",
        enrichment: "enriching their child's math skills beyond the classroom",
        remediation: "addressing learning gaps and catching up across subjects",
        homeschool_supplement: "supplementing their homeschool curriculum with structured EduChamp content",
        other: "supporting their child's math education",
      };

      const goalLabel = categoryLabels[input.parentGoalCategory] ?? "supporting their child's math education";
      const childInfo = input.childName ? `Their child's name is ${input.childName}` : "Their child";
      const gradeInfo = input.childGrade ? `, currently in Grade ${input.childGrade}` : "";
      const schoolInfo = input.schoolType && input.schoolType !== "public"
        ? ` (${input.schoolType === "homeschool" ? "homeschooled" : `attending a ${input.schoolType} school`})`
        : "";

      const systemPrompt = `You are EduChamp's onboarding advisor. Your job is to create a personalised, actionable learning goal statement for a parent who has just enrolled their child in EduChamp — an AI-powered adaptive learning platform for Pre-K through Grade 12. Be warm, specific, and encouraging. Keep the response to 3-4 sentences maximum.`;

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
   * For student accounts: auto-enrols them in the grade-appropriate default course
   * if they have no active enrollment yet.
   */
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    await markOnboardingComplete(ctx.user.id);

    let autoEnrolledCourse: { id: number; title: string; courseCode: string } | null = null;

    // Auto-enrol student accounts in their grade-appropriate default course
    if (ctx.user.accountType !== "parent") {
      const existingEnrollments = await getUserCourseEnrollments(ctx.user.id);
      if (existingEnrollments.length === 0) {
        // Determine grade level from profile or user record
        const profile = await getUserProfile(ctx.user.id);
        const rawGrade = (profile as any)?.gradeLevel ?? ctx.user.grade ?? "9";
        // Normalise "Grade 6" → "6", "Grade 9" → "9", "AP" stays "AP"
        const gradeLevel = rawGrade.replace(/^Grade\s+/i, "").trim() || "9";
        const defaultCourse = await getGradeDefaultCourse(gradeLevel);
        if (defaultCourse) {
          await setUserActiveCourse(ctx.user.id, defaultCourse.id);
          autoEnrolledCourse = {
            id: defaultCourse.id,
            title: defaultCourse.title,
            courseCode: defaultCourse.courseCode,
          };
        }
      }
    }

    return { success: true, autoEnrolledCourse };
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

  // ─── Parent Invite Tokens (student → parent direction) ────────────────────

  /**
   * Student: invite a parent/guardian to link their account.
   * Enriches the invite with student context (name, grade, course) for the email.
   * Smart-routes: if the parent email already has an EduChamp account, the invite
   * URL deep-links to the Parent Portal instead of the onboarding flow.
   */
  inviteParent: protectedProcedure
    .input(
      z.object({
        parentName: z.string().max(256).optional(),
        parentEmail: z.string().email().optional(),
        parentPhone: z.string().max(32).optional(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Gather student context for the email
      const student = await getUserById(ctx.user.id);
      const profile = await getUserProfile(ctx.user.id);
      const studentGrade = (profile as any)?.gradeLevel ?? student?.grade ?? undefined;
      let courseNameForEmail: string | undefined;
      try {
        const courseId = await getActiveCourseIdForUser(ctx.user.id);
        const course = await getCourseById(courseId);
        courseNameForEmail = course?.title ?? undefined;
      } catch { /* ignore */ }

      const invite = await createParentInviteToken(
        ctx.user.id,
        input.parentName,
        input.parentEmail,
        input.parentPhone
      );
      if (!invite) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create parent invite." });

      // Persist student context on the invite row
      await updateParentInviteStudentContext(invite.token, {
        studentName: student?.name ?? ctx.user.name ?? undefined,
        studentGrade,
        courseName: courseNameForEmail,
      });

      // Detect if parent already has an account → deep-link to portal
      let isExistingUser = false;
      if (input.parentEmail) {
        const existingParent = await getUserByEmail(input.parentEmail);
        isExistingUser = !!existingParent;
      }

      const inviteUrl = isExistingUser
        ? `${input.origin}/parent?pendingInvite=${invite.token}`
        : `${input.origin}/join?parentInvite=${invite.token}`;

      // Build branded email
      const emailData = buildParentInviteEmail({
        studentName: student?.name ?? ctx.user.name ?? "Your student",
        studentGrade,
        courseName: courseNameForEmail,
        parentName: input.parentName,
        inviteUrl,
        expiresAt: new Date(invite.expiresAt),
        isExistingUser,
      });

      // Send transactional email via Resend (non-blocking — don't fail the invite if email fails)
      let emailSent = false;
      let emailError: string | undefined;
      if (input.parentEmail) {
        const emailResult = await sendEmail({
          to: input.parentEmail,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          templateName: "parent-invite",
          referenceId: invite.token,
        });
        emailSent = emailResult.success;
        emailError = emailResult.error;
      }

      // Also notify owner for audit trail
      notifyOwner({
        title: "Student Invited Parent",
        content: `Student ${ctx.user.name ?? ctx.user.email} invited ${input.parentEmail ?? "a parent"} to join EduChamp.\nInvite URL: ${inviteUrl}\nEmail sent: ${emailSent ? "yes" : `no (${emailError ?? "no email provided"})`}`,
      }).catch(() => {});

      return {
        token: invite.token,
        inviteUrl,
        expiresAt: invite.expiresAt,
        isExistingUser,
        emailSent,
        emailPreview: emailData.html,
      };
    }),

  /**
   * Student: resend a parent invite — revoke the old token, create a fresh one, and re-send the email.
   * Rate-limited to 10 resends per student per 24 hours.
   */
  resendParentInvite: protectedProcedure
    .input(
      z.object({
        oldToken: z.string(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const oldInvite = await getParentInviteToken(input.oldToken);
      if (!oldInvite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });
      if (oldInvite.studentId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your invite." });

      // Rate-limit: max 10 resends in 24h
      const resendCount = oldInvite.resendCount ?? 0;
      const lastResent = oldInvite.lastResentAt ? new Date(oldInvite.lastResentAt) : null;
      const hoursSinceLast = lastResent ? (Date.now() - lastResent.getTime()) / 3_600_000 : 999;
      if (resendCount >= 10 && hoursSinceLast < 24) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You have reached the resend limit (10 per 24 hours). Please wait before trying again." });
      }

      // Revoke old token
      await rejectParentInviteToken(input.oldToken); // reuses reject helper to set status=rejected/revoked

      // Gather student context
      const student = await getUserById(ctx.user.id);
      const profile = await getUserProfile(ctx.user.id);
      const studentGrade = (profile as any)?.gradeLevel ?? student?.grade ?? undefined;
      let courseNameForEmail: string | undefined;
      try {
        const courseId = await getActiveCourseIdForUser(ctx.user.id);
        const course = await getCourseById(courseId);
        courseNameForEmail = course?.title ?? undefined;
      } catch { /* ignore */ }

      // Create new token
      const newInvite = await createParentInviteToken(
        ctx.user.id,
        oldInvite.parentName ?? undefined,
        oldInvite.parentEmail ?? undefined,
        oldInvite.parentPhone ?? undefined
      );
      if (!newInvite) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create new invite." });

      await updateParentInviteStudentContext(newInvite.token, {
        studentName: student?.name ?? ctx.user.name ?? undefined,
        studentGrade,
        courseName: courseNameForEmail,
      });

      // Bump resend counter on new token
      const db = await (await import("../db")).getDb();
      if (db) {
        const { parentInviteTokens } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(parentInviteTokens)
          .set({ resendCount: resendCount + 1, lastResentAt: new Date() })
          .where(eq(parentInviteTokens.token, newInvite.token));
      }

      // Detect existing parent
      let isExistingUser = false;
      if (oldInvite.parentEmail) {
        const existingParent = await getUserByEmail(oldInvite.parentEmail);
        isExistingUser = !!existingParent;
      }

      const inviteUrl = isExistingUser
        ? `${input.origin}/parent?pendingInvite=${newInvite.token}`
        : `${input.origin}/join?parentInvite=${newInvite.token}`;

      // Build and send email
      const emailData = buildParentInviteEmail({
        studentName: student?.name ?? ctx.user.name ?? "Your student",
        studentGrade,
        courseName: courseNameForEmail,
        parentName: oldInvite.parentName ?? undefined,
        inviteUrl,
        expiresAt: new Date(newInvite.expiresAt),
        isExistingUser,
      });

      let emailSent = false;
      if (oldInvite.parentEmail) {
        const emailResult = await sendEmail({
          to: oldInvite.parentEmail,
          subject: `[Resent] ${emailData.subject}`,
          html: emailData.html,
          text: emailData.text,
          templateName: "parent-invite-resend",
          referenceId: newInvite.token,
        });
        emailSent = emailResult.success;
      }

      notifyOwner({
        title: "Student Resent Parent Invite",
        content: `Student ${ctx.user.name ?? ctx.user.email} resent parent invite to ${oldInvite.parentEmail ?? "unknown"}. New token: ${newInvite.token}. Email sent: ${emailSent}.`,
      }).catch(() => {});

      return {
        token: newInvite.token,
        inviteUrl,
        expiresAt: newInvite.expiresAt,
        isExistingUser,
        emailSent,
        resendCount: resendCount + 1,
      };
    }),

  /**
   * Student: get the full status of all parent invites they have sent (for the dashboard banner).
   */
  getMyParentInviteStatus: protectedProcedure.query(async ({ ctx }) => {
    const invites = await getPendingParentInvitesForStudent(ctx.user.id);
    // Also check for non-pending (accepted/rejected) invites
    const db = await (await import("../db")).getDb();
    if (!db) return [];
    const { parentInviteTokens } = await import("../../drizzle/schema");
    const { eq, desc } = await import("drizzle-orm");
    const allInvites = await db
      .select()
      .from(parentInviteTokens)
      .where(eq(parentInviteTokens.studentId, ctx.user.id))
      .orderBy(desc(parentInviteTokens.createdAt))
      .limit(10);
    return allInvites.map((inv) => ({
      id: inv.id,
      token: inv.token,
      parentName: inv.parentName,
      parentEmail: inv.parentEmail,
      status: inv.status,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      rejectedAt: inv.rejectedAt,
      resendCount: inv.resendCount ?? 0,
      lastResentAt: inv.lastResentAt,
      createdAt: inv.createdAt,
    }));
  }),

  /**
   * Public: look up a parent invite token.
   */
  lookupParentInvite: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invite = await getParentInviteToken(input.token);
      if (!invite) return { valid: false, invite: null };
      if (invite.status !== "pending") return { valid: false, invite: null, reason: invite.status };
      if (new Date(invite.expiresAt) < new Date()) return { valid: false, invite: null, reason: "expired" };
      return {
        valid: true,
        invite: {
          token: invite.token,
          parentName: invite.parentName,
          parentEmail: invite.parentEmail,
          expiresAt: invite.expiresAt,
        },
      };
    }),

  /**
   * Protected: accept a parent invite token after the parent has signed in.
   * Works for both new parents (via /join flow) and existing parents (via portal).
   */
  acceptParentInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await getParentInviteToken(input.token);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite token." });
      if (invite.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `This invite has already been ${invite.status}.` });
      }
      if (new Date(invite.expiresAt) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invite link has expired. Ask the student to send a new one." });
      }
      // Upgrade to parent if needed
      if (ctx.user.accountType !== "parent") {
        await updateUserAccountType(ctx.user.id, "parent");
      }
      // Check not already linked
      const existing = await getParentChildLink(ctx.user.id, invite.studentId);
      if (!existing?.isActive) {
        await enrollChild(ctx.user.id, invite.studentId, invite.studentName ?? undefined, "student");
      }
      await acceptParentInviteToken(input.token, ctx.user.id);
      notifyOwner({
        title: "Parent Accepted Student Invite",
        content: `${ctx.user.name ?? ctx.user.email} accepted a parent invite from student ID ${invite.studentId}.`,
      }).catch(() => {});
      return { success: true, studentId: invite.studentId };
    }),

  /**
   * Protected: reject a parent invite token (parent declines the student's request).
   */
  rejectParentInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await getParentInviteToken(input.token);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite token." });
      if (invite.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `This invite has already been ${invite.status}.` });
      }
      await rejectParentInviteToken(input.token);
      notifyOwner({
        title: "Parent Rejected Student Invite",
        content: `${ctx.user.name ?? ctx.user.email} rejected a parent invite from student ID ${invite.studentId}.`,
      }).catch(() => {});
      return { success: true };
    }),

  /**
   * Protected: get all pending invites addressed to the current user's email.
   * Used in the Parent Portal to show "Pending Student Requests".
   */
  getPendingInvitesForMe: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.email) return [];
    const invites = await getPendingInvitesForParentEmail(ctx.user.email);
    // Enrich with student name from invite row (already stored) or fall back to studentId
    return invites.map((inv) => ({
      id: inv.id,
      token: inv.token,
      studentId: inv.studentId,
      studentName: inv.studentName ?? `Student #${inv.studentId}`,
      studentGrade: inv.studentGrade ?? null,
      courseName: inv.courseName ?? null,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));
  }),

  /**
   * Student: list pending parent invites they have sent.
   */
  listParentInvites: protectedProcedure.query(async ({ ctx }) => {
    return getPendingParentInvitesForStudent(ctx.user.id);
  }),

  /**
   * Student: get the status of a specific parent invite token.
   */
  getParentInviteStatus: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invite = await getParentInviteToken(input.token);
      if (!invite) return null;
      return {
        status: invite.status,
        parentName: invite.parentName,
        parentEmail: invite.parentEmail,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        rejectedAt: invite.rejectedAt,
      };
    }),

  // ─── Newsletter ────────────────────────────────────────────────────────────

  /**
   * Public: subscribe to the EduChamp newsletter.
   */
  subscribeNewsletter: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().max(256).optional(),
        source: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await subscribeToNewsletter(input.email, input.name, input.source ?? "landing_page");
      return result ?? { alreadySubscribed: false, email: input.email };
    }),

  /** Get personalization settings for the current user. */
  getPersonalization: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getUserProfile(ctx.user.id);
    // Determine whether the student's active course is an early-childhood course
    // so the UI can enable/disable the Parent-Led Mode toggle accordingly.
    const activeCourseId = await getActiveCourseIdForUser(ctx.user.id).catch(() => null);
    const activeCourse = activeCourseId ? await getCourseById(activeCourseId).catch(() => null) : null;
    const activeCourseIsEarlyChildhood = isYoungLearnerGrade(activeCourse?.gradeLevel);
    return {
      colorPalette: (profile as any)?.colorPalette ?? "indigo",
      displayName: (profile as any)?.displayName ?? null,
      preferredName: (profile as any)?.preferredName ?? null,
      aiWelcomeMessage: (profile as any)?.aiWelcomeMessage ?? null,
      parentLedMode: (profile as any)?.parentLedMode ?? false,
      disableAnimations: (profile as any)?.disableAnimations ?? false,
      disableSound: (profile as any)?.disableSound ?? false,
      languageLevel: ((profile as any)?.languageLevel ?? "standard") as "simplified" | "standard" | "advanced",
      activeCourseIsEarlyChildhood,
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
        parentLedMode: z.boolean().optional(),
        disableAnimations: z.boolean().optional(),
        disableSound: z.boolean().optional(),
        languageLevel: z.enum(["simplified", "standard", "advanced"]).optional(),
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
        ...(input.parentLedMode !== undefined ? { parentLedMode: input.parentLedMode } : {}),
        ...(input.disableAnimations !== undefined ? { disableAnimations: input.disableAnimations } : {}),
        ...(input.disableSound !== undefined ? { disableSound: input.disableSound } : {}),
        ...(input.languageLevel !== undefined ? { languageLevel: input.languageLevel } : {}),
      });
      return { success: true };
    }),

  /**
   * Student (minor): notify parent/guardian that billing setup is needed.
   * If the student has a linked parent, sends email + in-app notification.
   * If not, requires parentEmail input to send the notification.
   */
  notifyParentForBilling: protectedProcedure
    .input(
      z.object({
        parentEmail: z.string().email().max(320).optional(),
        parentName: z.string().max(256).optional(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { getParentsByChildId, getDb } = await import("../db");
      const { userNotifications } = await import("../../drizzle/schema");

      const studentName = ctx.user.name ?? "Your student";

      // Check if student already has a linked parent
      const parents = await getParentsByChildId(ctx.user.id);
      let targetEmail = parents[0]?.parentEmail ?? input.parentEmail;
      let targetParentName = parents[0]?.parentName ?? input.parentName;
      let targetParentId = parents[0]?.parentId ?? null;

      if (!targetEmail && !input.parentEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No parent is linked to your account. Please provide a parent email address.",
        });
      }

      if (!targetEmail) targetEmail = input.parentEmail!;
      if (!targetParentName) targetParentName = input.parentName;

      // Validate email is not the student's own
      if (targetEmail.toLowerCase().trim() === (ctx.user.email ?? "").toLowerCase().trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Parent email must be different from your own email.",
        });
      }

      const billingSetupUrl = `${input.origin}/billing/setup`;

      // Send email notification
      const emailData = buildParentBillingNotificationEmail({
        studentName,
        parentName: targetParentName ?? undefined,
        billingSetupUrl,
      });

      let emailSent = false;
      await sendEmail({
        to: targetEmail,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        templateName: "parent-billing-notification",
        referenceId: `billing-notify-${ctx.user.id}`,
      }).then(() => { emailSent = true; }).catch((err) => {
        console.error("[BillingNotify] Failed to send email:", err);
      });

      // Send in-app notification if parent has an account
      if (targetParentId) {
        const db = await getDb();
        if (db) {
          await db.insert(userNotifications).values({
            userId: targetParentId,
            type: "billing_setup_needed",
            title: "Billing Setup Needed",
            message: `${studentName} is trying to access EduChamp. To activate their account, please complete billing setup and add them to your profile.`,
            isRead: false,
            metadata: JSON.stringify({
              studentId: ctx.user.id,
              studentName,
              action: "billing_setup",
            }),
          });
        }
      }

      // Notify owner for audit
      notifyOwner({
        title: "Minor Student Needs Billing",
        content: `Student ${studentName} (ID: ${ctx.user.id}) triggered billing notification to ${targetEmail}.\nEmail sent: ${emailSent ? "yes" : "no"}`,
      }).catch(() => {});

      return { sent: true, emailSent, parentEmail: targetEmail };
    }),
});
