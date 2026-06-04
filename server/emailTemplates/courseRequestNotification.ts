/**
 * Email sent to a parent/guardian when their student requests a course.
 * Includes approve and reject action links.
 */
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

  const subject = `${data.studentName} has requested a new course — EduChamp`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 40px 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 15px; margin: 0; }
    .body { padding: 40px; }
    .greeting { font-size: 16px; color: #374151; margin: 0 0 24px; }
    .request-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0; }
    .request-card .label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px; }
    .request-card .value { font-size: 16px; color: #111827; font-weight: 600; margin: 0 0 16px; }
    .request-card .value:last-child { margin-bottom: 0; }
    .actions { display: flex; gap: 12px; margin: 32px 0; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; text-align: center; }
    .btn-approve { background: #10b981; color: #ffffff; }
    .btn-reject { background: #ffffff; color: #ef4444; border: 2px solid #ef4444; }
    .dashboard-link { text-align: center; margin: 24px 0 0; }
    .dashboard-link a { color: #6366f1; font-size: 14px; text-decoration: none; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 40px; text-align: center; }
    .footer p { font-size: 13px; color: #9ca3af; margin: 0; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>📚 Course Request</h1>
      <p>Your student wants to enroll in a new course</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${data.parentName},</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">
        <strong>${data.studentName}</strong> has requested access to a new course on EduChamp.
        As their parent or guardian, you can approve or reject this request below.
      </p>

      <div class="request-card">
        <p class="label">Student</p>
        <p class="value">${data.studentName}</p>
        <p class="label">Requested Course</p>
        <p class="value">${data.courseName}</p>
        <p class="label">Requested On</p>
        <p class="value" style="font-weight:400;font-size:14px;color:#6b7280;">${formattedDate}</p>
      </div>

      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:32px 0;">
        <tr>
          <td style="padding-right:8px;">
            <a href="${data.approveUrl}" class="btn btn-approve" style="display:block;padding:14px 0;background:#10b981;color:#ffffff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;text-align:center;">
              ✓ Approve Course
            </a>
          </td>
          <td style="padding-left:8px;">
            <a href="${data.rejectUrl}" class="btn btn-reject" style="display:block;padding:14px 0;background:#ffffff;color:#ef4444;border:2px solid #ef4444;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;text-align:center;">
              ✕ Reject Request
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 8px;">
        These links expire in 7 days. You can also manage requests from your dashboard.
      </p>

      <div class="dashboard-link">
        <a href="${data.dashboardUrl}">Open Parent Dashboard →</a>
      </div>
    </div>
    <div class="footer">
      <p>You received this email because you are a parent/guardian on <a href="https://educhamp.co">EduChamp</a>.</p>
      <p style="margin-top:8px;">Questions? <a href="mailto:support@educhamp.co">support@educhamp.co</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${data.parentName},

${data.studentName} has requested access to a new course on EduChamp.

COURSE REQUEST DETAILS
Student: ${data.studentName}
Course: ${data.courseName}
Requested: ${formattedDate}

APPROVE this request:
${data.approveUrl}

REJECT this request:
${data.rejectUrl}

These links expire in 7 days. You can also manage requests from your Parent Dashboard:
${data.dashboardUrl}

---
EduChamp — AI-Powered Pre-K–12 Learning
support@educhamp.co`;

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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: ${data.approved ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"}; padding: 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px; }
    .header p { color: rgba(255,255,255,0.9); font-size: 15px; margin: 0; }
    .body { padding: 40px; }
    .cta { display: block; margin: 32px auto 0; padding: 14px 32px; background: #6366f1; color: #ffffff; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; text-align: center; max-width: 220px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 40px; text-align: center; }
    .footer p { font-size: 13px; color: #9ca3af; margin: 0; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${data.approved ? "🎉 Course Approved!" : "📋 Request Update"}</h1>
      <p>${data.approved ? "You're all set to start learning" : "Your parent has reviewed your request"}</p>
    </div>
    <div class="body">
      <p style="font-size:16px;color:#374151;margin:0 0 16px;">Hi ${data.studentName},</p>
      ${data.approved
        ? `<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Great news! Your parent or guardian has <strong>approved</strong> your request to enroll in
            <strong>${data.courseName}</strong>. The course is now available on your dashboard.
          </p>`
        : `<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
            Your parent or guardian has reviewed your request to enroll in
            <strong>${data.courseName}</strong> and has decided not to approve it at this time.
          </p>
          ${data.rejectionReason ? `<p style="font-size:14px;color:#6b7280;background:#f9fafb;border-left:3px solid #e5e7eb;padding:12px 16px;border-radius:4px;margin:0 0 16px;">
            "${data.rejectionReason}"
          </p>` : ""}
          <p style="font-size:14px;color:#6b7280;margin:0 0 16px;">
            If you have questions, please speak with your parent or guardian directly.
          </p>`
      }
      <a href="${data.dashboardUrl}" class="cta">Go to Dashboard →</a>
    </div>
    <div class="footer">
      <p>EduChamp — AI-Powered Pre-K–12 Learning · <a href="mailto:support@educhamp.co">support@educhamp.co</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = data.approved
    ? `Hi ${data.studentName},\n\nYour request to enroll in "${data.courseName}" has been APPROVED by your parent or guardian.\n\nThe course is now available on your dashboard:\n${data.dashboardUrl}\n\n---\nEduChamp — support@educhamp.co`
    : `Hi ${data.studentName},\n\nYour request to enroll in "${data.courseName}" was not approved at this time.${data.rejectionReason ? `\n\nNote from your parent: "${data.rejectionReason}"` : ""}\n\nIf you have questions, please speak with your parent or guardian.\n\nDashboard: ${data.dashboardUrl}\n\n---\nEduChamp — support@educhamp.co`;

  return { subject, html, text };
}
