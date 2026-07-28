/**
 * inactivityNotification.ts
 * Email templates for student inactivity reminders sent to students and parents.
 * Supports 7-day, 14-day, 30-day, and manual notification tiers.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface InactivityEmailParams {
  studentName: string;
  inactiveDays: number;
  lastActiveDate: string;
  resumeUrl: string;
  recipientType: "student" | "parent";
  parentName?: string; // used when recipientType === "parent"
}

export function buildInactivityEmail(params: InactivityEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { studentName, inactiveDays, lastActiveDate, resumeUrl, recipientType, parentName } = params;

  const tier = inactiveDays >= 30 ? "30-day" : inactiveDays >= 14 ? "14-day" : "7-day";
  const urgency = inactiveDays >= 30 ? "We miss you!" : inactiveDays >= 14 ? "It's been a while" : "Time to get back on track";
  const emoji = inactiveDays >= 30 ? "💤" : inactiveDays >= 14 ? "📚" : "⏰";

  const isParent = recipientType === "parent";
  const firstName = isParent ? (parentName?.split(" ")[0] || "there") : studentName.split(" ")[0];
  const subject = isParent
    ? `${studentName} hasn't been active on EduChamp for ${inactiveDays} days`
    : `${urgency} — ${inactiveDays} days since your last session`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,${inactiveDays >= 30 ? "#ef4444,#dc2626" : inactiveDays >= 14 ? "#f59e0b,#d97706" : "#6366f1,#4f46e5"});text-align:center;line-height:64px;">
        <span style="font-size:28px;">${emoji}</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      ${urgency}
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      ${inactiveDays} days since last activity
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${firstName},
    </p>

    <!-- Body text -->
    ${isParent ? `
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      <strong style="color:${BRAND.textPrimary};">${studentName}</strong> hasn't been active on EduChamp
      for <strong style="color:${BRAND.textPrimary};">${inactiveDays} days</strong>.
      Their last session was on ${lastActiveDate}.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      A gentle reminder from you can make a big difference! Consistent practice helps build lasting skills.
    </p>
    ` : `
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      It's been <strong style="color:${BRAND.textPrimary};">${inactiveDays} days</strong> since your last session on EduChamp.
      Your last activity was on ${lastActiveDate}.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Even a quick 5-minute session can help keep your skills sharp. Your AI tutor is ready when you are!
    </p>
    `}

    <!-- Motivation box -->
    <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:18px;margin:20px 0;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${BRAND.textPrimary};">
        🎯 ${isParent ? "How to help:" : "Quick ways to get back:"}
      </p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:${BRAND.textMuted};line-height:2;">
        ${isParent ? `
        <li>Encourage a short 5-minute practice session</li>
        <li>Set a daily learning reminder together</li>
        <li>Review their progress and celebrate achievements</li>
        ` : `
        <li>Try a Quick Practice session (just 5 minutes!)</li>
        <li>Review topics you've already mastered</li>
        <li>Ask the AI tutor about something you're curious about</li>
        `}
      </ul>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;">
      ${ctaButton(isParent ? "View Student Dashboard" : "Resume Learning", resumeUrl)}
    </div>
  `;

  const footerHtml = `
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      Need help? Contact us at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.brandColor};text-decoration:none;">${BRAND.supportEmail}</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      <a href="${BRAND.websiteUrl}" style="color:${BRAND.brandColor};text-decoration:none;">Visit EduChamp</a>
      &nbsp;·&nbsp;
      <a href="${BRAND.websiteUrl}/privacy" style="color:${BRAND.brandColor};text-decoration:none;">Privacy Policy</a>
      &nbsp;·&nbsp;
      <a href="${BRAND.websiteUrl}/terms" style="color:${BRAND.brandColor};text-decoration:none;">Terms of Service</a>
    </p>
    <p style="margin:0;font-size:11px;color:${BRAND.textMuted};opacity:0.7;">
      © ${new Date().getFullYear()} EduChamp · AI-Powered Adaptive Learning
    </p>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: isParent
      ? `${studentName} hasn't been active for ${inactiveDays} days. Last session: ${lastActiveDate}.`
      : `It's been ${inactiveDays} days since your last session. Your AI tutor is ready!`,
    footerHtml,
  });

  const text = `Hi ${firstName},

${isParent
  ? `${studentName} hasn't been active on EduChamp for ${inactiveDays} days. Their last session was on ${lastActiveDate}.`
  : `It's been ${inactiveDays} days since your last session on EduChamp. Your last activity was on ${lastActiveDate}.`}

${isParent
  ? "A gentle reminder from you can make a big difference! Consistent practice helps build lasting skills."
  : "Even a quick 5-minute session can help keep your skills sharp. Your AI tutor is ready when you are!"}

${isParent ? "View Student Dashboard" : "Resume Learning"}: ${resumeUrl}

Need help? Contact us at ${BRAND.supportEmail}
Visit us: ${BRAND.websiteUrl}

© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { subject, html, text };
}
