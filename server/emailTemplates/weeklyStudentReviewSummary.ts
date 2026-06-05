/**
 * weeklyStudentReviewSummary.ts — Email template
 *
 * Builds a personalised weekly review summary email for students,
 * showing accumulated due reviews and streak status.
 */

export interface WeeklyReviewSummaryData {
  studentName: string;
  studentEmail: string;
  currentStreak: number;
  todayActive: boolean;
  longestStreak: number;
  dueNow: number;
  dueToday: number;
  totalScheduled: number;
  topDueSkills: Array<{ skillName: string; daysSinceReview: number | null }>;
  appUrl: string;
}

export function buildWeeklyStudentReviewSummaryEmail(data: WeeklyReviewSummaryData): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    studentName,
    currentStreak,
    todayActive,
    longestStreak,
    dueNow,
    dueToday,
    totalScheduled,
    topDueSkills,
    appUrl,
  } = data;

  const firstName = studentName.split(" ")[0] || "Student";

  // Streak message
  let streakMessage: string;
  if (currentStreak > 0 && todayActive) {
    streakMessage = `You're on a ${currentStreak}-day streak! Keep it going!`;
  } else if (currentStreak > 0) {
    streakMessage = `You have a ${currentStreak}-day streak — practice today to keep it alive!`;
  } else {
    streakMessage = `Start a new streak today! Practice just one skill to begin.`;
  }

  // Due skills list
  const skillListHtml = topDueSkills.length > 0
    ? topDueSkills
        .map(
          (s) =>
            `<li style="padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
              <strong>${s.skillName}</strong>
              ${s.daysSinceReview !== null ? `<span style="color: #888; font-size: 12px;"> — last reviewed ${s.daysSinceReview} day${s.daysSinceReview !== 1 ? "s" : ""} ago</span>` : ""}
            </li>`
        )
        .join("")
    : `<li style="padding: 6px 0; color: #22c55e;">All caught up! No skills due for review.</li>`;

  const skillListText = topDueSkills.length > 0
    ? topDueSkills
        .map((s) => `  • ${s.skillName}${s.daysSinceReview !== null ? ` (last reviewed ${s.daysSinceReview}d ago)` : ""}`)
        .join("\n")
    : "  All caught up! No skills due for review.";

  const subject = dueNow > 0
    ? `${firstName}, you have ${dueNow} skill${dueNow !== 1 ? "s" : ""} ready for review`
    : `${firstName}, your weekly review summary`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 560px; margin: 0 auto; padding: 32px 16px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 20px; color: #1e293b; margin: 0;">Weekly Review Summary</h1>
      <p style="font-size: 14px; color: #64748b; margin: 4px 0 0;">Your spaced repetition progress this week</p>
    </div>

    <!-- Main card -->
    <div style="background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; color: #1e293b; margin: 0 0 16px;">Hi ${firstName},</p>

      <!-- Streak section -->
      <div style="background: linear-gradient(135deg, #fff7ed, #ffedd5); border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 4px;">${currentStreak > 0 ? "🔥" : "💪"}</div>
        <div style="font-size: 24px; font-weight: 700; color: #ea580c;">${currentStreak} day${currentStreak !== 1 ? "s" : ""}</div>
        <div style="font-size: 13px; color: #9a3412; margin-top: 4px;">${streakMessage}</div>
        ${longestStreak > currentStreak ? `<div style="font-size: 11px; color: #78716c; margin-top: 8px;">Your longest streak: ${longestStreak} days</div>` : ""}
      </div>

      <!-- Stats row -->
      <div style="display: flex; justify-content: space-around; margin-bottom: 20px; text-align: center;">
        <div>
          <div style="font-size: 20px; font-weight: 700; color: ${dueNow > 0 ? "#dc2626" : "#22c55e"};">${dueNow}</div>
          <div style="font-size: 11px; color: #64748b;">Due Now</div>
        </div>
        <div>
          <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${dueToday}</div>
          <div style="font-size: 11px; color: #64748b;">Due Today</div>
        </div>
        <div>
          <div style="font-size: 20px; font-weight: 700; color: #6366f1;">${totalScheduled}</div>
          <div style="font-size: 11px; color: #64748b;">Skills Tracked</div>
        </div>
      </div>

      <!-- Skills due list -->
      ${dueNow > 0 ? `
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; color: #1e293b; margin: 0 0 8px;">Skills Ready for Review:</h3>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px; color: #334155;">
          ${skillListHtml}
        </ul>
        ${dueNow > topDueSkills.length ? `<p style="font-size: 12px; color: #64748b; margin: 8px 0 0;">...and ${dueNow - topDueSkills.length} more</p>` : ""}
      </div>
      ` : `
      <div style="text-align: center; padding: 12px; margin-bottom: 20px;">
        <div style="font-size: 24px;">✅</div>
        <p style="font-size: 13px; color: #22c55e; margin: 4px 0 0;">All caught up! Great job staying on top of your reviews.</p>
      </div>
      `}

      <!-- CTA -->
      <div style="text-align: center;">
        <a href="${appUrl}/practice" style="display: inline-block; background: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          ${dueNow > 0 ? "Practice Now" : "Keep Practicing"}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #94a3b8;">
      <p>EduChamp — Adaptive Learning Platform</p>
      <p>This is an automated weekly summary. You can manage notification preferences in your account settings.</p>
    </div>
  </div>
</body>
</html>`.trim();

  const text = `
Weekly Review Summary — EduChamp
================================

Hi ${firstName},

${streakMessage}
Current streak: ${currentStreak} day${currentStreak !== 1 ? "s" : ""}
${longestStreak > currentStreak ? `Longest streak: ${longestStreak} days` : ""}

--- Review Stats ---
Due Now: ${dueNow}
Due Today: ${dueToday}
Skills Tracked: ${totalScheduled}

--- Skills Ready for Review ---
${skillListText}
${dueNow > topDueSkills.length ? `...and ${dueNow - topDueSkills.length} more` : ""}

Practice now: ${appUrl}/practice

---
EduChamp — Adaptive Learning Platform
`.trim();

  return { subject, html, text };
}
