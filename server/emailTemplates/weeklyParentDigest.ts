/**
 * EduChamp — Weekly Parent Digest Email Template
 *
 * Sent every Monday to parents of Pre-K through Grade 2 students.
 * Summarises the child's weekly learning activity with emoji highlights,
 * milestone callouts, and suggested at-home activities.
 */

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
  /** B4: On-track status from diagnostic score (null = no diagnostic yet) */
  onTrackStatus: "on_track" | "needs_attention" | "check_in" | null;
  /** B4: Diagnostic score (0-100), null if no diagnostic taken */
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

// ─── Design tokens ────────────────────────────────────────────────────────────

const BRAND_COLOR = "#4f46e5";   // indigo-600
const BRAND_LIGHT = "#e0e7ff";   // indigo-100
const BRAND_DARK = "#312e81";    // indigo-900
const ACCENT = "#f59e0b";        // amber-500
const SUCCESS = "#10b981";       // emerald-500
const BG = "#f8fafc";
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#0f172a";
const TEXT_MUTED = "#64748b";
const LOGO_URL = "https://educhamp.co/manus-storage/educhamp-logo-64_28201452.png";

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

function childCard(child: WeeklyDigestChild, idx: number): string {
  const emoji = gradeEmoji(child.grade);
  const hasActivity = child.lessonsCompleted > 0 || child.quizAttempts > 0;

  // Celebration badge for perfect quiz or new mastery
  const hasCelebration = child.bestQuizScore === 100 || child.newSkillsMastered > 0;
  const celebrationBadge = hasCelebration
    ? `<tr><td style="padding:8px 0;">
        <table cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid ${ACCENT};border-radius:12px;width:100%;">
          <tr>
            <td style="padding:14px 18px;">
              <span style="font-size:22px;vertical-align:middle;">🏆</span>
              <span style="font-size:15px;font-weight:700;color:#92400e;margin-left:8px;vertical-align:middle;">Celebration!</span>
              <p style="margin:6px 0 0;font-size:14px;color:#78350f;">${
                child.bestQuizScore === 100 && child.newSkillsMastered > 0
                  ? `${child.name} scored a perfect 100% on a quiz AND mastered ${child.newSkillsMastered} new skill${child.newSkillsMastered > 1 ? "s" : ""}! 🎉`
                  : child.bestQuizScore === 100
                    ? `${child.name} scored a perfect 100% on a quiz this week! 🌟`
                    : `${child.name} mastered ${child.newSkillsMastered} new skill${child.newSkillsMastered > 1 ? "s" : ""} this week! 🌟`
              }</p>
            </td>
          </tr>
        </table>
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

  // B4: On-track badge
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
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border-radius:16px;border:2px solid ${BRAND_LIGHT};margin-bottom:24px;overflow:hidden;">
    <tr>
      <td style="background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_DARK});padding:18px 24px;">
        <span style="font-size:28px;">${emoji}</span>
        <span style="font-size:20px;font-weight:700;color:#fff;margin-left:10px;">${child.name}</span>
        <span style="font-size:13px;color:rgba(255,255,255,0.8);margin-left:8px;">${child.grade}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px;">
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
      </td>
    </tr>
    <!-- Task Progress & XP -->
    ${child.tasksCompleted > 0 || child.xpEarnedThisWeek > 0 ? `
    <tr>
      <td style="padding:0 24px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:10px;border:1px solid #ddd6fe;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#6d28d9;text-transform:uppercase;letter-spacing:0.5px;">⚡ Task & XP Progress</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:14px;color:#4c1d95;padding:3px 0;">✅ <strong>${child.tasksCompleted}</strong> task${child.tasksCompleted !== 1 ? "s" : ""} completed</td>
                </tr>
                ${child.xpEarnedThisWeek > 0 ? `<tr><td style="font-size:14px;color:#4c1d95;padding:3px 0;">💎 <strong>+${child.xpEarnedThisWeek} XP</strong> earned this week (${child.totalXp} total)</td></tr>` : ""}
                <tr>
                  <td style="font-size:14px;color:#4c1d95;padding:3px 0;">🏅 Level <strong>${child.currentLevel}</strong> — ${child.currentLevelName}</td>
                </tr>
                ${child.currentStreak > 0 ? `<tr><td style="font-size:14px;color:#4c1d95;padding:3px 0;">🔥 <strong>${child.currentStreak}-day streak!</strong></td></tr>` : ""}
                ${child.badgesEarnedThisWeek.length > 0 ? `<tr><td style="font-size:14px;color:#4c1d95;padding:3px 0;">🎖️ New badges: ${child.badgesEarnedThisWeek.map(b => `${b.iconEmoji} ${b.name}`).join(", ")}</td></tr>` : ""}
                ${child.tasksPending > 0 ? `<tr><td style="font-size:14px;color:#92400e;padding:3px 0;">📋 ${child.tasksPending} task${child.tasksPending !== 1 ? "s" : ""} still pending</td></tr>` : ""}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : ""}
    <!-- Suggested activity -->
    <tr>
      <td style="padding:0 24px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:10px;border:1px solid #bbf7d0;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;">🏠 At-Home Activity</p>
              <p style="margin:0;font-size:14px;color:#166534;">${child.suggestedActivity}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- CTA buttons -->
    <tr>
      <td style="padding:0 24px 24px;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:10px;">
              <a href="${child.progressUrl}" style="display:inline-block;padding:10px 20px;background:${BRAND_COLOR};color:#fff;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;">
                View Progress
              </a>
            </td>
            <td>
              <a href="${child.nextLessonUrl}" style="display:inline-block;padding:10px 20px;background:${ACCENT};color:#fff;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;">
                Start Next Lesson →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
    .wrapper { max-width:600px;margin:0 auto;padding:32px 16px; }
    a { color:${BRAND_COLOR}; }
    @media (max-width:480px) {
      .wrapper { padding:16px 8px; }
    }
  </style>
</head>
<body>
<div class="wrapper">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,${BRAND_COLOR},${BRAND_DARK});border-radius:20px;margin-bottom:24px;overflow:hidden;">
    <tr>
      <td style="padding:28px 32px;">
        <img src="${LOGO_URL}" alt="EduChamp" style="height:36px;margin-bottom:12px;display:block;" />
        <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#fff;">Weekly Learning Digest 📬</h1>
        <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">Week of ${weekRange}</p>
      </td>
    </tr>
  </table>

  <!-- Greeting -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border-radius:16px;margin-bottom:24px;">
    <tr>
      <td style="padding:24px 28px;">
        <p style="margin:0 0 10px;font-size:17px;color:${TEXT_PRIMARY};">Hi ${firstName}! 👋</p>
        <p style="margin:0;font-size:15px;color:${TEXT_MUTED};line-height:1.6;">${summaryLine}</p>
      </td>
    </tr>
  </table>

  <!-- Child cards -->
  ${children.map((c, i) => childCard(c, i)).join("")}

  <!-- Tips section -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${CARD_BG};border-radius:16px;margin-bottom:24px;border:1px solid #e2e8f0;">
    <tr>
      <td style="padding:22px 28px;">
        <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:${TEXT_PRIMARY};">💡 Parent Tips for Young Learners</p>
        <ul style="margin:0;padding-left:18px;color:${TEXT_MUTED};font-size:14px;line-height:1.8;">
          <li>Sit together for 10–15 minutes — your presence makes learning feel safe and fun.</li>
          <li>Celebrate small wins! Saying "You worked so hard on that!" builds a growth mindset.</li>
          <li>Use the <strong>Read Aloud</strong> button in lessons to hear instructions spoken clearly.</li>
          <li>Ask your child to teach you what they learned — explaining reinforces memory.</li>
        </ul>
      </td>
    </tr>
  </table>

  <!-- CTA -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;text-align:center;">
    <tr>
      <td>
        <a href="${appUrl}/parent" style="display:inline-block;padding:14px 32px;background:${BRAND_COLOR};color:#fff;font-size:15px;font-weight:700;border-radius:12px;text-decoration:none;">
          Open Parent Dashboard →
        </a>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:20px 0;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:${TEXT_MUTED};">
          You're receiving this because you're a parent on EduChamp.
        </p>
        <p style="margin:0;font-size:12px;color:${TEXT_MUTED};">
          <a href="${appUrl}/profile" style="color:${BRAND_COLOR};">Manage email preferences</a> &nbsp;·&nbsp;
          <a href="${appUrl}" style="color:${BRAND_COLOR};">EduChamp</a>
        </p>
      </td>
    </tr>
  </table>

</div>
</body>
</html>`;

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
    `EduChamp — Manage email preferences: ${appUrl}/profile`,
  ].join("\n");

  return { html, text, subject };
}
