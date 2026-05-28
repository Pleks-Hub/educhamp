/**
 * Auth Enhancements Router
 * Handles: welcome email on signup, password reset flow, optional 2FA (TOTP)
 */
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { notifyOwner } from "../_core/notification";
import {
  getUserByEmail,
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  upsertTwoFactor,
  getTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
  consumeBackupCode,
} from "../db";

// ─── Welcome Email ─────────────────────────────────────────────────────────────

export async function sendWelcomeNotification(user: {
  id: number;
  name: string | null;
  email: string | null;
  accountType: string;
}) {
  const displayName = user.name ?? "there";
  const roleLabel = user.accountType === "parent" ? "Parent/Guardian" : "Student";
  await notifyOwner({
    title: `🎉 New ${roleLabel} Joined EduChamp: ${user.name ?? user.email ?? "Unknown"}`,
    content: `A new ${roleLabel.toLowerCase()} has signed up for EduChamp.\n\n**Name:** ${user.name ?? "Not provided"}\n**Email:** ${user.email ?? "Not provided"}\n**Account Type:** ${roleLabel}\n\nWelcome them to the platform!`,
  });
}

// ─── Password Reset ─────────────────────────────────────────────────────────────

export const authEnhancementsRouter = router({
  // Request a password reset link — sends a notification with the token
  requestPasswordReset: publicProcedure
    .input(z.object({
      email: z.string().email(),
      origin: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      // Always return success to prevent email enumeration
      if (!user) return { success: true };

      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await createPasswordResetToken(user.id, token, expiresAt);

      const resetUrl = `${input.origin}/reset-password?token=${token}`;

      await notifyOwner({
        title: `Password Reset Requested — ${user.name ?? user.email}`,
        content: `A password reset was requested for **${user.name ?? user.email}**.\n\n**Reset Link:** ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, no action is needed.`,
      });

      return { success: true };
    }),

  // Validate a reset token (used on the reset-password page to check token validity)
  validateResetToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const record = await getPasswordResetToken(input.token);
      if (!record) return { valid: false, reason: "Token not found" };
      if (record.usedAt) return { valid: false, reason: "Token already used" };
      if (record.expiresAt < new Date()) return { valid: false, reason: "Token expired" };
      return { valid: true };
    }),

  // Mark token as used (password reset is handled via OAuth — this just invalidates the token)
  consumeResetToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const record = await getPasswordResetToken(input.token);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
      if (record.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Token already used" });
      if (record.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Token expired" });
      await markPasswordResetTokenUsed(input.token);
      return { success: true };
    }),

  // ─── 2FA Setup ────────────────────────────────────────────────────────────────

  // Generate a new TOTP secret and QR code URI for the user to scan
  setup2FA: protectedProcedure.mutation(async ({ ctx }) => {
    const secretObj = speakeasy.generateSecret({ name: `EduChamp (${ctx.user.email ?? ctx.user.name ?? ctx.user.id})`, length: 20 });
    const secret = secretObj.base32;
    await upsertTwoFactor(ctx.user.id, secret);

    const otpAuthUrl = secretObj.otpauth_url!;
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return {
      secret,
      otpAuthUrl,
      qrCodeDataUrl,
    };
  }),

  // Verify a TOTP code and enable 2FA for the user
  verify2FA: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const record = await getTwoFactor(ctx.user.id);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "2FA not set up. Call setup2FA first." });
      if (record.isEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "2FA is already enabled." });

      const isValid = speakeasy.totp.verify({ token: input.code, secret: record.secret, encoding: "base32", window: 1 });
      if (!isValid) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid code. Please try again." });

      // Generate 8 backup codes
      const backupCodes = Array.from({ length: 8 }, () => nanoid(10).toUpperCase());
      await enableTwoFactor(ctx.user.id, backupCodes);

      return { success: true, backupCodes };
    }),

  // Disable 2FA (requires a valid TOTP code or backup code for confirmation)
  disable2FA: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const record = await getTwoFactor(ctx.user.id);
      if (!record || !record.isEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "2FA is not enabled." });

      // Accept either a TOTP code or a backup code
      const isValidTotp = speakeasy.totp.verify({ token: input.code, secret: record.secret, encoding: "base32", window: 1 });
      const isValidBackup = !isValidTotp && await consumeBackupCode(ctx.user.id, input.code);

      if (!isValidTotp && !isValidBackup) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid code." });
      }

      await disableTwoFactor(ctx.user.id);
      return { success: true };
    }),

  // Get current 2FA status for the logged-in user
  get2FAStatus: protectedProcedure.query(async ({ ctx }) => {
    const record = await getTwoFactor(ctx.user.id);
    return {
      isEnabled: record?.isEnabled ?? false,
      enabledAt: record?.enabledAt ?? null,
      backupCodesRemaining: record?.backupCodes?.length ?? 0,
    };
  }),

  // Generate fresh backup codes (requires 2FA to be enabled)
  generateBackupCodes: protectedProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const record = await getTwoFactor(ctx.user.id);
      if (!record || !record.isEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "2FA is not enabled." });

      const isValid = speakeasy.totp.verify({ token: input.code, secret: record.secret, encoding: "base32", window: 1 });
      if (!isValid) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid TOTP code." });

      const backupCodes = Array.from({ length: 8 }, () => nanoid(10).toUpperCase());
      await enableTwoFactor(ctx.user.id, backupCodes);
      return { backupCodes };
    }),
});
