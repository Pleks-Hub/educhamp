/**
 * Email sent to a parent/guardian when their student requests a course.
 * Includes approve and reject action links.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface CourseRequestNotificationData {
  parentName: string;
  studentName: string;
  courseName: string;
  requestedAt: Date;
  approveUrl: string;
  rejectUrl: string;
  dashboardUrl: string;
}

export function buildCourseRequestNotificationEmail(data: CourseRequestNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const formattedDate = data.requestedAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parentFirst = data.parentName.split(" ")[0] || data.parentName;
  const subject = `${data.studentName} has requested a new course — EduChamp`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);text-align:center;line-height:64px;">
        <span style="font-size:28px;">📚</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      New Course Request
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      ${data.studentName} wants to enroll in a new course
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${parentFirst},
    </p>

    <!-- Body text -->
    <p style="margin:0 0 20px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      <strong style="color:${BRAND.textPrimary};">${data.studentName}</strong> has requested access to a new course on EduChamp.
      Please review the details below and approve or reject the request.
    </p>

    <!-- Request details box -->
    <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:18px;margin:20px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Student:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${data.studentName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Course:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${data.courseName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Requested:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};text-align:right;">${formattedDate}</td>
        </tr>
      </table>
    </div>

    <!-- Action buttons -->
    <div style="text-align:center;margin:24px 0;">
      <a href="${data.approveUrl}" style="display:inline-block;padding:12px 28px;background:#10b981;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-right:12px;">
        ✓ Approve
      </a>
      <a href="${data.rejectUrl}" style="display:inline-block;padding:12px 28px;background:#ef4444;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
        ✗ Reject
      </a>
    </div>

    <!-- Note -->
    <p style="margin:16px 0 0;font-size:12px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
      These action links expire in 7 days. You can also manage requests from your
      <a href="${data.dashboardUrl}" style="color:${BRAND.brandColor};text-decoration:none;">Parent Dashboard</a>.
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
    </p>
    <p style="margin:0;font-size:11px;color:${BRAND.textMuted};opacity:0.7;">
      © ${new Date().getFullYear()} EduChamp · AI-Powered Adaptive Learning
    </p>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: `${data.studentName} requested access to "${data.courseName}". Approve or reject from this email.`,
    footerHtml,
  });

  const text = `Hi ${parentFirst},

${data.studentName} has requested access to a new course on EduChamp.

COURSE REQUEST DETAILS:
Student: ${data.studentName}
Course: ${data.courseName}
Requested: ${formattedDate}

APPROVE this request: ${data.approveUrl}
REJECT this request: ${data.rejectUrl}

These links expire in 7 days. You can also manage requests from your Parent Dashboard:
${data.dashboardUrl}

Need help? Contact us at ${BRAND.supportEmail}
© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { subject, html, text };
}

/**
 * Email sent to a student when their course request is approved or rejected.
 */
export interface CourseRequestOutcomeData {
  studentName: string;
  courseName: string;
  approved: boolean;
  rejectionReason?: string;
  dashboardUrl: string;
}

export function buildCourseRequestOutcomeEmail(data: CourseRequestOutcomeData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = data.approved
    ? `Your course request was approved — EduChamp`
    : `Course request update — EduChamp`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,${data.approved ? "#10b981,#059669" : "#f59e0b,#d97706"});text-align:center;line-height:64px;">
        <span style="font-size:28px;">${data.approved ? "🎉" : "📋"}</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      ${data.approved ? "Course Approved!" : "Request Update"}
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      ${data.approved ? "You're all set to start learning" : "Your parent has reviewed your request"}
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${data.studentName},
    </p>

    <!-- Body text -->
    ${data.approved ? `
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Great news! Your parent or guardian has <strong style="color:#10b981;">approved</strong> your request to enroll in
      <strong style="color:${BRAND.textPrimary};">${data.courseName}</strong>. The course is now available on your dashboard.
    </p>
    ` : `
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Your parent or guardian has reviewed your request to enroll in
      <strong style="color:${BRAND.textPrimary};">${data.courseName}</strong> and has decided not to approve it at this time.
    </p>
    ${data.rejectionReason ? `
    <div style="background:#f9fafb;border-left:3px solid #e5e7eb;padding:12px 16px;border-radius:4px;margin:0 0 16px;">
      <p style="margin:0;font-size:14px;color:${BRAND.textMuted};font-style:italic;">"${data.rejectionReason}"</p>
    </div>
    ` : ""}
    <p style="margin:0 0 16px;font-size:14px;color:${BRAND.textMuted};">
      If you have questions, please speak with your parent or guardian directly.
    </p>
    `}

    <!-- CTA Button -->
    <div style="text-align:center;margin-top:24px;">
      ${ctaButton("Go to Dashboard", data.dashboardUrl)}
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
    previewText: data.approved
      ? `Your request for "${data.courseName}" was approved! Start learning now.`
      : `Update on your "${data.courseName}" course request.`,
    footerHtml,
  });

  const text = data.approved
    ? `Hi ${data.studentName},\n\nYour request to enroll in "${data.courseName}" has been APPROVED by your parent or guardian.\n\nThe course is now available on your dashboard:\n${data.dashboardUrl}\n\n© ${new Date().getFullYear()} EduChamp — ${BRAND.supportEmail}`
    : `Hi ${data.studentName},\n\nYour request to enroll in "${data.courseName}" was not approved at this time.${data.rejectionReason ? `\n\nNote from your parent: "${data.rejectionReason}"` : ""}\n\nIf you have questions, please speak with your parent or guardian.\n\nDashboard: ${data.dashboardUrl}\n\n© ${new Date().getFullYear()} EduChamp — ${BRAND.supportEmail}`;

  return { subject, html, text };
}
