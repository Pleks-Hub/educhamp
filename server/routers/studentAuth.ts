/**
 * Student Local Authentication Router
 *
 * Handles password creation and email+password login for parent-enrolled students
 * who don't have OAuth credentials.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import {
  getUserByEmail,
  getDb,
} from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildStudentSetupEmail } from "../emailTemplates/studentSetup";
import { COOKIE_NAME } from "@shared/const";

// ─── Setup Token Management ──────────────────────────────────────────────────

// In-memory token store (for simplicity; could be moved to DB for persistence)
// Token format: { userId, email, expiresAt }
interface SetupToken {
  userId: number;
  email: string;
  studentName: string;
  expiresAt: Date;
  usedAt?: Date;
}

// We'll use the existing passwordResetTokens table for setup tokens too
import { passwordResetTokens } from "../../drizzle/schema";

async function createSetupToken(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });
  return token;
}

async function getSetupToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  return result[0] ?? null;
}

async function markSetupTokenUsed(token: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.token, token));
}

// ─── Password Helpers ────────────────────────────────────────────────────────

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
    };
  }
  return { valid: true };
}

// ─── Cookie helpers ──────────────────────────────────────────────────────────

function getSessionCookieOptions(req: any) {
  const isSecure = req.headers["x-forwarded-proto"] === "https" || req.protocol === "https";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
  };
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// ─── Router ──────────────────────────────────────────────────────────────────

export const studentAuthRouter = router({
  /**
   * Validate a setup token (used on the student-setup page)
   */
  validateSetupToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const record = await getSetupToken(input.token);
      if (!record) return { valid: false, reason: "Token not found." };
      if (record.usedAt) return { valid: false, reason: "This link has already been used." };
      if (record.expiresAt < new Date()) return { valid: false, reason: "This link has expired. Ask your parent to resend it." };

      // Get the user info
      const db = await getDb();
      if (!db) return { valid: false, reason: "Service unavailable." };
      const userRows = await db.select().from(users).where(eq(users.id, record.userId)).limit(1);
      const user = userRows[0];
      if (!user) return { valid: false, reason: "Account not found." };

      return {
        valid: true,
        studentName: user.name ?? "Student",
        email: user.email ?? "",
        hasPassword: !!user.passwordHash,
      };
    }),

  /**
   * Create password for a parent-enrolled student (via setup token)
   */
  createPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8),
        confirmPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate passwords match
      if (input.password !== input.confirmPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Passwords do not match." });
      }

      // Validate password strength
      const validation = validatePassword(input.password);
      if (!validation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.message! });
      }

      // Validate token
      const record = await getSetupToken(input.token);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid setup link." });
      if (record.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This link has already been used." });
      if (record.expiresAt < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "This link has expired." });

      // Hash password and save
      const hash = await bcrypt.hash(input.password, 12);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable." });

      await db.update(users).set({
        passwordHash: hash,
        status: "active",
      }).where(eq(users.id, record.userId));

      // Mark token as used
      await markSetupTokenUsed(input.token);

      // Get the user to create a session
      const userRows = await db.select().from(users).where(eq(users.id, record.userId)).limit(1);
      const user = userRows[0];
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User not found." });

      // Create session token and set cookie
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Notify parent(s) that the student has activated their account (non-blocking)
      import("../db").then(async ({ getParentsByChildId }) => {
        try {
          const parents = await getParentsByChildId(user.id);
          const { buildStudentActivatedEmail } = await import("../emailTemplates/studentActivated");
          for (const parent of parents) {
            if (parent.parentEmail) {
              const emailContent = buildStudentActivatedEmail({
                parentName: parent.parentName || "Parent",
                studentName: user.name || "Student",
                studentEmail: user.email || "",
                activatedAt: new Date(),
              });
              await sendEmail({
                to: parent.parentEmail,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                templateName: "studentActivated",
              });
            }
          }
        } catch (err) {
          console.error("[createPassword] Failed to notify parent:", err);
        }
      });

      return { success: true, studentName: user.name ?? "Student" };
    }),

  /**
   * Email + Password login for parent-enrolled students
   */
  loginWithPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      if (!user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "No password set for this account. Check your email for a setup link, or sign in with Apple/Google.",
        });
      }

      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      // Check account status
      if (user.status === "suspended" || user.status === "deactivated") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your account has been suspended. Contact your parent or support." });
      }

      // Create session
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Update last sign in
      const db = await getDb();
      if (db) {
        await db.update(users).set({ lastSignedIn: new Date(), lastLoginAt: new Date() }).where(eq(users.id, user.id));
      }

      return { success: true, name: user.name ?? "Student" };
    }),

  /**
   * Send/resend setup email to a child (called by parent)
   */
  sendSetupEmail: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify parent-child relationship
      const { parentChildren } = await import("../../drizzle/schema");
      const link = await db
        .select()
        .from(parentChildren)
        .where(eq(parentChildren.parentId, ctx.user.id))
        .limit(100);
      const childLink = link.find((l) => l.childId === input.childId && l.isActive);
      if (!childLink) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student." });
      }

      // Get child info
      const childRows = await db.select().from(users).where(eq(users.id, input.childId)).limit(1);
      const child = childRows[0];
      if (!child || !child.email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Student not found or has no email." });
      }

      // Create setup token
      const token = await createSetupToken(child.id);
      const setupUrl = `https://educhamp.co/student-setup?token=${token}`;

      // Send email
      const emailContent = buildStudentSetupEmail({
        studentName: child.name ?? "Student",
        parentName: ctx.user.name ?? "Your parent",
        setupUrl,
      });

      await sendEmail({
        to: child.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        templateName: "studentSetup",
      });

      return { success: true };
    }),

  /**
   * Check if a student can use Apple Sign-In (email matches)
   */
  checkAppleSignInEligibility: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      if (!user) return { eligible: false, reason: "No account found with this email." };
      return { eligible: true, studentName: user.name ?? "Student" };
    }),

  /**
   * Change password for a logged-in student who already has a password
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
        confirmNewPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.newPassword !== input.confirmNewPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "New passwords do not match." });
      }

      const validation = validatePassword(input.newPassword);
      if (!validation.valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: validation.message! });
      }

      // Verify current password
      if (!ctx.user.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No password set. Use the setup link to create one first." });
      }

      const isValid = await bcrypt.compare(input.currentPassword, ctx.user.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
      }

      // Hash and save new password
      const hash = await bcrypt.hash(input.newPassword, 12);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Service unavailable." });

      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  /**
   * Request a password reset email (forgot password for student local auth)
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      // Always return success to prevent email enumeration
      const user = await getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        // Don't reveal whether the account exists
        return { success: true, message: "If an account with that email exists, a reset link has been sent." };
      }

      // Create a reset token (reusing the same token infrastructure)
      const token = await createSetupToken(user.id);
      const resetUrl = `https://educhamp.co/student-setup?token=${token}&mode=reset`;

      // Send reset email
      await sendEmail({
        to: user.email!,
        subject: "Reset Your EduChamp Password",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #0d9488; margin: 0;">EduChamp</h1>
            </div>
            <div style="background: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
              <h2 style="margin: 0 0 16px; color: #1e293b;">Password Reset Request</h2>
              <p style="color: #475569; line-height: 1.6;">Hi ${user.name ?? "Student"},</p>
              <p style="color: #475569; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
              </div>
              <p style="color: #64748b; font-size: 14px; line-height: 1.5;">This link expires in 7 days. If you didn't request this, you can safely ignore this email.</p>
              <p style="color: #64748b; font-size: 14px; line-height: 1.5;">Or copy this link: <a href="${resetUrl}" style="color: #0d9488;">${resetUrl}</a></p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">EduChamp — AI-Powered Learning</p>
          </div>
        `,
        text: `Hi ${user.name ?? "Student"}, reset your EduChamp password here: ${resetUrl} (expires in 7 days).`,
        templateName: "passwordReset",
      });

      return { success: true, message: "If an account with that email exists, a reset link has been sent." };
    }),
});
