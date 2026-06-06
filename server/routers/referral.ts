/**
 * Referral Router
 * Handles platform referral link generation, tracking, and redemption.
 */
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createReferralCode,
  getReferralByCode,
  getReferralsForUser,
  incrementReferralClick,
  recordReferralSignup,
  getReferralSignups,
  getUserByOpenId,
} from "../db";
// notifyOwner removed — all notifications now go through sendEmail (Resend) only.

export const referralRouter = router({
  /**
   * Generate a new referral code for the current user.
   */
  createCode: protectedProcedure
    .input(z.object({
      targetRole: z.enum(["parent", "student", "teacher"]).default("parent"),
      note: z.string().max(256).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const referral = await createReferralCode(ctx.user.id, input.targetRole, input.note);
      if (!referral) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create referral code." });
      return { code: referral.code, id: referral.id };
    }),

  /**
   * List all referral codes created by the current user, with signup counts.
   */
  listMyCodes: protectedProcedure.query(async ({ ctx }) => {
    const codes = await getReferralsForUser(ctx.user.id);
    const signups = await getReferralSignups(ctx.user.id);
    const signupsByCode = signups.reduce((acc, s) => {
      acc[s.referralId] = (acc[s.referralId] ?? 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return codes.map((c) => ({
      id: c.id,
      code: c.code,
      targetRole: c.targetRole,
      note: c.note,
      clickCount: c.clickCount,
      signupCount: signupsByCode[c.id] ?? c.signupCount,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  }),

  /**
   * Public: look up a referral code (for landing page personalisation).
   * Also increments the click counter.
   */
  lookupCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const referral = await getReferralByCode(input.code);
      if (!referral || !referral.isActive) {
        return { valid: false, referral: null };
      }
      if (referral.expiresAt && new Date(referral.expiresAt) < new Date()) {
        return { valid: false, referral: null };
      }
      // Increment click count (fire-and-forget)
      incrementReferralClick(referral.id).catch(() => {});
      return {
        valid: true,
        referral: {
          code: referral.code,
          targetRole: referral.targetRole,
          clickCount: referral.clickCount,
        },
      };
    }),

  /**
   * Protected: redeem a referral code after the user has signed up.
   * Called during onboarding when a user provides a referral code.
   */
  redeemCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const referral = await getReferralByCode(input.code);
      if (!referral || !referral.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired referral code." });
      }
      if (referral.expiresAt && new Date(referral.expiresAt) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This referral code has expired." });
      }
      if (referral.referrerId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot redeem your own referral code." });
      }

      await recordReferralSignup(referral.id, referral.referrerId, ctx.user.id, ctx.user.email ?? undefined);

      // Audit log + webhook alert
      console.log(`[Audit] Referral Redeemed: ${ctx.user.name ?? ctx.user.email} used code ${input.code} (referrer ID: ${referral.referrerId})`);
      import("../services/webhookAlerts").then(({ sendAlert }) =>
        sendAlert({
          event: "referral_redeemed",
          title: "Referral Code Redeemed",
          message: `${ctx.user.name ?? ctx.user.email ?? "Unknown"} used referral code \`${input.code}\` (referrer ID: ${referral.referrerId}).`,
          severity: "info",
          metadata: { userId: ctx.user.id, code: input.code, referrerId: referral.referrerId },
        })
      ).catch(() => {});

      return { success: true, referrerId: referral.referrerId };
    }),
});
