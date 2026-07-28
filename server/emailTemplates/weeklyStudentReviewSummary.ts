/**
 * weeklyStudentReviewSummary.ts — Email template
 *
 * Builds a personalised weekly review summary email for students,
 * showing accumulated due reviews and streak status.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

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

  const firstName = studentName.split(" ")[0] || studentName;
  const subject = currentStreak > 0
    ? `🔥 ${currentStreak}-day streak! ${dueNow} reviews waiting — EduChamp`
    : `📚 ${dueNow} reviews are due — keep your streak alive!`;

  const streakEmoji = currentStreak >= 7 ? "🔥" : currentStreak >= 3 ? "⚡" : "💪";

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ef4444);text-align:center;line-height:64px;">
        <span style="font-size:28px;">${streakEmoji}</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      Weekly Review Summary
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      Your spaced repetition progress this week
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hey ${firstName}!
    </p>

    <!-- Streak card -->
    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #f59e0b;border-radius:12px;padding:18px;margin:0 0 20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:32px;font-weight:800;color:#92400e;">
        ${currentStreak > 0 ? `${streakEmoji} ${currentStreak}-day streak` : "Start a streak today!"}
      </p>
      ${currentStreak > 0 ? `
      <p style="margin:0;font-size:13px;color:#78350f;">
        ${todayActive ? "✅ Today's session complete!" : "⏰ Complete today's review to keep it alive!"}
        ${longestStreak > currentStreak ? ` · Personal best: ${longestStreak} days` : currentStreak === longestStreak && currentStreak > 1 ? " · 🏆 New personal best!" : ""}
      </p>
      ` : `
      <p style="margin:0;font-size:13px;color:#78350f;">
        Complete a review session to start building your streak!
      </p>
      `}
    </div>

    <!-- Stats box -->
    <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:18px;margin:20px 0;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${BRAND.textPrimary};">
        📊 Review Stats
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Due now:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${dueNow} reviews</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Due today:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${dueToday} reviews</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Total scheduled:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${totalScheduled} skills</td>
        </tr>
      </table>
    </div>

    ${topDueSkills.length > 0 ? `
    <!-- Top due skills -->
    <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:${BRAND.textPrimary};">
      🎯 Skills needing review:
    </p>
    <ul style="margin:0 0 24px;padding-left:18px;font-size:13px;color:${BRAND.textMuted};line-height:2;">
      ${topDueSkills.slice(0, 5).map(s =>
        `<li><strong>${s.skillName}</strong>${s.daysSinceReview !== null ? ` — ${s.daysSinceReview} days since last review` : " — never reviewed"}</li>`
      ).join("")}
    </ul>
    ` : ""}

    <!-- CTA Button -->
    <div style="text-align:center;">
      ${ctaButton("Start Review Session", `${appUrl}/practice`)}
    </div>

    <p style="margin:16px 0 0;font-size:13px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
      Just 5 minutes of review helps lock in what you've learned!
    </p>
  `;

  const footerHtml = `
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      Need help? Contact us at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.brandColor};text-decoration:none;">${BRAND.supportEmail}</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      <a href="${appUrl}/profile" style="color:${BRAND.brandColor};text-decoration:none;">Manage email preferences</a>
      &nbsp;·&nbsp;
      <a href="${BRAND.websiteUrl}" style="color:${BRAND.brandColor};text-decoration:none;">EduChamp</a>
    </p>
    <p style="margin:0;font-size:11px;color:${BRAND.textMuted};opacity:0.7;">
      © ${new Date().getFullYear()} EduChamp · AI-Powered Adaptive Learning
    </p>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: currentStreak > 0
      ? `${streakEmoji} ${currentStreak}-day streak! ${dueNow} reviews waiting for you.`
      : `${dueNow} reviews are due. Start a streak today!`,
    footerHtml,
  });

  const text = `Hey ${firstName}!

${currentStreak > 0 ? `${streakEmoji} ${currentStreak}-day streak! ${todayActive ? "Today's session complete!" : "Complete today's review to keep it alive!"}` : "Start a streak today by completing a review session!"}

REVIEW STATS:
Due now: ${dueNow} reviews
Due today: ${dueToday} reviews
Total scheduled: ${totalScheduled} skills

${topDueSkills.length > 0 ? `SKILLS NEEDING REVIEW:\n${topDueSkills.slice(0, 5).map(s => `• ${s.skillName}${s.daysSinceReview !== null ? ` (${s.daysSinceReview} days ago)` : " (never reviewed)"}`).join("\n")}\n` : ""}
Start Review Session: ${appUrl}/practice

Just 5 minutes of review helps lock in what you've learned!

Need help? Contact us at ${BRAND.supportEmail}
© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { subject, html, text };
}
