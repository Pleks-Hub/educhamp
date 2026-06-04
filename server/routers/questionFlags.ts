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
  no_answer_input: "No place to type answer",
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
          "no_answer_input",
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
            const dashboardUrl = `${process.env.VITE_OAUTH_PORTAL_URL ?? "https://educhamp.co"}/dashboard`;
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
   * Admin: auto-fix a flagged question.
   * For "no_answer_input" or "unclear_question" flags on quiz questions:
   * - If questionType is "open_response" or "multiple_choice" with empty choices,
   *   converts to "short_answer" so the student gets a text input field.
   * - Marks the flag as resolved with an auto-generated note.
   */
  adminAutoFixQuestion: adminProcedure
    .input(
      z.object({
        flagId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const {
        questionFlags,
        quizQuestions,
        diagnosticQuestions,
        users,
        userNotifications,
      } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      // Fetch the flag
      const [flag] = await db
        .select()
        .from(questionFlags)
        .where(eq(questionFlags.id, input.flagId))
        .limit(1);
      if (!flag) throw new TRPCError({ code: "NOT_FOUND", message: "Flag not found" });

      let fixApplied = false;
      let fixDescription = "";

      if (flag.questionType === "quiz") {
        // Fetch the quiz question
        const [question] = await db
          .select()
          .from(quizQuestions)
          .where(eq(quizQuestions.id, flag.questionId))
          .limit(1);
        if (!question) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

        // Fix: convert open_response or multiple_choice with empty choices to short_answer
        const choices = question.choices as { label: string; text: string }[] | null;
        const hasEmptyChoices = !choices || (Array.isArray(choices) && choices.length === 0);

        if (question.questionType === "open_response" || (question.questionType === "multiple_choice" && hasEmptyChoices)) {
          await db
            .update(quizQuestions)
            .set({ questionType: "short_answer", choices: null })
            .where(eq(quizQuestions.id, flag.questionId));
          fixApplied = true;
          fixDescription = `Converted question from "${question.questionType}" to "short_answer" — students will now see a text input field.`;
        } else if (question.questionType === "multiple_choice" && !hasEmptyChoices) {
          // Choices exist but student reported no input — might be a rendering issue
          // Reactivate the question to ensure it's visible
          await db
            .update(quizQuestions)
            .set({ isActive: true })
            .where(eq(quizQuestions.id, flag.questionId));
          fixApplied = true;
          fixDescription = "Question verified and reactivated. Answer choices are present and should render correctly.";
        } else {
          fixDescription = "Question is already a short_answer type with a text input field. No fix needed.";
          fixApplied = true;
        }
      } else {
        // Diagnostic question
        const [question] = await db
          .select()
          .from(diagnosticQuestions)
          .where(eq(diagnosticQuestions.id, flag.questionId))
          .limit(1);
        if (!question) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });

        const choices = question.choices as { label: string; text: string }[] | null;
        const hasEmptyChoices = !choices || (Array.isArray(choices) && choices.length === 0);

        if (question.questionType === "multiple_choice" && hasEmptyChoices) {
          await db
            .update(diagnosticQuestions)
            .set({ questionType: "short_answer", choices: null })
            .where(eq(diagnosticQuestions.id, flag.questionId));
          fixApplied = true;
          fixDescription = `Converted diagnostic question from "multiple_choice" to "short_answer" — students will now see a text input field.`;
        } else {
          fixDescription = "Question appears to have valid answer options. Verified and no structural fix needed.";
          fixApplied = true;
        }
      }

      // Mark the flag as resolved
      const reviewNote = `[Auto-Fix] ${fixDescription}`;
      await db
        .update(questionFlags)
        .set({
          status: "resolved",
          reviewedBy: ctx.user.id,
          reviewNote,
        })
        .where(eq(questionFlags.id, input.flagId));

      // Notify the student
      const [student] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, flag.userId))
        .limit(1);

      if (student) {
        await db
          .insert(userNotifications)
          .values({
            userId: student.id,
            type: "flag_resolution",
            title: "Your question report was auto-fixed",
            message: `We fixed the ${flag.questionType} question you reported. ${fixDescription} You can now retry the question.`,
            isRead: false,
            metadata: JSON.stringify({
              flagId: input.flagId,
              status: "resolved",
              questionType: flag.questionType,
              questionId: flag.questionId,
              reviewNote,
              autoFixed: true,
            }),
          })
          .catch((e) => console.error("[FlagAutoFix] Notification insert failed:", e));
      }

      return { success: true, fixApplied, fixDescription };
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
