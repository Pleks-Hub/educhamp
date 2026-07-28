/**
 * EduChamp — Weekly Parent Digest Email Template
 *
 * Sent every Monday to parents of Pre-K through Grade 2 students.
 * Summarises the child's weekly learning activity with emoji highlights,
 * milestone callouts, and suggested at-home activities.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface WeeklyDigestChild {
  /** Child's display name */
  name: string;
  /** Grade level, e.g. "Pre-K", "Kindergarten", "Grade 1" */
  grade: string;
  /** Number of lessons completed in the past 7 days */
  lessonsCompleted: number;
  /** Number of quiz attempts in the past 7 days */
  quizAttempts: number;
  /** Best quiz score this week (0-100), or null if none */
  bestQuizScore: number | null;
  /** Number of new skills mastered this week */
  newSkillsMastered: number;
  /** Total mastery score (0-100) */
  totalMasteryScore: number;
  /** Names of recently completed units (up to 2) */
  recentUnits: string[];
  /** Whether the child showed improvement vs prior week */
  showedImprovement: boolean;
  /** Suggested at-home activity based on current learning */
  suggestedActivity: string;
  /** Deep link to the child's progress page */
  progressUrl: string;
  /** Deep link to recommended next lesson */
  nextLessonUrl: string;
  /** On-track status from diagnostic score (null = no diagnostic yet) */
  onTrackStatus: "on_track" | "needs_attention" | "check_in" | null;
  /** Diagnostic score (0-100), null if no diagnostic taken */
  diagnosticScore: number | null;
  /** Tasks completed this week */
  tasksCompleted: number;
  /** Tasks confirmed by parent this week */
  tasksConfirmed: number;
  /** Tasks still pending */
  tasksPending: number;
  /** XP earned from tasks this week */
  xpEarnedThisWeek: number;
  /** Total lifetime XP */
  totalXp: number;
  /** Current level number */
  currentLevel: number;
  /** Current level name */
  currentLevelName: string;
  /** Badges earned this week */
  badgesEarnedThisWeek: { name: string; iconEmoji: string }[];
  /** Current task completion streak (days) */
  currentStreak: number;
}

export interface WeeklyDigestEmailData {
  /** Parent's full name */
  parentName: string;
  /** Parent's email */
  parentEmail: string;
  /** Week start date (Monday) */
  weekStart: Date;
  /** Week end date (Sunday) */
  weekEnd: Date;
  /** Children's weekly summaries */
  children: WeeklyDigestChild[];
  /** Base URL for the app */
  appUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

function gradeEmoji(grade: string): string {
  const map: Record<string, string> = {
    "Pre-K": "🌱",
    "Kindergarten": "🌟",
    "Grade 1": "🚀",
    "Grade 2": "🦋",
  };
  return map[grade] ?? "📚";
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return "🟦".repeat(filled) + "⬜".repeat(empty);
}

function childCard(child: WeeklyDigestChild): string {
  const emoji = gradeEmoji(child.grade);
  const hasActivity = child.lessonsCompleted > 0 || child.quizAttempts > 0;

  const hasCelebration = child.bestQuizScore === 100 || child.newSkillsMastered > 0;
  const celebrationBadge = hasCelebration
    ? `<tr><td style="padding:8px 0;">
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #f59e0b;border-radius:12px;padding:14px 18px;">
          <span style="font-size:22px;vertical-align:middle;">🏆</span>
          <span style="font-size:15px;font-weight:700;color:#92400e;margin-left:8px;vertical-align:middle;">Celebration!</span>
          <p style="margin:6px 0 0;font-size:14px;color:#78350f;">${
            child.bestQuizScore === 100 && child.newSkillsMastered > 0
              ? `${child.name} scored a perfect 100% on a quiz AND mastered ${child.newSkillsMastered} new skill${child.newSkillsMastered > 1 ? "s" : ""}! 🎉`
              : child.bestQuizScore === 100
                ? `${child.name} scored a perfect 100% on a quiz this week! 🌟`
                : `${child.name} mastered ${child.newSkillsMastered} new skill${child.newSkillsMastered > 1 ? "s" : ""} this week! 🌟`
          }</p>
        </div>
      </td></tr>`
    : "";

  const skillsLine = child.newSkillsMastered > 0
    ? `<tr><td style="padding:6px 0;font-size:15px;">🌟 <strong>${child.newSkillsMastered} new skill${child.newSkillsMastered > 1 ? "s" : ""} mastered!</strong></td></tr>`
    : "";
  const improvementLine = child.showedImprovement
    ? `<tr><td style="padding:6px 0;font-size:15px;">📈 <strong>Showing improvement</strong> compared to last week — keep it up!</td></tr>`
    : "";
  const bestScoreLine = child.bestQuizScore !== null
    ? `<tr><td style="padding:6px 0;font-size:15px;">🎯 Best quiz score this week: <strong>${child.bestQuizScore}%</strong><br/><span style="font-size:20px;letter-spacing:2px;">${scoreBar(child.bestQuizScore)}</span></td></tr>`
    : "";
  const unitsLine = child.recentUnits.length > 0
    ? `<tr><td style="padding:6px 0;font-size:15px;">📖 Worked on: <strong>${child.recentUnits.join(", ")}</strong></td></tr>`
    : "";
  const noActivityMsg = !hasActivity
    ? `<tr><td style="padding:12px;background:#fef9c3;border-radius:8px;font-size:14px;color:#92400e;">
        💡 ${child.name} didn't log any activity this week. A quick 10-minute session can make a big difference!
       </td></tr>`
    : "";

  const onTrackBadge = child.onTrackStatus
    ? (() => {
        const map = {
          on_track: { bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d", icon: "✓", label: "On Track" },
          needs_attention: { bg: "#fffbeb", border: "#fde68a", color: "#92400e", icon: "⚠", label: "Needs Attention" },
          check_in: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b", icon: "✗", label: "Check In" },
        }[child.onTrackStatus];
        return `<tr><td style="padding:6px 0;">
          <span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;background:${map.bg};border:1px solid ${map.border};border-radius:99px;font-size:13px;font-weight:700;color:${map.color};">
            ${map.icon} ${map.label}${child.diagnosticScore !== null ? ` · ${child.diagnosticScore}%` : ""}
          </span>
        </td></tr>`;
      })()
    : "";

  return `
  <div style="background:#ffffff;border-radius:16px;border:2px solid #e0e7ff;margin-bottom:24px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,${BRAND.brandColor},#312e81);padding:18px 24px;">
      <span style="font-size:28px;">${emoji}</span>
      <span style="font-size:20px;font-weight:700;color:#fff;margin-left:10px;">${child.name}</span>
      <span style="font-size:13px;color:rgba(255,255,255,0.8);margin-left:8px;">${child.grade}</span>
    </div>
    <div style="padding:20px 24px;">
      ${hasActivity ? `
      <table width="100%" cellpadding="0" cellspacing="0">
        ${onTrackBadge}
        ${celebrationBadge}
        <tr>
          <td style="padding:6px 0;font-size:15px;">📚 <strong>${child.lessonsCompleted} lesson${child.lessonsCompleted !== 1 ? "s" : ""}</strong> completed this week</td>
        </tr>
        ${child.quizAttempts > 0 ? `<tr><td style="padding:6px 0;font-size:15px;">✏️ <strong>${child.quizAttempts} quiz${child.quizAttempts !== 1 ? "zes" : ""}</strong> attempted</td></tr>` : ""}
        ${bestScoreLine}
        ${skillsLine}
        ${improvementLine}
        ${unitsLine}
      </table>
      ` : `<table width="100%" cellpadding="0" cellspacing="0">${onTrackBadge}</table>` + noActivityMsg}
    </div>
    <!-- Task Progress & XP -->
    ${child.tasksCompleted > 0 || child.xpEarnedThisWeek > 0 ? `
    <div style="padding:0 24px 16px;">
      <div style="background:#f5f3ff;border-radius:10px;border:1px solid #ddd6fe;padding:14px 16px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.5px;">⚡ Task & XP Progress</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="font-size:14px;color:#4c1d95;padding:3px 0;">✅ <strong>${child.tasksCompleted}</strong> task${child.tasksCompleted !== 1 ? "s" : ""} completed</td></tr>
          ${child.xpEarnedThisWeek > 0 ? `<tr><td style="font-size:14px;color:#4c1d95;padding:3px 0;">💎 <strong>+${child.xpEarnedThisWeek} XP</strong> earned this week (${child.totalXp} total)</td></tr>` : ""}
          <tr><td style="font-size:14px;color:#4c1d95;padding:3px 0;">🏅 Level <strong>${child.currentLevel}</strong> — ${child.currentLevelName}</td></tr>
          ${child.currentStreak > 0 ? `<tr><td style="font-size:14px;color:#4c1d95;padding:3px 0;">🔥 <strong>${child.currentStreak}-day streak!</strong></td></tr>` : ""}
          ${child.badgesEarnedThisWeek.length > 0 ? `<tr><td style="font-size:14px;color:#4c1d95;padding:3px 0;">🎖️ New badges: ${child.badgesEarnedThisWeek.map(b => `${b.iconEmoji} ${b.name}`).join(", ")}</td></tr>` : ""}
          ${child.tasksPending > 0 ? `<tr><td style="font-size:14px;color:#92400e;padding:3px 0;">📋 ${child.tasksPending} task${child.tasksPending !== 1 ? "s" : ""} still pending</td></tr>` : ""}
        </table>
      </div>
    </div>` : ""}
    <!-- Suggested activity -->
    <div style="padding:0 24px 20px;">
      <div style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;padding:14px 16px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;">🏠 At-Home Activity</p>
        <p style="margin:0;font-size:14px;color:#166534;">${child.suggestedActivity}</p>
      </div>
    </div>
    <!-- CTA buttons -->
    <div style="padding:0 24px 24px;">
      <a href="${child.progressUrl}" style="display:inline-block;padding:10px 20px;background:${BRAND.brandColor};color:#fff;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;margin-right:10px;">
        View Progress
      </a>
      <a href="${child.nextLessonUrl}" style="display:inline-block;padding:10px 20px;background:#f59e0b;color:#fff;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;">
        Start Next Lesson →
      </a>
    </div>
  </div>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildWeeklyParentDigestEmail(data: WeeklyDigestEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { parentName, children, weekStart, weekEnd, appUrl } = data;
  const firstName = parentName.split(" ")[0] || parentName;
  const weekRange = formatWeekRange(weekStart, weekEnd);
  const totalLessons = children.reduce((s, c) => s + c.lessonsCompleted, 0);
  const totalSkills = children.reduce((s, c) => s + c.newSkillsMastered, 0);

  const subject = `📚 ${firstName}'s EduChamp Weekly Digest — ${weekRange}`;

  const summaryLine = totalLessons > 0
    ? `This week ${children.length === 1 ? children[0].name : "your learners"} completed <strong>${totalLessons} lesson${totalLessons !== 1 ? "s" : ""}</strong>${totalSkills > 0 ? ` and mastered <strong>${totalSkills} new skill${totalSkills !== 1 ? "s" : ""}</strong>` : ""}. Here's the full breakdown:`
    : `Here's a summary of this week's learning activity. Every day counts — even a short session helps build lasting skills!`;

  const bodyHtml = `
    <!-- Header -->
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:${BRAND.textPrimary};text-align:center;">
      Weekly Learning Digest 📬
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      Week of ${weekRange}
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 10px;font-size:17px;color:${BRAND.textPrimary};">Hi ${firstName}! 👋</p>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.6;">${summaryLine}</p>

    <!-- Child cards -->
    ${children.map((c) => childCard(c)).join("")}

    <!-- Tips section -->
    <div style="background:#ffffff;border-radius:16px;margin-bottom:24px;border:1px solid #e2e8f0;padding:22px 28px;">
      <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:${BRAND.textPrimary};">💡 Parent Tips for Young Learners</p>
      <ul style="margin:0;padding-left:18px;color:${BRAND.textMuted};font-size:14px;line-height:1.8;">
        <li>Sit together for 10–15 minutes — your presence makes learning feel safe and fun.</li>
        <li>Celebrate small wins! Saying "You worked so hard on that!" builds a growth mindset.</li>
        <li>Use the <strong>Read Aloud</strong> button in lessons to hear instructions spoken clearly.</li>
        <li>Ask your child to teach you what they learned — explaining reinforces memory.</li>
      </ul>
    </div>

    <!-- CTA -->
    <div style="text-align:center;">
      ${ctaButton("Open Parent Dashboard", `${appUrl}/parent`)}
    </div>
  `;

  const footerHtml = `
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      You're receiving this because you're a parent on EduChamp.
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      <a href="${appUrl}/profile" style="color:${BRAND.brandColor};text-decoration:none;">Manage email preferences</a>
      &nbsp;·&nbsp;
      <a href="${BRAND.websiteUrl}" style="color:${BRAND.brandColor};text-decoration:none;">EduChamp</a>
      &nbsp;·&nbsp;
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.brandColor};text-decoration:none;">${BRAND.supportEmail}</a>
    </p>
    <p style="margin:0;font-size:11px;color:${BRAND.textMuted};opacity:0.7;">
      © ${new Date().getFullYear()} EduChamp · AI-Powered Adaptive Learning
    </p>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: `${firstName}'s EduChamp Weekly Digest — ${weekRange}. ${totalLessons} lessons completed.`,
    footerHtml,
  });

  // Plain text fallback
  const text = [
    `Hi ${firstName}!`,
    ``,
    `Here's your EduChamp Weekly Digest for ${weekRange}.`,
    ``,
    ...children.map((c) => [
      `── ${c.name} (${c.grade}) ──`,
      `Lessons completed: ${c.lessonsCompleted}`,
      c.quizAttempts > 0 ? `Quiz attempts: ${c.quizAttempts}` : null,
      c.bestQuizScore !== null ? `Best quiz score: ${c.bestQuizScore}%` : null,
      c.newSkillsMastered > 0 ? `New skills mastered: ${c.newSkillsMastered}` : null,
      c.showedImprovement ? `Showing improvement this week!` : null,
      ``,
      `At-home activity: ${c.suggestedActivity}`,
      `View progress: ${c.progressUrl}`,
      ``,
    ].filter(Boolean).join("\n")),
    `Open Parent Dashboard: ${appUrl}/parent`,
    ``,
    `Need help? Contact us at ${BRAND.supportEmail}`,
    `© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning`,
  ].join("\n");

  return { html, text, subject };
}
