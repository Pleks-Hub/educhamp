/**
 * pendingCourseRequestDigest.ts — Scheduled heartbeat handler
 *
 * Runs daily at 9:00 AM UTC (via Manus Heartbeat cron) to:
 *  1. Find all parents who have pending course requests older than 24 hours
 *  2. Group pending requests by parent
 *  3. Send a digest email to each parent summarizing unreviewed requests
 *  4. Skip parents with no pending requests or no email
 *
 * Endpoint: POST /api/scheduled/pending-course-request-digest
 * Auth:     sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../emailService";
import {
  buildPendingCourseRequestDigestEmail,
  type PendingRequestItem,
} from "../emailTemplates/pendingCourseRequestDigest";
import { getDb } from "../db";
import { courseRequests, users, courses, parentChildren } from "../../drizzle/schema";
import { and, eq, lt, inArray } from "drizzle-orm";
// notifyOwner removed — all notifications now go through sendEmail (Resend) only.

export async function pendingCourseRequestDigestHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "database-unavailable" });
    const appUrl = "https://educhamp.co";
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find all pending course requests older than 24 hours
    const pendingRequests = await db
      .select({
        requestId: courseRequests.id,
        studentId: courseRequests.studentId,
        courseId: courseRequests.courseId,
        createdAt: courseRequests.createdAt,
      })
      .from(courseRequests)
      .where(
        and(
          eq(courseRequests.status, "pending"),
          lt(courseRequests.createdAt, twentyFourHoursAgo)
        )
      );

    if (pendingRequests.length === 0) {
      return res.json({ ok: true, emailsSent: 0, reason: "no-pending-requests" });
    }

    // Get unique student IDs and course IDs
    const studentIds = Array.from(new Set(pendingRequests.map((r) => r.studentId)));
    const courseIds = Array.from(new Set(pendingRequests.map((r) => r.courseId)));

    // Fetch student names
    const studentRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, studentIds));
    const studentMap = new Map(studentRows.map((s) => [s.id, s.name ?? "Student"]));

    // Fetch course names
    const courseRows = await db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(inArray(courses.id, courseIds));
    const courseMap = new Map(courseRows.map((c) => [c.id, c.title]));

    // Find parents for each student
    const parentLinks = await db
      .select({
        parentId: parentChildren.parentId,
        childId: parentChildren.childId,
      })
      .from(parentChildren)
      .where(
        and(
          inArray(parentChildren.childId, studentIds),
          eq(parentChildren.isActive, true)
        )
      );

    // Group requests by parent
    const parentRequestsMap = new Map<number, PendingRequestItem[]>();
    for (const request of pendingRequests) {
      // Find all parents for this student
      const parents = parentLinks.filter((pl) => pl.childId === request.studentId);
      for (const parent of parents) {
        const items = parentRequestsMap.get(parent.parentId) ?? [];
        items.push({
          studentName: studentMap.get(request.studentId) ?? "Student",
          courseName: courseMap.get(request.courseId) ?? "Course",
          requestedAt: request.createdAt ?? new Date(),
        });
        parentRequestsMap.set(parent.parentId, items);
      }
    }

    if (parentRequestsMap.size === 0) {
      return res.json({ ok: true, emailsSent: 0, reason: "no-parents-linked" });
    }

    // Fetch parent emails and names
    const parentIds = Array.from(parentRequestsMap.keys());
    const parentRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, parentIds));
    const parentInfoMap: Record<number, { name: string | null; email: string | null }> = {};
    for (const p of parentRows) {
      parentInfoMap[p.id] = { name: p.name, email: p.email };
    }

    let emailsSent = 0;
    let parentsSkipped = 0;

    for (const parentId of parentIds) {
      const requests = parentRequestsMap.get(parentId);
      if (!requests || requests.length === 0) continue;
      const parentInfo = parentInfoMap[parentId];
      if (!parentInfo?.email) {
        parentsSkipped++;
        continue;
      }

      const emailData = buildPendingCourseRequestDigestEmail({
        parentName: parentInfo.name ?? "Parent",
        requests,
        dashboardUrl: `${appUrl}/parent`,
      });

      await sendEmail({
        to: parentInfo.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        templateName: "pending-course-request-digest",
      });
      emailsSent++;
    }

    console.log(`[Audit] Pending Course Request Digest Sent: ${emailsSent} emails, ${parentsSkipped} skipped, ${pendingRequests.length} total pending`);

    return res.json({
      ok: true,
      emailsSent,
      parentsSkipped,
      totalPendingRequests: pendingRequests.length,
      parentsNotified: parentRequestsMap.size,
    });
  } catch (err: any) {
    console.error("[pending-course-request-digest]", err);
    return res.status(500).json({
      error: err?.message ?? "unknown error",
      stack: err?.stack,
      context: { url: req.url, taskUid: (req as any).user?.taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
