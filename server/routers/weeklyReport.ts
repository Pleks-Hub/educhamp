/**
 * Weekly Report PDF generation for parents.
 * Generates a one-page PDF summarizing a child's weekly progress:
 * tasks completed, XP earned, badges unlocked, streaks, and highlights.
 */
import { Request, Response } from "express";
import { getDb } from "../db";
import { eq, and, gte, inArray, count, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  parentChildren,
  parentTasks,
  parentTaskCompletions,
  users,
  xpLedger,
  streaks,
  userBadges,
  badges,
} from "../../drizzle/schema";
import { sdk } from "../_core/sdk";

export async function handleWeeklyReportPDF(
  req: Request,
  res: Response
): Promise<void> {
  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "Database unavailable" });
    return;
  }

  const childId = parseInt(req.params.childId, 10);
  if (!childId) {
    res.status(400).json({ error: "Missing childId" });
    return;
  }

  // Authenticate from session cookie
  let parentId: number;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user?.id) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    parentId = user.id;
  } catch {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // Verify parent-child relationship
  const [relationship] = await db
    .select()
    .from(parentChildren)
    .where(
      and(
        eq(parentChildren.parentId, parentId),
        eq(parentChildren.childId, childId),
        eq(parentChildren.isActive, true)
      )
    )
    .limit(1);

  if (!relationship) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  // Get child info
  const [child] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, childId));

  if (!child) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  // Calculate date range (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const now = new Date();

  // Tasks completed this week
  const completedTasks = await db
    .select({
      title: parentTasks.title,
      completedAt: parentTaskCompletions.completedAt,
      rewardXp: parentTasks.rewardXp,
    })
    .from(parentTaskCompletions)
    .innerJoin(parentTasks, eq(parentTasks.id, parentTaskCompletions.taskId))
    .where(
      and(
        eq(parentTaskCompletions.studentId, childId),
        eq(parentTaskCompletions.parentConfirmed, true),
        gte(parentTaskCompletions.completedAt, weekAgo)
      )
    )
    .orderBy(desc(parentTaskCompletions.completedAt));

  // Total XP earned this week
  const [xpResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${xpLedger.amount}), 0)` })
    .from(xpLedger)
    .where(
      and(eq(xpLedger.userId, childId), gte(xpLedger.createdAt, weekAgo))
    );
  const weeklyXp = xpResult?.total ?? 0;

  // Current streak
  const [streakRow] = await db
    .select({
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
    })
    .from(streaks)
    .where(eq(streaks.userId, childId));

  // Badges earned this week
  const weeklyBadges = await db
    .select({
      badgeName: badges.name,
      badgeIcon: badges.iconEmoji,
      earnedAt: userBadges.earnedAt,
    })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(
      and(eq(userBadges.userId, childId), gte(userBadges.earnedAt, weekAgo))
    );

  // Total tasks assigned this week
  const [assignedResult] = await db
    .select({ count: count() })
    .from(parentTasks)
    .where(
      and(
        eq(parentTasks.studentId, childId),
        eq(parentTasks.parentId, parentId)
      )
    );
  const totalAssigned = assignedResult?.count ?? 0;

  // Generate PDF
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({
    size: "LETTER",
    layout: "portrait",
    margin: 50,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="EduChamp-Weekly-Report-${child.name?.replace(/\s/g, "-") ?? "Student"}-${now.toISOString().slice(0, 10)}.pdf"`
  );
  doc.pipe(res);

  const W = 612; // letter portrait width
  const margin = 50;
  const contentW = W - margin * 2;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.rect(0, 0, W, 100).fill("#4f46e5");
  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor("#ffffff")
    .text("EduChamp Weekly Report", margin, 30, { width: contentW });
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#e0e7ff")
    .text(
      `${child.name ?? "Student"} · Week of ${weekAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      margin,
      62,
      { width: contentW }
    );

  // ── Summary Stats ───────────────────────────────────────────────────────────
  let y = 120;
  doc.fillColor("#1e293b");

  // Stats row
  const stats = [
    { label: "Tasks Completed", value: `${completedTasks.length}` },
    { label: "XP Earned", value: `${weeklyXp}` },
    { label: "Current Streak", value: `${streakRow?.currentStreak ?? 0} days` },
    { label: "Badges Earned", value: `${weeklyBadges.length}` },
  ];

  const statW = contentW / 4;
  for (let i = 0; i < stats.length; i++) {
    const x = margin + i * statW;
    doc.rect(x + 2, y, statW - 4, 55).lineWidth(1).stroke("#e2e8f0");
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#4f46e5")
      .text(stats[i].value, x + 8, y + 10, { width: statW - 16, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      .text(stats[i].label, x + 8, y + 36, { width: statW - 16, align: "center" });
  }

  y += 75;

  // ── Completed Tasks ─────────────────────────────────────────────────────────
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#1e293b")
    .text("Tasks Completed This Week", margin, y);
  y += 22;

  if (completedTasks.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64748b")
      .text("No tasks completed this week.", margin, y);
    y += 20;
  } else {
    // Table header
    doc.rect(margin, y, contentW, 18).fill("#f1f5f9");
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#475569")
      .text("Task", margin + 8, y + 5, { width: 280 })
      .text("XP", margin + 340, y + 5, { width: 60, align: "center" })
      .text("Completed", margin + 410, y + 5, { width: 100, align: "center" });
    y += 22;

    const maxTasks = Math.min(completedTasks.length, 15);
    for (let i = 0; i < maxTasks; i++) {
      const task = completedTasks[i];
      if (y > 680) break; // Don't overflow page
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#334155")
        .text(task.title ?? "Task", margin + 8, y + 3, { width: 280 })
        .text(`${task.rewardXp ?? 0}`, margin + 340, y + 3, { width: 60, align: "center" })
        .text(
          task.completedAt
            ? new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "-",
          margin + 410,
          y + 3,
          { width: 100, align: "center" }
        );
      y += 18;
      // Separator line
      doc.moveTo(margin, y).lineTo(margin + contentW, y).lineWidth(0.5).stroke("#e2e8f0");
    }
    if (completedTasks.length > 15) {
      y += 5;
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#64748b")
        .text(`... and ${completedTasks.length - 15} more tasks`, margin + 8, y);
      y += 15;
    }
  }

  y += 20;

  // ── Badges Section ──────────────────────────────────────────────────────────
  if (weeklyBadges.length > 0 && y < 650) {
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#1e293b")
      .text("Badges Earned", margin, y);
    y += 22;

    for (const badge of weeklyBadges) {
      if (y > 700) break;
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#334155")
        .text(`${badge.badgeIcon ?? "🏆"} ${badge.badgeName ?? "Badge"}`, margin + 8, y);
      y += 16;
    }
    y += 10;
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#94a3b8")
    .text(
      `Generated by EduChamp · ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      margin,
      740,
      { width: contentW, align: "center" }
    );

  doc.end();
}
