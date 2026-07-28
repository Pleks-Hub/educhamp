/**
 * EduChamp — Student Account Activated Email Template
 *
 * Sent to the parent when their child creates a password and signs in for the first time.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface StudentActivatedEmailData {
  parentName: string;
  studentName: string;
  studentEmail: string;
  activatedAt: Date;
}

export function buildStudentActivatedEmail(data: StudentActivatedEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { parentName, studentName, studentEmail, activatedAt } = data;
  const parentFirst = parentName.split(" ")[0] || parentName;
  const dateStr = activatedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const subject = `${studentName} has activated their EduChamp account!`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);text-align:center;line-height:64px;">
        <span style="font-size:28px;">🎓</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      Account Activated!
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      ${studentName} is ready to start learning
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${parentFirst},
    </p>

    <!-- Body text -->
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Great news! <strong style="color:${BRAND.textPrimary};">${studentName}</strong> has successfully set up their password
      and activated their EduChamp account. They're now ready to start learning!
    </p>

    <!-- Details box -->
    <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:18px;margin:20px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Student:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${studentName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Email:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};text-align:right;">${studentEmail}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Activated:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};text-align:right;">${dateStr}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      You can now monitor their progress, manage their courses, and view insights from your Parent Dashboard.
    </p>

    <!-- CTA Button -->
    <div style="text-align:center;">
      ${ctaButton("View Parent Dashboard", BRAND.websiteUrl)}
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
    previewText: `${studentName} has activated their EduChamp account and is ready to start learning!`,
    footerHtml,
  });

  const text = `Hi ${parentFirst},

Great news! ${studentName} has successfully set up their password and activated their EduChamp account.

Student: ${studentName}
Email: ${studentEmail}
Activated: ${dateStr}

You can now monitor their progress from your Parent Dashboard.

Need help? Contact us at ${BRAND.supportEmail}
© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { html, text, subject };
}
