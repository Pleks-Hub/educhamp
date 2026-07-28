/**
 * EduChamp — Password Reset Email Template
 *
 * Sent when a user requests a password reset link.
 * Uses the shared email base for consistent branding.
 * The link expires in 24 hours.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface PasswordResetEmailData {
  /** User's full name */
  userName: string;
  /** Password reset URL (includes token) */
  resetUrl: string;
  /** Expiry time in hours (default 24) */
  expiryHours?: number;
}

export function buildPasswordResetEmail(data: PasswordResetEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { userName, resetUrl, expiryHours = 24 } = data;
  const firstName = userName.split(" ")[0] || userName;
  const subject = "Reset Your EduChamp Password";
  const expiryText = expiryHours === 1 ? "1 hour" : `${expiryHours} hours`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,${BRAND.brandColor},#8B5CF6);text-align:center;line-height:64px;">
        <span style="font-size:28px;">🔐</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      Password Reset Request
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      Click the button below to set a new password
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${firstName},
    </p>

    <!-- Body text -->
    <p style="margin:0 0 12px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      We received a request to reset the password for your EduChamp account associated with this email address.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Click the button below to choose a new password. This link is valid for <strong style="color:${BRAND.textPrimary};">${expiryText}</strong>.
    </p>

    <!-- CTA Button -->
    <div style="text-align:center;">
      ${ctaButton("Reset My Password", resetUrl)}
    </div>

    <!-- Security notice -->
    <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:10px;padding:14px 18px;margin:24px 0;">
      <p style="margin:0;font-size:13px;color:#FBBF24;line-height:1.6;">
        <strong style="color:#F59E0B;">⚠️ Didn't request this?</strong><br/>
        If you didn't ask to reset your password, you can safely ignore this email.
        Your account is still secure and your password has not been changed.
      </p>
    </div>

    <!-- Fallback link -->
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.textMuted};line-height:1.6;">
      If the button above doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin:0;font-size:12px;word-break:break-all;">
      <a href="${resetUrl}" style="color:${BRAND.brandColor};text-decoration:none;">${resetUrl}</a>
    </p>

    <!-- Tips section -->
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid ${BRAND.borderColor};">
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${BRAND.textPrimary};">
        💡 Password Tips
      </p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:${BRAND.textMuted};line-height:1.8;">
        <li>Use at least 8 characters with uppercase, lowercase, and numbers</li>
        <li>Add a special character (!@#$%) for extra security</li>
        <li>Don't reuse passwords from other accounts</li>
      </ul>
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
    previewText: `Hi ${firstName}, reset your EduChamp password. Link valid for ${expiryText}.`,
    footerHtml,
  });

  const text = `Hi ${firstName},

We received a request to reset the password for your EduChamp account.

Reset your password here (link valid for ${expiryText}):
${resetUrl}

PASSWORD TIPS:
• Use at least 8 characters with uppercase, lowercase, and numbers
• Add a special character (!@#$%) for extra security
• Don't reuse passwords from other accounts

If you didn't request this, you can safely ignore this email. Your account is still secure.

Need help? Contact us at ${BRAND.supportEmail}
Visit us: ${BRAND.websiteUrl}

© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { html, text, subject };
}
