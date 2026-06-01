/**
 * Certificate Router
 *
 * Handles course completion certificate issuance, retrieval, and PDF generation.
 * A certificate is issued when a student achieves ≥90% average quiz score across
 * all units in a course.
 *
 * Procedures:
 *   certificate.checkEligibility  — check if user qualifies for a course certificate
 *   certificate.issue             — issue certificate if eligible (idempotent)
 *   certificate.getMyCertificates — list all certificates for the current user
 *   certificate.getPublic         — public lookup by token (no auth required)
 *   certificate.generatePDF       — stream PDF bytes for a certificate (by token)
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  courseCertificates,
  courses,
  unitProgress,
  units,
  users,
} from "../../drizzle/schema";
import type { Response } from "express";

const CERTIFICATE_MASTERY_THRESHOLD = 90; // percent

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute average quiz score across all units in a course for a given user.
 * Returns { averageMastery, unitCount, masterySnapshot, eligible }
 */
async function computeCourseMastery(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Get all units for the course
  const courseUnits = await db
    .select({ id: units.id, unitNumber: units.unitNumber, title: units.title })
    .from(units)
    .where(eq(units.courseId, courseId));

  if (courseUnits.length === 0) {
    return { averageMastery: 0, unitCount: 0, masterySnapshot: {}, eligible: false };
  }

  // Get unit progress for this user
  const progressRows = await db
    .select()
    .from(unitProgress)
    .where(eq(unitProgress.userId, userId));

  const progressMap = new Map(progressRows.map((p) => [p.unitId, p]));

  // Build snapshot: unitId → quizScore (0 if no quiz attempt)
  const masterySnapshot: Record<string, number> = {};
  let totalScore = 0;
  let unitsWithScore = 0;

  for (const unit of courseUnits) {
    const progress = progressMap.get(unit.id);
    const score = progress?.quizScore ?? 0;
    masterySnapshot[String(unit.id)] = score;
    totalScore += score;
    if (progress?.quizScore != null) unitsWithScore++;
  }

  // Require all units to have at least one quiz attempt
  const allUnitsAttempted = unitsWithScore === courseUnits.length;
  const averageMastery = courseUnits.length > 0 ? totalScore / courseUnits.length : 0;
  const eligible = allUnitsAttempted && averageMastery >= CERTIFICATE_MASTERY_THRESHOLD;

  return {
    averageMastery: Math.round(averageMastery * 10) / 10,
    unitCount: courseUnits.length,
    masterySnapshot,
    eligible,
    allUnitsAttempted,
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const certificateRouter = router({
  /**
   * Check if the current user is eligible for a certificate in a given course.
   */
  checkEligibility: protectedProcedure
    .input(z.object({ courseId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const { averageMastery, unitCount, masterySnapshot, eligible, allUnitsAttempted } =
        await computeCourseMastery(ctx.user.id, input.courseId);

      // Check if certificate already issued
      const [existing] = await db
        .select()
        .from(courseCertificates)
        .where(
          and(
            eq(courseCertificates.userId, ctx.user.id),
            eq(courseCertificates.courseId, input.courseId)
          )
        )
        .limit(1);

      return {
        eligible,
        averageMastery,
        unitCount,
        masterySnapshot,
        allUnitsAttempted: allUnitsAttempted ?? false,
        threshold: CERTIFICATE_MASTERY_THRESHOLD,
        alreadyIssued: !!existing,
        certificateToken: existing?.certificateToken ?? null,
      };
    }),

  /**
   * Issue a certificate for the current user in a given course.
   * Idempotent — returns existing certificate if already issued.
   */
  issue: protectedProcedure
    .input(z.object({ courseId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Check if already issued
      const [existing] = await db
        .select()
        .from(courseCertificates)
        .where(
          and(
            eq(courseCertificates.userId, ctx.user.id),
            eq(courseCertificates.courseId, input.courseId)
          )
        )
        .limit(1);

      if (existing) {
        return { certificateToken: existing.certificateToken, isNew: false };
      }

      // Verify eligibility
      const { eligible, averageMastery, masterySnapshot } = await computeCourseMastery(
        ctx.user.id,
        input.courseId
      );

      if (!eligible) {
        throw new Error(
          `Not eligible: requires ${CERTIFICATE_MASTERY_THRESHOLD}% average across all units (current: ${averageMastery}%)`
        );
      }

      // Generate unique token
      const certificateToken = randomUUID().replace(/-/g, "");

      await db.insert(courseCertificates).values({
        userId: ctx.user.id,
        courseId: input.courseId,
        certificateToken,
        averageMastery,
        masterySnapshot,
      });

      return { certificateToken, isNew: true };
    }),

  /**
   * List all certificates earned by a specific child (parent access).
   */
  getChildCertificates: protectedProcedure
    .input(z.object({ childId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Verify the requester is a parent of the child
      const { parentChildren } = await import("../../drizzle/schema");
      const [link] = await db
        .select()
        .from(parentChildren)
        .where(
          and(
            eq(parentChildren.parentId, ctx.user.id),
            eq(parentChildren.childId, input.childId)
          )
        )
        .limit(1);

      if (!link) throw new Error("Not authorized to view this child's certificates");

      const rows = await db
        .select({
          id: courseCertificates.id,
          courseId: courseCertificates.courseId,
          certificateToken: courseCertificates.certificateToken,
          averageMastery: courseCertificates.averageMastery,
          issuedAt: courseCertificates.issuedAt,
          courseTitle: courses.title,
          courseCode: courses.courseCode,
          gradeLevel: courses.gradeLevel,
          subject: courses.subject,
        })
        .from(courseCertificates)
        .innerJoin(courses, eq(courses.id, courseCertificates.courseId))
        .where(eq(courseCertificates.userId, input.childId))
        .orderBy(courseCertificates.issuedAt);

      return rows;
    }),

  /**
   * List all certificates earned by the current user.
   */
  getMyCertificates: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: courseCertificates.id,
        courseId: courseCertificates.courseId,
        certificateToken: courseCertificates.certificateToken,
        averageMastery: courseCertificates.averageMastery,
        issuedAt: courseCertificates.issuedAt,
        courseTitle: courses.title,
        courseCode: courses.courseCode,
        gradeLevel: courses.gradeLevel,
        subject: courses.subject,
      })
      .from(courseCertificates)
      .innerJoin(courses, eq(courses.id, courseCertificates.courseId))
      .where(eq(courseCertificates.userId, ctx.user.id))
      .orderBy(courseCertificates.issuedAt);

    return rows;
  }),

  /**
   * Public lookup by certificate token — no authentication required.
   * Used for the shareable /certificate/:token page.
   */
  getPublic: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [row] = await db
        .select({
          id: courseCertificates.id,
          certificateToken: courseCertificates.certificateToken,
          averageMastery: courseCertificates.averageMastery,
          masterySnapshot: courseCertificates.masterySnapshot,
          issuedAt: courseCertificates.issuedAt,
          courseTitle: courses.title,
          courseCode: courses.courseCode,
          gradeLevel: courses.gradeLevel,
          subject: courses.subject,
          studentName: users.name,
        })
        .from(courseCertificates)
        .innerJoin(courses, eq(courses.id, courseCertificates.courseId))
        .innerJoin(users, eq(users.id, courseCertificates.userId))
        .where(eq(courseCertificates.certificateToken, input.token))
        .limit(1);

      if (!row) throw new Error("Certificate not found");
      return row;
    }),
});

// ─── PDF Generation (Express route, not tRPC) ────────────────────────────────
// Registered in server/_core/index.ts as GET /api/certificate/:token/pdf

export async function handleCertificatePDF(
  token: string,
  res: Response
): Promise<void> {
  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }

  const [row] = await db
    .select({
      certificateToken: courseCertificates.certificateToken,
      averageMastery: courseCertificates.averageMastery,
      issuedAt: courseCertificates.issuedAt,
      courseTitle: courses.title,
      courseCode: courses.courseCode,
      gradeLevel: courses.gradeLevel,
      subject: courses.subject,
      studentName: users.name,
    })
    .from(courseCertificates)
    .innerJoin(courses, eq(courses.id, courseCertificates.courseId))
    .innerJoin(users, eq(users.id, courseCertificates.userId))
    .where(eq(courseCertificates.certificateToken, token))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Certificate not found" });
    return;
  }

  // Dynamically import pdfkit to avoid issues at module load time
  const PDFDocument = (await import("pdfkit")).default;

  const doc = new PDFDocument({
    size: "LETTER",
    layout: "landscape",
    margin: 0,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="EduChamp-Certificate-${row.certificateToken.slice(0, 8)}.pdf"`
  );
  doc.pipe(res);

  const W = 792; // letter landscape width
  const H = 612; // letter landscape height

  // ── Background ──────────────────────────────────────────────────────────────
  // Deep navy gradient-like solid background
  doc.rect(0, 0, W, H).fill("#0f172a");

  // Decorative border frame
  doc
    .rect(20, 20, W - 40, H - 40)
    .lineWidth(3)
    .stroke("#6366f1");

  doc
    .rect(28, 28, W - 56, H - 56)
    .lineWidth(1)
    .stroke("#4f46e5");

  // Corner ornaments (simple squares)
  const corners = [
    [20, 20], [W - 36, 20], [20, H - 36], [W - 36, H - 36],
  ] as [number, number][];
  for (const [x, y] of corners) {
    doc.rect(x, y, 16, 16).fill("#6366f1");
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  doc
    .fontSize(11)
    .fillColor("#a5b4fc")
    .font("Helvetica")
    .text("EDUCHAMP ADAPTIVE LEARNING PLATFORM", 0, 60, {
      align: "center",
      width: W,
      characterSpacing: 3,
    });

  doc
    .fontSize(36)
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .text("Certificate of Completion", 0, 85, { align: "center", width: W });

  // Divider
  doc
    .moveTo(W / 2 - 120, 138)
    .lineTo(W / 2 + 120, 138)
    .lineWidth(1)
    .stroke("#6366f1");

  // ── Body ────────────────────────────────────────────────────────────────────
  doc
    .fontSize(13)
    .fillColor("#94a3b8")
    .font("Helvetica")
    .text("This certifies that", 0, 158, { align: "center", width: W });

  // Student name
  const studentName = row.studentName || "Student";
  doc
    .fontSize(40)
    .fillColor("#818cf8")
    .font("Helvetica-BoldOblique")
    .text(studentName, 0, 180, { align: "center", width: W });

  doc
    .fontSize(13)
    .fillColor("#94a3b8")
    .font("Helvetica")
    .text("has successfully completed", 0, 232, { align: "center", width: W });

  // Course title
  doc
    .fontSize(26)
    .fillColor("#ffffff")
    .font("Helvetica-Bold")
    .text(row.courseTitle, 0, 255, { align: "center", width: W });

  // Grade & subject
  const gradeLabel =
    row.gradeLevel === "Pre-K"
      ? "Pre-Kindergarten"
      : row.gradeLevel === "Kindergarten"
      ? "Kindergarten"
      : `Grade ${row.gradeLevel}`;
  doc
    .fontSize(12)
    .fillColor("#a5b4fc")
    .font("Helvetica")
    .text(`${gradeLabel} · ${row.subject}`, 0, 290, { align: "center", width: W });

  // Mastery score badge
  const scoreX = W / 2 - 60;
  doc.roundedRect(scoreX, 315, 120, 38, 8).fill("#1e1b4b");
  doc
    .fontSize(13)
    .fillColor("#a5b4fc")
    .font("Helvetica")
    .text("Average Mastery", scoreX, 321, { width: 120, align: "center" });
  doc
    .fontSize(16)
    .fillColor("#818cf8")
    .font("Helvetica-Bold")
    .text(`${row.averageMastery}%`, scoreX, 336, { width: 120, align: "center" });

  // ── Footer ──────────────────────────────────────────────────────────────────
  const issuedDate = new Date(row.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Signature line (left)
  doc
    .moveTo(100, 500)
    .lineTo(280, 500)
    .lineWidth(1)
    .stroke("#4f46e5");
  doc
    .fontSize(10)
    .fillColor("#94a3b8")
    .font("Helvetica")
    .text("EduChamp Platform", 100, 507, { width: 180, align: "center" });

  // Date (right)
  doc
    .moveTo(W - 280, 500)
    .lineTo(W - 100, 500)
    .lineWidth(1)
    .stroke("#4f46e5");
  doc
    .fontSize(10)
    .fillColor("#94a3b8")
    .font("Helvetica")
    .text(issuedDate, W - 280, 507, { width: 180, align: "center" });

  // Certificate ID
  doc
    .fontSize(8)
    .fillColor("#475569")
    .font("Helvetica")
    .text(
      `Certificate ID: ${row.certificateToken}`,
      0,
      H - 40,
      { align: "center", width: W }
    );

  doc.end();
}
