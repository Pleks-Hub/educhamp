/**
 * learningPlanReminder.ts - Email template for learning plan study block reminders.
 * Sent to students before their scheduled study block starts.
 */
import { BRAND, wrapEmailHtml } from "./emailBase";

export interface LearningPlanReminderData {
  studentName: string;
  courseName: string;
  durationMinutes: number;
  priority: "high" | "medium" | "low";
  dayLabel: string;
  notes?: string;
}

export function buildLearningPlanReminderEmail(data: LearningPlanReminderData): { subject: string; html: string } {
  const priorityColors: Record<string, string> = {
    high: "#FF6584",
    medium: "#FFB347",
    low: "#4ECDC4",
  };
  const priorityLabels: Record<string, string> = {
    high: "Focus Area",
    medium: "Regular Study",
    low: "Review",
  };

  const bodyHtml = `
    <div style="padding:32px 24px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:24px;color:${BRAND.textPrimary};">
        📚 Study Time!
      </h1>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};">
        Hey ${data.studentName}, your scheduled study block is starting soon.
      </p>
      <div style="background:${BRAND.cardBg};border-radius:12px;padding:24px;margin:0 auto;max-width:400px;border:1px solid ${BRAND.borderColor};">
        <div style="margin-bottom:16px;">
          <span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;background:${priorityColors[data.priority]}20;color:${priorityColors[data.priority]};">
            ${priorityLabels[data.priority]}
          </span>
        </div>
        <h2 style="margin:0 0 8px;font-size:20px;color:${BRAND.textPrimary};">
          ${data.courseName}
        </h2>
        <p style="margin:0 0 4px;font-size:14px;color:${BRAND.textMuted};">
          ⏱ ${data.durationMinutes} minutes · ${data.dayLabel}
        </p>
        ${data.notes ? `<p style="margin:12px 0 0;font-size:13px;color:${BRAND.accentColor};font-style:italic;">${data.notes}</p>` : ""}
      </div>
      <div style="margin-top:24px;">
        <a href="${BRAND.websiteUrl}" style="display:inline-block;padding:12px 32px;background:${BRAND.brandColor};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
          Start Learning →
        </a>
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:${BRAND.textMuted};">
        Consistent practice builds mastery. You've got this! 💪
      </p>
    </div>
  `;

  return {
    subject: `📚 Study Reminder: ${data.courseName} (${data.durationMinutes}min)`,
    html: wrapEmailHtml({ bodyHtml, previewText: `Time to study ${data.courseName}!` }),
  };
}
