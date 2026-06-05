/**
 * Email sent to parents who have unreviewed course requests older than 24 hours.
 * Summarizes all pending requests with a CTA to the parent dashboard.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

export interface PendingRequestItem {
  studentName: string;
  courseName: string;
  requestedAt: Date;
}

export interface PendingCourseRequestDigestData {
  parentName: string;
  requests: PendingRequestItem[];
  dashboardUrl: string;
}

export function buildPendingCourseRequestDigestEmail(data: PendingCourseRequestDigestData): {
  subject: string;
  html: string;
  text: string;
} {
  const count = data.requests.length;
  const subject = `${count} pending course request${count > 1 ? "s" : ""} awaiting your review — EduChamp`;

  // Build request rows
  const requestRows = data.requests
    .map((r) => {
      const timeAgo = getTimeAgo(r.requestedAt);
      return `<tr>
        <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.borderColor};color:${BRAND.textPrimary};font-size:14px;">
          ${r.studentName}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.borderColor};color:${BRAND.textPrimary};font-size:14px;">
          ${r.courseName}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid ${BRAND.borderColor};color:${BRAND.textMuted};font-size:13px;">
          ${timeAgo}
        </td>
      </tr>`;
    })
    .join("");

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};">
      Pending Course Requests
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.5;">
      Hi ${data.parentName}, you have <strong style="color:${BRAND.brandColor};">${count}</strong> course request${count > 1 ? "s" : ""} 
      from your student${count > 1 ? "s" : ""} that ${count > 1 ? "have" : "has"} been waiting for more than 24 hours.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" 
      style="border:1px solid ${BRAND.borderColor};border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <thead>
        <tr style="background:${BRAND.bgColor};">
          <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.5px;">Student</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.5px;">Course</th>
          <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:${BRAND.textMuted};text-transform:uppercase;letter-spacing:0.5px;">Requested</th>
        </tr>
      </thead>
      <tbody>
        ${requestRows}
      </tbody>
    </table>
    <p style="margin:0 0 4px;font-size:14px;color:${BRAND.textMuted};line-height:1.5;">
      Review and approve or deny these requests from your Parent Dashboard.
    </p>
    ${ctaButton("Review Requests", data.dashboardUrl)}
    <p style="margin:16px 0 0;font-size:12px;color:${BRAND.textMuted};">
      You'll receive this reminder daily until all pending requests are resolved.
    </p>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: `${count} course request${count > 1 ? "s" : ""} awaiting your review`,
  });

  // Plain text version
  const textLines = [
    `Hi ${data.parentName},`,
    "",
    `You have ${count} pending course request${count > 1 ? "s" : ""} awaiting your review:`,
    "",
    ...data.requests.map(
      (r) => `• ${r.studentName} requested "${r.courseName}" (${getTimeAgo(r.requestedAt)})`
    ),
    "",
    `Review them at: ${data.dashboardUrl}`,
    "",
    "— EduChamp Team",
  ];
  const text = textLines.join("\n");

  return { subject, html, text };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}
