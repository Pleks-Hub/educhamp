/**
 * EduChamp — Student Invite Accepted Email Template
 *
 * Sent to the parent when their child accepts a student invite token
 * and is successfully linked to the parent's account.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface InviteAcceptedEmailData {
  parentName: string;
  studentName: string;
  studentEmail: string;
  acceptedAt: Date;
  dashboardUrl: string;
}

export function buildInviteAcceptedEmail(data: InviteAcceptedEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { parentName, studentName, studentEmail, acceptedAt, dashboardUrl } = data;
  const parentFirst = parentName.split(" ")[0] || parentName;
  const dateStr = acceptedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const subject = `${studentName} accepted your invite — EduChamp`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);text-align:center;line-height:64px;">
        <span style="font-size:28px;">✅</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      Invite Accepted
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      Student Linked Successfully
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${parentFirst}!
    </p>

    <!-- Body text -->
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Great news! <strong style="color:${BRAND.textPrimary};">${studentName}</strong> has accepted your invitation
      and is now connected to your EduChamp parent account.
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
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Accepted:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};text-align:right;">${dateStr}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      You can now view their progress, manage their courses, and track their learning journey from your Parent Dashboard.
    </p>

    <!-- CTA Button -->
    <div style="text-align:center;">
      ${ctaButton("View Dashboard", dashboardUrl)}
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
    previewText: `${studentName} accepted your invitation and is now connected to your EduChamp account.`,
    footerHtml,
  });

  const text = `Hi ${parentFirst}!

Great news! ${studentName} has accepted your invitation and is now connected to your EduChamp parent account.

Student: ${studentName}
Email: ${studentEmail}
Accepted: ${dateStr}

You can now view their progress from your Parent Dashboard:
${dashboardUrl}

Need help? Contact us at ${BRAND.supportEmail}
Visit us: ${BRAND.websiteUrl}

© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { html, text, subject };
}
