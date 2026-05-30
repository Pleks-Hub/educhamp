/**
 * questionFlags.ts — Procedures for students to flag assessment questions
 * and for admins to review/resolve flagged questions.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";

const REASON_LABELS: Record<string, string> = {
  incorrect_answer: "Incorrect answer",
  unclear_question: "Unclear or confusing question",
  wrong_difficulty: "Wrong difficulty level",
  out_of_scope: "Out of scope for this course",
  duplicate: "Duplicate question",
  other: "Other",
};

export const questionFlagsRouter = router({
  /**
   * Student: flag a quiz or diagnostic question.
   * One flag per user per question — updates if already flagged.
   */
  flagQuestion: protectedProcedure
    .input(
      z.object({
        questionType: z.enum(["quiz", "diagnostic"]),
        questionId: z.number().int().positive(),
        reason: z.enum([
          "incorrect_answer",
          "unclear_question",
          "wrong_difficulty",
          "out_of_scope",
          "duplicate",
          "other",
        ]),
        details: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { questionFlags } = await import("../../drizzle/schema");
      const { and, eq } = await import("drizzle-orm");

      // Check for existing flag from this user on this question
      const existing = await db
        .select({ id: questionFlags.id })
        .from(questionFlags)
        .where(
          and(
            eq(questionFlags.userId, ctx.user.id),
            eq(questionFlags.questionType, input.questionType),
            eq(questionFlags.questionId, input.questionId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing flag
        await db
          .update(questionFlags)
          .set({
            reason: input.reason,
            details: input.details ?? null,
            status: "open",
          })
          .where(eq(questionFlags.id, existing[0].id));
        return { success: true, updated: true };
      }

      // Insert new flag
      await db.insert(questionFlags).values({
        questionType: input.questionType,
        questionId: input.questionId,
        userId: ctx.user.id,
        reason: input.reason,
        details: input.details ?? null,
        status: "open",
      });

      return { success: true, updated: false };
    }),

  /**
   * Student: check if they have already flagged a specific question.
   */
  getMyFlag: protectedProcedure
    .input(
      z.object({
        questionType: z.enum(["quiz", "diagnostic"]),
        questionId: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return null;
      const { questionFlags } = await import("../../drizzle/schema");
      const { and, eq } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(questionFlags)
        .where(
          and(
            eq(questionFlags.userId, ctx.user.id),
            eq(questionFlags.questionType, input.questionType),
            eq(questionFlags.questionId, input.questionId)
          )
        )
        .limit(1);

      return rows[0] ?? null;
    }),

  // ─── Admin procedures ──────────────────────────────────────────────────────

  /**
   * Admin: list all flagged questions with pagination and status filter.
   */
  adminListFlags: adminProcedure
    .input(
      z.object({
        status: z.enum(["open", "reviewed", "resolved", "dismissed", "all"]).default("open"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { questionFlags, users, quizQuestions, diagnosticQuestions } = await import(
        "../../drizzle/schema"
      );
      const { eq, desc, sql, and } = await import("drizzle-orm");

      const offset = (input.page - 1) * input.pageSize;

      const whereClause =
        input.status === "all" ? undefined : eq(questionFlags.status, input.status as "open" | "reviewed" | "resolved" | "dismissed");

      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(questionFlags)
        .where(whereClause);

      const rows = await db
        .select({
          flag: questionFlags,
          userName: users.name,
          userEmail: users.email,
        })
        .from(questionFlags)
        .leftJoin(users, eq(questionFlags.userId, users.id))
        .where(whereClause)
        .orderBy(desc(questionFlags.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      // Enrich with question text
      const enriched = await Promise.all(
        rows.map(async (row) => {
          let questionText = "";
          try {
            if (row.flag.questionType === "quiz") {
              const [q] = await db
                .select({ questionText: quizQuestions.questionText })
                .from(quizQuestions)
                .where(eq(quizQuestions.id, row.flag.questionId))
                .limit(1);
              questionText = q?.questionText ?? "";
            } else {
              const [q] = await db
                .select({ questionText: diagnosticQuestions.questionText })
                .from(diagnosticQuestions)
                .where(eq(diagnosticQuestions.id, row.flag.questionId))
                .limit(1);
              questionText = q?.questionText ?? "";
            }
          } catch {
            questionText = "(question not found)";
          }
          return {
            ...row.flag,
            userName: row.userName ?? "Unknown",
            userEmail: row.userEmail ?? "",
            questionText,
            reasonLabel: REASON_LABELS[row.flag.reason] ?? row.flag.reason,
          };
        })
      );

      return {
        flags: enriched,
        total: Number(countRow?.count ?? 0),
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(Number(countRow?.count ?? 0) / input.pageSize),
      };
    }),

  /**
   * Admin: update the status of a flagged question (review, resolve, dismiss).
   * When status is "resolved" or "dismissed", sends an in-app notification and
   * an email to the student who filed the report.
   */
  adminUpdateFlag: adminProcedure
    .input(
      z.object({
        flagId: z.number().int().positive(),
        status: z.enum(["reviewed", "resolved", "dismissed"]),
        reviewNote: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const {
        questionFlags,
        users,
        quizQuestions,
        diagnosticQuestions,
        userNotifications,
      } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Fetch the flag before updating so we have student info
      const [flag] = await db
        .select()
        .from(questionFlags)
        .where(eq(questionFlags.id, input.flagId))
        .limit(1);

      if (!flag) throw new TRPCError({ code: "NOT_FOUND", message: "Flag not found" });

      await db
        .update(questionFlags)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewNote: input.reviewNote ?? null,
        })
        .where(eq(questionFlags.id, input.flagId));

      // Only notify for terminal statuses (resolved / dismissed)
      if (input.status === "resolved" || input.status === "dismissed") {
        // Fetch student info
        const [student] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, flag.userId))
          .limit(1);

        if (student) {
          // Fetch question text
          let questionText = "";
          try {
            if (flag.questionType === "quiz") {
              const [q] = await db
                .select({ questionText: quizQuestions.questionText })
                .from(quizQuestions)
                .where(eq(quizQuestions.id, flag.questionId))
                .limit(1);
              questionText = q?.questionText ?? "";
            } else {
              const [q] = await db
                .select({ questionText: diagnosticQuestions.questionText })
                .from(diagnosticQuestions)
                .where(eq(diagnosticQuestions.id, flag.questionId))
                .limit(1);
              questionText = q?.questionText ?? "";
            }
          } catch { /* non-fatal */ }

          const reasonLabel =
            ({
              incorrect_answer: "Incorrect answer",
              unclear_question: "Unclear or confusing question",
              wrong_difficulty: "Wrong difficulty level",
              out_of_scope: "Out of scope for this course",
              duplicate: "Duplicate question",
              other: "Other",
            } as Record<string, string>)[flag.reason] ?? flag.reason;

          const notifTitle =
            input.status === "resolved"
              ? "Your question report was resolved"
              : "Your question report has been reviewed";
          const notifMessage =
            input.status === "resolved"
              ? `Thank you for reporting an issue. Our team has resolved the problem with the ${flag.questionType} question you flagged.`
              : `Our team reviewed your report about a ${flag.questionType} question and determined no changes are needed at this time.`;

          // In-app notification
          await db
            .insert(userNotifications)
            .values({
              userId: student.id,
              type: "flag_resolution",
              title: notifTitle,
              message: notifMessage,
              isRead: false,
              metadata: JSON.stringify({
                flagId: input.flagId,
                status: input.status,
                questionType: flag.questionType,
                questionId: flag.questionId,
                reviewNote: input.reviewNote ?? null,
              }),
            })
            .catch((e) => console.error("[FlagNotif] In-app insert failed:", e));

          // Email notification (fire-and-forget)
          if (student.email) {
            const { buildFlagResolutionEmail } = await import(
              "../emailTemplates/flagResolutionNotification"
            );
            const { sendEmail } = await import("../emailService");
            const dashboardUrl = `${process.env.VITE_OAUTH_PORTAL_URL ?? "https://educhamp.app"}/dashboard`;
            const emailPayload = buildFlagResolutionEmail({
              studentName: student.name ?? "Student",
              status: input.status,
              questionText,
              questionType: flag.questionType,
              reason: reasonLabel,
              reviewNote: input.reviewNote,
              dashboardUrl,
            });
            sendEmail({
              to: student.email,
              subject: emailPayload.subject,
              html: emailPayload.html,
              text: emailPayload.text,
              templateName: "flag_resolution",
            }).catch((e) => console.error("[FlagNotif] Email send failed:", e));
          }
        }
      }

      return { success: true };
    }),

  /**
   * Admin: get flag count summary (open, reviewed, resolved, dismissed).
   */
  adminFlagStats: adminProcedure.query(async () => {
    const db = await (await import("../db")).getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { questionFlags } = await import("../../drizzle/schema");
    const { eq, sql } = await import("drizzle-orm");

    const [total] = await db.select({ count: sql<number>`count(*)` }).from(questionFlags);
    const [open] = await db
      .select({ count: sql<number>`count(*)` })
      .from(questionFlags)
      .where(eq(questionFlags.status, "open"));
    const [reviewed] = await db
      .select({ count: sql<number>`count(*)` })
      .from(questionFlags)
      .where(eq(questionFlags.status, "reviewed"));
    const [resolved] = await db
      .select({ count: sql<number>`count(*)` })
      .from(questionFlags)
      .where(eq(questionFlags.status, "resolved"));

    return {
      total: Number(total?.count ?? 0),
      open: Number(open?.count ?? 0),
      reviewed: Number(reviewed?.count ?? 0),
      resolved: Number(resolved?.count ?? 0),
    };
  }),
});
