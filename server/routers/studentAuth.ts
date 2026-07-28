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
import { users, passwordResetAttempts, loginAttempts } from "../../drizzle/schema";
import { eq, sql, and, gt, desc } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildStudentSetupEmail } from "../emailTemplates/studentSetup";
import { buildPasswordResetEmail } from "../emailTemplates/passwordReset";
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
      const db = await getDb();
      const ipAddress = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0] || ctx.req.ip || "unknown";

      // ─── Account Lockout Check ─────────────────────────────────────────
      const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
      const MAX_ATTEMPTS = 5;
      const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MS);

      if (db) {
        const recentFailures = await db
          .select({ count: sql<number>`count(*)` })
          .from(loginAttempts)
          .where(
            and(
              eq(loginAttempts.email, input.email.toLowerCase()),
              eq(loginAttempts.success, false),
              gt(loginAttempts.createdAt, windowStart)
            )
          );

        const failCount = recentFailures[0]?.count ?? 0;
        if (failCount >= MAX_ATTEMPTS) {
          // Find the most recent failed attempt to calculate remaining lockout time
          const lastAttempt = await db
            .select({ createdAt: loginAttempts.createdAt })
            .from(loginAttempts)
            .where(
              and(
                eq(loginAttempts.email, input.email.toLowerCase()),
                eq(loginAttempts.success, false),
                gt(loginAttempts.createdAt, windowStart)
              )
            )
            .orderBy(desc(loginAttempts.createdAt))
            .limit(1);

          const unlockAt = lastAttempt[0]
            ? new Date(lastAttempt[0].createdAt.getTime() + LOCKOUT_WINDOW_MS)
            : new Date(Date.now() + LOCKOUT_WINDOW_MS);
          const remainingMs = Math.max(0, unlockAt.getTime() - Date.now());
          const remainingMin = Math.ceil(remainingMs / 60000);

          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Account temporarily locked due to too many failed attempts. Try again in ${remainingMin} minute${remainingMin !== 1 ? "s" : ""}. If you forgot your password, use the reset link below.`,
          });
        }
      }

      // ─── Validate Credentials ──────────────────────────────────────────
      const user = await getUserByEmail(input.email);
      if (!user) {
        // Record failed attempt
        if (db) {
          await db.insert(loginAttempts).values({ email: input.email.toLowerCase(), ipAddress, success: false });
        }
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
        // Record failed attempt
        if (db) {
          await db.insert(loginAttempts).values({ email: input.email.toLowerCase(), ipAddress, success: false });
        }
        // Check if this was the 4th failure (warn them)
        if (db) {
          const updatedFailures = await db
            .select({ count: sql<number>`count(*)` })
            .from(loginAttempts)
            .where(
              and(
                eq(loginAttempts.email, input.email.toLowerCase()),
                eq(loginAttempts.success, false),
                gt(loginAttempts.createdAt, windowStart)
              )
            );
          const newCount = updatedFailures[0]?.count ?? 0;
          if (newCount >= MAX_ATTEMPTS) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: `Account locked for 15 minutes after ${MAX_ATTEMPTS} failed attempts. Use the forgot password link to reset your password.`,
            });
          } else if (newCount >= 3) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: `Invalid email or password. ${MAX_ATTEMPTS - newCount} attempt${MAX_ATTEMPTS - newCount !== 1 ? "s" : ""} remaining before your account is temporarily locked.`,
            });
          }
        }
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      // Check account status
      if (user.status === "suspended" || user.status === "deactivated") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your account has been suspended. Contact your parent or support." });
      }

      // Record successful login and clear failed attempts
      if (db) {
        await db.insert(loginAttempts).values({ email: input.email.toLowerCase(), ipAddress, success: true });
      }

      // Create session
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Update last sign in
      if (db) {
        await db.update(users).set({ lastSignedIn: new Date(), lastLoginAt: new Date() }).where(eq(users.id, user.id));
      }

      return { success: true, name: user.name ?? "Student" };
    }),

  /**
   * Send/resend setup email to a child (called by parent)
   */
  sendSetupEmail: protectedProcedure
    .input(z.object({ childId: z.number(), personalNote: z.string().max(500).optional() }))
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

      // Rate limit: check if a token was created in the last 10 minutes for this child
      const { desc, and, gt } = await import("drizzle-orm");
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const [recentToken] = await db
        .select({ id: passwordResetTokens.id, createdAt: passwordResetTokens.createdAt })
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, input.childId),
            gt(passwordResetTokens.createdAt, tenMinutesAgo)
          )
        )
        .orderBy(desc(passwordResetTokens.createdAt))
        .limit(1);

      if (recentToken) {
        const waitMinutes = Math.ceil((recentToken.createdAt!.getTime() + 10 * 60 * 1000 - Date.now()) / 60000);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Please wait ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""} before resending.`,
        });
      }

      // Create setup token
      const token = await createSetupToken(child.id);
      const origin = ctx.req.headers.origin || "https://educhamp.co";
      const setupUrl = `${origin}/student-setup?token=${token}`;

      // Send email
      const emailContent = buildStudentSetupEmail({
        studentName: child.name ?? "Student",
        parentName: ctx.user.name ?? "Your parent",
        setupUrl,
        personalNote: input.personalNote,
      });

      await sendEmail({
        to: child.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        templateName: "studentSetup",
      });

      return { success: true, sentTo: child.email };
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
   * Rate-limited to 3 requests per email per hour.
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email(), origin: z.string().url().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Rate-limit: max 3 requests per email per hour
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentRequests = await db
        .select({ count: sql<number>`count(*)` })
        .from(passwordResetAttempts)
        .where(
          and(
            eq(passwordResetAttempts.email, input.email.toLowerCase()),
            gt(passwordResetAttempts.createdAt, oneHourAgo)
          )
        );
      const requestCount = recentRequests[0]?.count ?? 0;
      if (requestCount >= 3) {
        return {
          success: false,
          message: "Too many reset requests. Please wait an hour before trying again.",
          rateLimited: true,
        };
      }

      // Log this attempt for rate limiting
      await db.insert(passwordResetAttempts).values({
        email: input.email.toLowerCase(),
        createdAt: new Date(),
      });

      // Always return success to prevent email enumeration
      const user = await getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        // Don't reveal whether the account exists
        return { success: true, message: "If an account with that email exists, a reset link has been sent." };
      }

      // Create a reset token (reusing the same token infrastructure)
      const token = await createSetupToken(user.id);
      // Use caller-provided origin, fall back to request origin header, then production domain
      const baseOrigin = input.origin || ctx.req?.headers?.origin || "https://educhamp.co";
      const resetUrl = `${baseOrigin}/student-setup?token=${token}&mode=reset`;

      // Send branded reset email
      const { html, text, subject: emailSubject } = buildPasswordResetEmail({
        userName: user.name ?? "Student",
        resetUrl,
        expiryHours: 24,
      });
      await sendEmail({
        to: user.email!,
        subject: emailSubject,
        html,
        text,
        templateName: "passwordReset",
      });

      return { success: true, message: "If an account with that email exists, a reset link has been sent." };
    }),
});
