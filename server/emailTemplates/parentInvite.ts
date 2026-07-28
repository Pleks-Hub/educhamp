/**
 * EduChamp — Parent/Guardian Invitation Email Template
 *
 * Generates a fully branded HTML email for the student-to-parent invitation flow.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface ParentInviteEmailData {
  /** Student's full name */
  studentName: string;
  /** Student's grade level, e.g. "9th Grade" */
  studentGrade?: string;
  /** Active course name, e.g. "Algebra I" */
  courseName?: string;
  /** Parent/guardian's name (if known) */
  parentName?: string;
  /** The full invitation URL (with token) */
  inviteUrl: string;
  /** Token expiry date */
  expiresAt: Date;
  /** Whether the parent already has an EduChamp account */
  isExistingUser?: boolean;
}

export function buildParentInviteEmail(data: ParentInviteEmailData): { html: string; text: string; subject: string } {
  const {
    studentName,
    studentGrade,
    courseName,
    parentName,
    inviteUrl,
    expiresAt,
    isExistingUser = false,
  } = data;

  const greeting = parentName ? `Hi ${parentName},` : "Hello,";
  const gradeLabel = studentGrade ? ` (${studentGrade})` : "";
  const courseLabel = courseName ? ` — currently enrolled in <strong style="color:${BRAND.textPrimary};">${courseName}</strong>` : "";
  const expiryLabel = expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const ctaLabel = isExistingUser ? "View Student Request in Portal" : "Accept Invitation & Create Account";
  const actionDescription = isExistingUser
    ? `Since you already have an EduChamp account, simply click below to review and approve the request in your Parent Portal.`
    : `Click the button below to create your free EduChamp parent account, review the request, and start monitoring ${studentName}'s learning journey.`;

  const subject = `${studentName} wants you to join EduChamp as their parent/guardian`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,${BRAND.brandColor},#8B5CF6);text-align:center;line-height:64px;">
        <span style="font-size:28px;">👨‍👩‍👧</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      Parent/Guardian Invitation
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      A student wants you to monitor their learning progress
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      ${greeting}
    </p>

    <!-- Body text -->
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      <strong style="color:${BRAND.textPrimary};">${studentName}</strong>${gradeLabel} has invited you to join EduChamp as their parent or guardian${courseLabel}.
    </p>

    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      ${actionDescription}
    </p>

    <!-- CTA Button -->
    <div style="text-align:center;">
      ${ctaButton(ctaLabel, inviteUrl)}
    </div>

    <!-- Benefits -->
    <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:18px;margin:24px 0;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${BRAND.textPrimary};">
        ✨ As a parent/guardian you can:
      </p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:${BRAND.textMuted};line-height:1.8;">
        <li>Monitor real-time progress and mastery levels</li>
        <li>View detailed learning analytics and insights</li>
        <li>Manage course enrollments and settings</li>
        <li>Receive weekly progress digest emails</li>
      </ul>
    </div>

    <!-- Expiry notice -->
    <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:10px;padding:14px 18px;margin:24px 0;">
      <p style="margin:0;font-size:13px;color:#FBBF24;line-height:1.6;">
        <strong style="color:#F59E0B;">⏰ Expires:</strong> This invitation is valid until
        <strong>${expiryLabel}</strong>. After that, ${studentName} will need to send a new one.
      </p>
    </div>

    <!-- Fallback link -->
    <p style="margin:16px 0 0;font-size:12px;color:${BRAND.textMuted};line-height:1.6;">
      If the button above doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin:4px 0 0;font-size:12px;word-break:break-all;">
      <a href="${inviteUrl}" style="color:${BRAND.brandColor};text-decoration:none;">${inviteUrl}</a>
    </p>
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
    previewText: `${studentName} wants you to join EduChamp as their parent/guardian. Accept the invitation to monitor their learning.`,
    footerHtml,
  });

  const text = `${greeting}

${studentName}${gradeLabel} has invited you to join EduChamp as their parent or guardian${courseName ? ` — currently enrolled in ${courseName}` : ""}.

${isExistingUser ? "Since you already have an EduChamp account, click below to review the request." : "Click below to create your free parent account and start monitoring their learning."}

${ctaLabel}: ${inviteUrl}

As a parent/guardian you can:
• Monitor real-time progress and mastery levels
• View detailed learning analytics and insights
• Manage course enrollments and settings
• Receive weekly progress digest emails

This invitation expires on ${expiryLabel}.

Need help? Contact us at ${BRAND.supportEmail}
Visit us: ${BRAND.websiteUrl}

© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { html, text, subject };
}
