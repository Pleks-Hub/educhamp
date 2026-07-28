/**
 * flagResolutionNotification.ts
 * Email sent to a student when an admin resolves or dismisses their flagged question.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface FlagResolutionEmailData {
  studentName: string;
  status: "resolved" | "dismissed";
  questionText: string;
  questionType: "quiz" | "diagnostic";
  reason: string;
  reviewNote?: string;
  dashboardUrl: string;
}

export function buildFlagResolutionEmail(data: FlagResolutionEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { studentName, status, questionText, questionType, reason, reviewNote, dashboardUrl } = data;
  const firstName = studentName.split(" ")[0] || studentName;
  const isResolved = status === "resolved";
  const subject = isResolved
    ? `Your flagged question has been resolved — EduChamp`
    : `Update on your flagged question — EduChamp`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,${isResolved ? "#10b981,#059669" : "#6366f1,#4f46e5"});text-align:center;line-height:64px;">
        <span style="font-size:28px;">${isResolved ? "✅" : "ℹ️"}</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      ${isResolved ? "Question Fixed!" : "Flag Reviewed"}
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      Your ${questionType} question flag has been reviewed
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${firstName},
    </p>

    <!-- Body text -->
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      ${isResolved
        ? "Thank you for flagging this question! Our team has reviewed and fixed the issue."
        : "Our team has reviewed the question you flagged. After careful consideration, the question appears to be correct as-is."}
    </p>

    <!-- Question details box -->
    <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:18px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;">
        Flagged Question (${questionType})
      </p>
      <p style="margin:0 0 12px;font-size:14px;color:${BRAND.textPrimary};line-height:1.5;font-style:italic;">
        "${questionText.length > 120 ? questionText.slice(0, 120) + "..." : questionText}"
      </p>
      <p style="margin:0;font-size:12px;color:${BRAND.textMuted};">
        <strong>Your reason:</strong> ${reason}
      </p>
    </div>

    ${reviewNote ? `
    <!-- Review note -->
    <div style="background:#f9fafb;border-left:3px solid ${isResolved ? "#10b981" : "#6366f1"};padding:12px 16px;border-radius:4px;margin:0 0 20px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${BRAND.textMuted};">Note from reviewer:</p>
      <p style="margin:0;font-size:14px;color:${BRAND.textPrimary};line-height:1.5;">${reviewNote}</p>
    </div>
    ` : ""}

    <!-- CTA Button -->
    <div style="text-align:center;margin-top:24px;">
      ${ctaButton("Continue Learning", dashboardUrl)}
    </div>
  `;

  const footerHtml = `
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      Need help? Contact us at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.brandColor};text-decoration:none;">${BRAND.supportEmail}</a>
    </p>
    <p style="margin:0;font-size:11px;color:${BRAND.textMuted};opacity:0.7;">
      © ${new Date().getFullYear()} EduChamp · AI-Powered Adaptive Learning
    </p>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: isResolved
      ? "Your flagged question has been fixed. Thank you for helping improve EduChamp!"
      : "Your flagged question has been reviewed. The question appears correct as-is.",
    footerHtml,
  });

  const text = `Hi ${firstName},

${isResolved
  ? "Thank you for flagging this question! Our team has reviewed and fixed the issue."
  : "Our team has reviewed the question you flagged. After careful consideration, the question appears to be correct as-is."}

FLAGGED QUESTION (${questionType}):
"${questionText}"

Your reason: ${reason}
${reviewNote ? `\nReviewer note: ${reviewNote}` : ""}

Continue Learning: ${dashboardUrl}

Need help? Contact us at ${BRAND.supportEmail}
© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { subject, html, text };
}
