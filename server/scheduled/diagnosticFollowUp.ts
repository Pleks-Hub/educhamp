/**
 * diagnosticFollowUp.ts — Scheduled heartbeat handler
 *
 * Runs daily at 09:00 UTC (4:00am Houston time) to:
 *  1. Find students who completed a diagnostic assessment 24–48 hours ago
 *  2. Check if they've started working on their recommended (weak) units
 *  3. If not, send a personalized follow-up email with their results and next steps
 *  4. Also notify linked parents with the same diagnostic summary
 *
 * Endpoint: POST /api/scheduled/diagnostic-follow-up
 * Auth:     sdk.authenticateRequest → user.isCron === true
 *
 * De-duplication: Uses emailLogs.referenceId = "diag-followup-{attemptId}" to
 * prevent re-sending for the same diagnostic attempt.
 */
import type { Request, Response } from "express";
import { getDb } from "../db";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import { buildDiagnosticFollowUpEmail } from "../emailTemplates/diagnosticFollowUp";
import {
  diagnosticAttempts,
  users,
  unitProgress,
  parentChildren,
  emailLogs,
  courses,
  units,
} from "../../drizzle/schema";
import { eq, and, between, sql, inArray } from "drizzle-orm";

export async function diagnosticFollowUpHandler(req: Request, res: Response) {
  try {
    // ── Auth: cron-only ────────────────────────────────────────────────────────
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "DB unavailable" });

    const origin = "https://educhamp.co";

    // ── Find diagnostic attempts completed 24–48 hours ago ────────────────────
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const recentAttempts = await db
      .select({
        id: diagnosticAttempts.id,
        userId: diagnosticAttempts.userId,
        courseId: diagnosticAttempts.courseId,
        unitResults: diagnosticAttempts.unitResults,
        prerequisiteScore: diagnosticAttempts.prerequisiteScore,
        overallScore: diagnosticAttempts.overallScore,
        completedAt: diagnosticAttempts.completedAt,
      })
      .from(diagnosticAttempts)
      .where(
        between(diagnosticAttempts.completedAt, fortyEightHoursAgo, twentyFourHoursAgo)
      );

    if (recentAttempts.length === 0) {
      return res.json({ ok: true, processed: 0, skipped: "no-recent-attempts" });
    }

    let emailsSent = 0;
    let skipped = 0;

    for (const attempt of recentAttempts) {
      const referenceId = `diag-followup-${attempt.id}`;

      // ── De-dup: check if we already sent this follow-up ─────────────────────
      const alreadySent = await db
        .select({ id: emailLogs.id })
        .from(emailLogs)
        .where(eq(emailLogs.referenceId, referenceId))
        .limit(1);

      if (alreadySent.length > 0) {
        skipped++;
        continue;
      }

      // ── Get the student info ────────────────────────────────────────────────
      const studentRows = await db
        .select({ id: users.id, name: users.name, email: users.email, accountType: users.accountType })
        .from(users)
        .where(eq(users.id, attempt.userId))
        .limit(1);
      const student = studentRows[0];
      if (!student?.email || student.accountType !== "student") {
        skipped++;
        continue;
      }

      // ── Check if student has started working on weak units ──────────────────
      const weakUnits = (attempt.unitResults ?? []).filter(
        (u) => u.status === "needs_instruction" || u.status === "partial_understanding"
      );
      const strongUnits = (attempt.unitResults ?? []).filter(
        (u) => u.status === "likely_mastered"
      );

      if (weakUnits.length === 0) {
        skipped++;
        continue; // No weak areas — no follow-up needed
      }

      // Get the unit IDs for weak units to check progress
      const weakUnitNumbers = weakUnits.map((u) => u.unitNumber);
      const courseUnits = await db
        .select({ id: units.id, unitNumber: units.unitNumber })
        .from(units)
        .where(
          and(
            eq(units.courseId, attempt.courseId),
            inArray(units.unitNumber, weakUnitNumbers)
          )
        );

      // Check if student has any progress on these weak units since the diagnostic
      let hasStartedLearning = false;
      if (courseUnits.length > 0) {
        const unitIds = courseUnits.map((u) => u.id);
        const progressRows = await db
          .select({ id: unitProgress.id, lessonsCompleted: unitProgress.lessonsCompleted })
          .from(unitProgress)
          .where(
            and(
              eq(unitProgress.userId, student.id),
              inArray(unitProgress.unitId, unitIds)
            )
          );

        // If any lessons completed on weak units, they've started
        hasStartedLearning = progressRows.some((p) => p.lessonsCompleted > 0);
      }

      if (hasStartedLearning) {
        skipped++;
        continue; // Student already started — no nudge needed
      }

      // ── Get course name ─────────────────────────────────────────────────────
      const courseRows = await db
        .select({ title: courses.title })
        .from(courses)
        .where(eq(courses.id, attempt.courseId))
        .limit(1);
      const courseName = courseRows[0]?.title ?? "your course";

      // ── Send follow-up email to student ─────────────────────────────────────
      try {
        const emailContent = buildDiagnosticFollowUpEmail({
          studentName: student.name ?? "Student",
          courseName,
          overallScore: attempt.overallScore,
          prerequisiteScore: attempt.prerequisiteScore,
          weakUnits: weakUnits.map((u) => ({
            unitNumber: u.unitNumber,
            unitTitle: u.unitTitle,
            status: u.status,
          })),
          strongUnits: strongUnits.map((u) => ({
            unitNumber: u.unitNumber,
            unitTitle: u.unitTitle,
          })),
          resumeUrl: `${origin}/courses`,
        });

        await sendEmail({
          to: student.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          templateName: "diagnosticFollowUp",
          referenceId,
        });
        emailsSent++;
      } catch (err) {
        console.error(`[DiagnosticFollowUp] Failed to email student ${student.id}:`, err);
      }

      // ── Send follow-up email to linked parents ──────────────────────────────
      try {
        const parentLinks = await db
          .select({ parentId: parentChildren.parentId })
          .from(parentChildren)
          .where(eq(parentChildren.childId, student.id));

        for (const link of parentLinks) {
          const parentRows = await db
            .select({ id: users.id, name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, link.parentId))
            .limit(1);
          const parent = parentRows[0];
          if (!parent?.email) continue;

          const parentEmailContent = buildDiagnosticFollowUpEmail({
            studentName: student.name ?? "Student",
            courseName,
            overallScore: attempt.overallScore,
            prerequisiteScore: attempt.prerequisiteScore,
            weakUnits: weakUnits.map((u) => ({
              unitNumber: u.unitNumber,
              unitTitle: u.unitTitle,
              status: u.status,
            })),
            strongUnits: strongUnits.map((u) => ({
              unitNumber: u.unitNumber,
              unitTitle: u.unitTitle,
            })),
            resumeUrl: `${origin}/parent`,
            isParentEmail: true,
            parentName: parent.name ?? undefined,
          });

          await sendEmail({
            to: parent.email,
            subject: parentEmailContent.subject,
            html: parentEmailContent.html,
            text: parentEmailContent.text,
            templateName: "diagnosticFollowUpParent",
            referenceId: `diag-followup-parent-${attempt.id}-${parent.id}`,
          });
          emailsSent++;
        }
      } catch (err) {
        console.error(`[DiagnosticFollowUp] Failed to email parents for student ${student.id}:`, err);
      }
    }

    console.log(`[DiagnosticFollowUp] Processed: ${recentAttempts.length}, Emails sent: ${emailsSent}, Skipped: ${skipped}`);

    return res.json({
      ok: true,
      processed: recentAttempts.length,
      emailsSent,
      skipped,
      processedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[DiagnosticFollowUp] Handler error:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
