/**
 * EduChamp — Parent/Guardian Invitation Email Template
 *
 * Generates a fully branded HTML email for the student-to-parent invitation flow.
 * Falls back gracefully to plain text for email clients that don't render HTML.
 */

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

const BRAND_COLOR = "#4f46e5"; // indigo-600
const BRAND_DARK = "#312e81";  // indigo-900
const ACCENT_COLOR = "#10b981"; // emerald-500
const BG_COLOR = "#f8fafc";    // slate-50
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#0f172a"; // slate-900
const TEXT_MUTED = "#64748b";   // slate-500
const LOGO_URL = "https://educhamp.manus.space/manus-storage/educhamp-logo-64_28201452.png";

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
  const courseLabel = courseName ? ` — currently enrolled in <strong>${courseName}</strong>` : "";
  const expiryLabel = expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const ctaLabel = isExistingUser ? "View Student Request in Portal" : "Accept Invitation & Create Account";
  const actionDescription = isExistingUser
    ? `Since you already have an EduChamp account, simply click below to review and approve the request in your Parent Portal.`
    : `Click the button below to create your free EduChamp parent account, review the request, and start monitoring ${studentName}'s learning journey.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EduChamp — Parent Invitation</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <!-- Email wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${BG_COLOR};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${LOGO_URL}" alt="EduChamp Logo" width="40" height="40" style="display:block;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:700;color:${BRAND_COLOR};letter-spacing:-0.5px;">EduChamp</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── HERO CARD ── -->
          <tr>
            <td style="background-color:${CARD_BG};border-radius:16px;padding:40px 40px 32px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Invitation badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <span style="display:inline-block;background-color:#eef2ff;color:${BRAND_COLOR};font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;padding:6px 16px;border-radius:100px;">Parent / Guardian Invitation</span>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};line-height:1.3;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:16px;color:${TEXT_MUTED};line-height:1.6;">
                Your student <strong style="color:${TEXT_PRIMARY};">${studentName}</strong>${gradeLabel} has invited you to join <strong style="color:${BRAND_COLOR};">EduChamp</strong> as their parent or guardian${courseLabel}.
              </p>

              <!-- Student details card -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;">Student Details</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding:4px 0;font-size:14px;color:${TEXT_MUTED};width:40%;">Student Name</td>
                        <td style="padding:4px 0;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${studentName}</td>
                      </tr>
                      ${studentGrade ? `<tr>
                        <td style="padding:4px 0;font-size:14px;color:${TEXT_MUTED};">Grade Level</td>
                        <td style="padding:4px 0;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${studentGrade}</td>
                      </tr>` : ""}
                      ${courseName ? `<tr>
                        <td style="padding:4px 0;font-size:14px;color:${TEXT_MUTED};">Active Course</td>
                        <td style="padding:4px 0;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${courseName}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding:4px 0;font-size:14px;color:${TEXT_MUTED};">Invitation Expires</td>
                        <td style="padding:4px 0;font-size:14px;font-weight:600;color:#dc2626;">${expiryLabel}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Why join section -->
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">Why join EduChamp?</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                ${[
                  ["📊", "Real-time progress tracking", "Monitor your student's mastery scores, quiz results, and learning milestones in real time."],
                  ["🤖", "AI-powered personalised learning", "EduBot, our AI tutor, adapts to your student's pace and learning style across 70+ courses (Pre-K through Grade 12)."],
                  ["🎯", "Goal setting & insights", "Set learning goals, review skill gap analysis, and receive AI-generated progress summaries."],
                  ["🔔", "Instant notifications", "Get notified when your student completes a quiz, achieves mastery, or needs extra support."],
                ].map(([icon, title, desc]) => `
                <tr>
                  <td style="padding:6px 0;vertical-align:top;width:32px;font-size:18px;">${icon}</td>
                  <td style="padding:6px 0;vertical-align:top;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">${title}</p>
                    <p style="margin:2px 0 0;font-size:13px;color:${TEXT_MUTED};line-height:1.5;">${desc}</p>
                  </td>
                </tr>`).join("")}
              </table>

              <!-- What to do next -->
              <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${TEXT_PRIMARY};">What happens next?</p>
              <p style="margin:0 0 24px;font-size:14px;color:${TEXT_MUTED};line-height:1.6;">${actionDescription}</p>

              <!-- Steps -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
                ${(isExistingUser ? [
                  "Sign in to your EduChamp account",
                  `Review ${studentName}'s enrollment request in your Parent Portal`,
                  "Accept or reject the request",
                  "Start monitoring their learning journey",
                ] : [
                  "Click the button below to open the invitation",
                  "Create your free EduChamp parent account",
                  `Review ${studentName}'s enrollment details`,
                  "Accept the request and complete onboarding",
                  "Access your Parent Dashboard to track progress",
                ]).map((step, i) => `
                <tr>
                  <td style="padding:5px 0;vertical-align:top;width:28px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background-color:${BRAND_COLOR};color:#fff;border-radius:50%;font-size:11px;font-weight:700;">${i + 1}</span>
                  </td>
                  <td style="padding:5px 0;font-size:14px;color:${TEXT_PRIMARY};line-height:1.5;">${step}</td>
                </tr>`).join("")}
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" target="_blank" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                      ${ctaLabel} →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Plain URL fallback -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:12px;color:${TEXT_MUTED};">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="margin:0;font-size:12px;color:${BRAND_COLOR};word-break:break-all;">${inviteUrl}</p>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <p style="margin:0;font-size:13px;color:${TEXT_MUTED};text-align:center;">
                ⏰ This invitation expires on <strong>${expiryLabel}</strong>. If it expires, ask ${studentName} to send a new invitation from their EduChamp dashboard.
              </p>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:24px 0 8px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:${TEXT_MUTED};">
                You received this email because a student on EduChamp invited you as their parent or guardian.
              </p>
              <p style="margin:0;font-size:13px;color:${TEXT_MUTED};">
                If you don't recognise this student, you can safely ignore this email.
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} EduChamp. All rights reserved. &nbsp;|&nbsp;
                <a href="https://educhamp.app" style="color:${BRAND_COLOR};text-decoration:none;">educhamp.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `
EduChamp — Parent/Guardian Invitation
======================================

${greeting}

${studentName}${gradeLabel} has invited you to join EduChamp as their parent or guardian${courseName ? ` (Course: ${courseName})` : ""}.

STUDENT DETAILS
---------------
Student Name : ${studentName}
${studentGrade ? `Grade Level  : ${studentGrade}\n` : ""}${courseName ? `Active Course : ${courseName}\n` : ""}Expires      : ${expiryLabel}

WHY JOIN EDUCHAMP?
------------------
• Real-time progress tracking — monitor mastery scores, quiz results, and milestones
• AI-powered personalised learning — EduBot adapts to your student's pace across 70+ courses (Pre-K through Grade 12)
• Goal setting & insights — set goals, review skill gaps, and get AI progress summaries
• Instant notifications — get notified on quiz completions, mastery achievements, and more

WHAT TO DO NEXT
---------------
${actionDescription}

ACCEPT YOUR INVITATION
----------------------
${inviteUrl}

(Copy and paste the link above into your browser if clicking doesn't work.)

This invitation expires on ${expiryLabel}.
If it expires, ask ${studentName} to send a new invitation from their EduChamp dashboard.

---
You received this email because a student on EduChamp invited you as their parent or guardian.
If you don't recognise this student, you can safely ignore this email.

© ${new Date().getFullYear()} EduChamp | https://educhamp.app
`.trim();

  const subject = data.isExistingUser
    ? `${data.studentName} has invited you to their EduChamp learning journey`
    : `You've been invited to join EduChamp — ${data.studentName} needs your approval`;
  return { html, text, subject };
}
