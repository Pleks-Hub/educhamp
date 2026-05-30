/**
 * EduChamp — COPPA Parental Consent Request Email Template
 *
 * Sent to a parent/guardian when a student aged ≤ 12 (Grade 6 and below)
 * registers and the COPPA_GATE_ENABLED platform setting is active.
 */
import { BRAND, wrapEmailHtml } from "./emailBase";

export interface CoppaConsentEmailData {
  studentName: string;
  studentGrade?: string;
  parentName?: string;
  parentEmail: string;
  approveUrl: string;
  denyUrl: string;
  expiresAt: Date;
}

export function buildCoppaConsentEmail(data: CoppaConsentEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { studentName, studentGrade, parentName, approveUrl, denyUrl, expiresAt } = data;
  const greeting = parentName ? `Hi ${parentName},` : "Hello,";
  const gradeLabel = studentGrade ? ` (${studentGrade})` : "";
  const expiryLabel = expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subject = `Action Required: Approve ${studentName}'s EduChamp Account`;

  const bodyHtml = `
    <h2 style="color:${BRAND.textPrimary};font-size:22px;font-weight:700;margin:0 0 16px;">
      Parental Consent Required
    </h2>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.6;margin:0 0 16px;">
      ${greeting}
    </p>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.6;margin:0 0 16px;">
      <strong style="color:${BRAND.textPrimary};">${studentName}</strong>${gradeLabel} has created an account on
      <strong style="color:${BRAND.textPrimary};">EduChamp</strong>, an AI-powered learning platform.
      Because ${studentName} is in Grade 6 or below, we are required by the
      <strong style="color:${BRAND.textPrimary};">Children's Online Privacy Protection Act (COPPA)</strong>
      to obtain a parent or guardian's consent before they can access the platform.
    </p>
    <p style="color:${BRAND.textMuted};font-size:15px;line-height:1.6;margin:0 0 24px;">
      Please review and respond to this request. This link expires on
      <strong style="color:${BRAND.textPrimary};">${expiryLabel}</strong>.
    </p>

    <!-- Approve CTA -->
    <div style="text-align:center;margin:0 0 16px;">
      <a href="${approveUrl}"
         style="display:inline-block;background:${BRAND.brandColor};color:#fff;text-decoration:none;
                font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
        ✅ Approve Access
      </a>
    </div>

    <!-- Deny CTA -->
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${denyUrl}"
         style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;
                font-size:14px;font-weight:600;padding:10px 28px;border-radius:8px;">
        ❌ Deny Access
      </a>
    </div>

    <div style="background:${BRAND.cardBg};border:1px solid ${BRAND.borderColor};border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="color:${BRAND.textMuted};font-size:13px;line-height:1.6;margin:0;">
        <strong style="color:${BRAND.textPrimary};">What EduChamp collects:</strong> name, grade level, school type,
        and learning activity data (quiz scores, lesson progress). We do not sell personal data.
        Full privacy policy: <a href="${BRAND.websiteUrl}/privacy" style="color:${BRAND.brandColor};">${BRAND.websiteUrl}/privacy</a>
      </p>
    </div>

    <p style="color:${BRAND.textMuted};font-size:13px;line-height:1.6;margin:0 0 8px;">
      If you did not expect this email, you can safely ignore it. ${studentName}'s account will
      remain locked until consent is granted.
    </p>
    <p style="color:${BRAND.textMuted};font-size:13px;line-height:1.6;margin:0;">
      Questions? Contact us at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.brandColor};">${BRAND.supportEmail}</a>
    </p>
  `;

  const html = wrapEmailHtml({ bodyHtml, previewText: `Consent required for ${studentName}'s EduChamp account` });

  const text = `
${greeting}

${studentName}${gradeLabel} has created an EduChamp account. Because they are in Grade 6 or below, we need your consent (COPPA).

APPROVE: ${approveUrl}
DENY: ${denyUrl}

This link expires on ${expiryLabel}.

Questions? ${BRAND.supportEmail}
  `.trim();

  return { html, text, subject };
}
