/**
 * COPPA Parental Consent Router
 *
 * Handles the full COPPA consent flow:
 *  - requestConsent: student triggers a consent email to their parent
 *  - consentStatus: student polls their consent status
 *  - approveConsent: parent approves via tokenised link (public)
 *  - denyConsent: parent denies via tokenised link (public)
 *  - adminListPending: admin views pending consents
 *
 * The COPPA gate is only active when the platform setting
 * COPPA_GATE_ENABLED = "true". When disabled, all checks pass.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createParentalConsentRequest,
  getLatestParentalConsent,
  getParentalConsentByToken,
  approveParentalConsent,
  denyParentalConsent,
  getPendingParentalConsents,
  hasParentalConsent,
  isCoppaGrade,
  getUserProfile,
  getPlatformSettings,
} from "../db";
import { sendEmail } from "../emailService";
import { buildCoppaConsentEmail } from "../emailTemplates/coppaConsentRequest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isCoppaGateEnabled(): Promise<boolean> {
  const settings = await getPlatformSettings();
  const setting = settings.find((s) => s.key === "COPPA_GATE_ENABLED");
  return setting?.value === "true";
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const coppaRouter = router({
  /**
   * Student: request parental consent.
   * Validates that:
   *   - COPPA gate is enabled
   *   - Student's grade is COPPA-relevant (≤ Grade 6)
   *   - parentEmail ≠ student's own email
   *   - No approved consent already exists
   */
  requestConsent: protectedProcedure
    .input(
      z.object({
        parentEmail: z.string().email().max(320),
        parentName: z.string().max(256).optional(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const enabled = await isCoppaGateEnabled();
      if (!enabled) return { sent: false, reason: "gate_disabled" };

      // Validate parentEmail ≠ student email
      const studentEmail = ctx.user.email?.toLowerCase().trim() ?? "";
      if (input.parentEmail.toLowerCase().trim() === studentEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Parent email must be different from your own login email.",
        });
      }

      // Check grade
      const profile = await getUserProfile(ctx.user.id);
      if (!profile || !isCoppaGrade(profile.gradeLevel)) {
        return { sent: false, reason: "not_coppa_grade" };
      }

      // Check if already approved (or grandfathered)
      const alreadyApproved = await hasParentalConsent(ctx.user.id);
      if (alreadyApproved) return { sent: false, reason: "already_approved" };

      // Create consent request
      const token = await createParentalConsentRequest(
        ctx.user.id,
        input.parentEmail,
        input.parentName
      );

      const approveUrl = `${input.origin}/consent/approve?token=${token}`;
      const denyUrl = `${input.origin}/consent/deny?token=${token}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Send email (non-blocking)
      const { html, text, subject } = buildCoppaConsentEmail({
        studentName: ctx.user.name ?? "Your child",
        studentGrade: profile.gradeLevel ?? undefined,
        parentName: input.parentName,
        parentEmail: input.parentEmail,
        approveUrl,
        denyUrl,
        expiresAt,
      });

      await sendEmail({
        to: input.parentEmail,
        subject,
        html,
        text,
        templateName: "coppa-consent-request",
        referenceId: token,
      }).catch((err) => {
        console.error("[COPPA] Failed to send consent email:", err);
      });

      return { sent: true, expiresAt };
    }),

  /**
   * Student: poll their consent status.
   */
  consentStatus: protectedProcedure.query(async ({ ctx }) => {
    const enabled = await isCoppaGateEnabled();
    if (!enabled) return { required: false, status: "not_required" as const };

    const profile = await getUserProfile(ctx.user.id);
    if (!profile || !isCoppaGrade(profile.gradeLevel)) {
      return { required: false, status: "not_required" as const };
    }

    const approved = await hasParentalConsent(ctx.user.id);
    if (approved) return { required: true, status: "approved" as const };

    const latest = await getLatestParentalConsent(ctx.user.id);
    if (!latest) return { required: true, status: "not_requested" as const };
    if (latest.status === "expired" || latest.expiresAt < new Date()) {
      return { required: true, status: "expired" as const };
    }
    return {
      required: true,
      status: latest.status as "pending" | "denied",
      parentEmail: latest.parentEmail,
      expiresAt: latest.expiresAt,
    };
  }),

  /**
   * Public: parent approves consent via tokenised link.
   */
  approveConsent: publicProcedure
    .input(z.object({ token: z.string().min(1), origin: z.string().url().optional() }))
    .mutation(async ({ ctx, input }) => {
      const ip = (ctx.req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
        ?? ctx.req.socket?.remoteAddress
        ?? undefined;
      const result = await approveParentalConsent(input.token, ip);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This consent link is invalid, has already been used, or has expired.",
        });
      }
      return { approved: true };
    }),

  /**
   * Public: parent denies consent via tokenised link.
   */
  denyConsent: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const ip = (ctx.req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
        ?? ctx.req.socket?.remoteAddress
        ?? undefined;
      await denyParentalConsent(input.token, ip);
      return { denied: true };
    }),

  /**
   * Public: look up a consent request for the approval page UI.
   */
  getConsentRequest: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const consent = await getParentalConsentByToken(input.token);
      if (!consent) return null;
      return {
        studentId: consent.studentId,
        parentEmail: consent.parentEmail,
        status: consent.status,
        expiresAt: consent.expiresAt,
        isExpired: consent.expiresAt < new Date(),
      };
    }),

  /**
   * Admin: list pending consent requests.
   */
  adminListPending: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
    }
    return getPendingParentalConsents();
  }),
});
