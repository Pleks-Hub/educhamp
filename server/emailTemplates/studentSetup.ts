/**
 * EduChamp — Student Account Setup Email Template
 *
 * Sent when a parent enrolls a student by email.
 * Contains a link for the student to create their password and access their account.
 * Uses the shared email base for consistent branding (logo, teal gradient, support footer).
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface StudentSetupEmailData {
  studentName: string;
  parentName: string;
  setupUrl: string;
  personalNote?: string;
}

export function buildStudentSetupEmail(data: StudentSetupEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { studentName, parentName, setupUrl, personalNote } = data;
  const firstName = studentName.split(" ")[0] || studentName;
  const subject = `Welcome to EduChamp! Set up your account, ${firstName}`;

  const personalNoteHtml = personalNote
    ? `
    <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:10px;padding:14px 18px;margin:16px 0;">
      <p style="margin:0;font-size:13px;color:#FBBF24;line-height:1.6;">
        <strong style="color:#F59E0B;">💬 A note from ${parentName}:</strong><br/>
        <em style="display:inline-block;margin-top:6px;color:${BRAND.textMuted};">${personalNote}</em>
      </p>
    </div>`
    : "";

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,${BRAND.brandColor},#8B5CF6);text-align:center;line-height:64px;">
        <span style="font-size:28px;">🎓</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      Welcome to EduChamp!
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      Your learning journey starts here
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${firstName}!
    </p>

    <!-- Body text -->
    <p style="margin:0 0 12px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Great news! <strong style="color:${BRAND.textPrimary};">${parentName}</strong> has enrolled you in EduChamp — an AI-powered learning platform
      designed to help you master your subjects at your own pace.
    </p>

    ${personalNoteHtml}

    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      To get started, you need to create a password for your account. Click the button below to set up your login:
    </p>

    <!-- CTA Button -->
    <div style="text-align:center;">
      ${ctaButton("Create My Password & Sign In", setupUrl)}
    </div>

    <!-- Apple ID tip -->
    <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:14px 18px;margin:24px 0;">
      <p style="margin:0;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
        <strong style="color:${BRAND.textPrimary};">💡 Tip:</strong> If you have an Apple device, you can also sign in using your Apple ID
        (as long as the email matches the one your parent registered). Just click "Sign in with Apple" on the login page.
      </p>
    </div>

    <!-- Expiry notice -->
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
      This link expires in <strong style="color:${BRAND.textPrimary};">7 days</strong>. If it expires, ask your parent to resend it from their dashboard.
    </p>

    <!-- Fallback link -->
    <p style="margin:16px 0 0;font-size:12px;color:${BRAND.textMuted};line-height:1.6;">
      If the button above doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin:4px 0 0;font-size:12px;word-break:break-all;">
      <a href="${setupUrl}" style="color:${BRAND.brandColor};text-decoration:none;">${setupUrl}</a>
    </p>

    <!-- Spam folder tip -->
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid ${BRAND.borderColor};">
      <p style="margin:0;font-size:12px;color:${BRAND.textMuted};line-height:1.6;">
        📬 <strong>Not seeing this email?</strong> Check your spam or junk folder. To make sure future emails arrive,
        add <strong>${BRAND.supportEmail}</strong> to your contacts.
      </p>
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
    previewText: `Hi ${firstName}! ${parentName} has enrolled you in EduChamp. Set up your account to start learning.`,
    footerHtml,
  });

  const text = `Hi ${firstName}!

Great news! ${parentName} has enrolled you in EduChamp — an AI-powered learning platform.
${personalNote ? `\nA note from ${parentName}: "${personalNote}"\n` : ""}
To get started, create your password here (link valid for 7 days):
${setupUrl}

Tip: If you have an Apple device, you can also sign in using your Apple ID (as long as the email matches).

Not seeing this email? Check your spam or junk folder. Add ${BRAND.supportEmail} to your contacts.

Need help? Contact us at ${BRAND.supportEmail}
Visit us: ${BRAND.websiteUrl}

© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { html, text, subject };
}
