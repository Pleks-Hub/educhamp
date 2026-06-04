/**
 * flagResolutionNotification.ts
 * Email sent to a student when an admin resolves or dismisses their flagged question.
 */

export interface FlagResolutionEmailData {
  studentName: string;
  status: "resolved" | "dismissed";
  questionText: string;
  questionType: "quiz" | "diagnostic";
  reason: string;
  reviewNote?: string;
  dashboardUrl: string;
}

export function buildFlagResolutionEmail(data: FlagResolutionEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const isResolved = data.status === "resolved";
  const subject = isResolved
    ? `Your question report was resolved — EduChamp`
    : `Your question report has been reviewed — EduChamp`;

  const headerGradient = isResolved
    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
    : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)";

  const headerEmoji = isResolved ? "✅" : "📋";
  const headerTitle = isResolved ? "Report Resolved" : "Report Reviewed";
  const headerSubtitle = isResolved
    ? "Thank you for helping improve EduChamp"
    : "Our team has reviewed your report";

  const truncatedQuestion =
    data.questionText.length > 120
      ? data.questionText.slice(0, 120) + "…"
      : data.questionText;

  const outcomeText = isResolved
    ? `Our team has reviewed your report and <strong>resolved the issue</strong> with this question. Thank you for helping us maintain the quality of our content.`
    : `Our team has reviewed your report and determined that the question is accurate and appropriate for this course. No changes will be made at this time.`;

  const noteHtml = data.reviewNote
    ? `<div style="background:#f9fafb;border-left:3px solid #6366f1;padding:12px 16px;border-radius:4px;margin:16px 0;">
        <p style="font-size:13px;color:#6b7280;margin:0 0 4px;font-weight:600;">Note from our team:</p>
        <p style="font-size:14px;color:#374151;margin:0;">${data.reviewNote}</p>
      </div>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: ${headerGradient}; padding: 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px; }
    .header p { color: rgba(255,255,255,0.9); font-size: 15px; margin: 0; }
    .body { padding: 40px; }
    .question-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
    .question-box p { font-size: 14px; color: #374151; margin: 0; font-style: italic; }
    .cta { display: block; margin: 32px auto 0; padding: 14px 32px; background: #6366f1; color: #ffffff; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; text-align: center; max-width: 220px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 40px; text-align: center; }
    .footer p { font-size: 13px; color: #9ca3af; margin: 0; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${headerEmoji} ${headerTitle}</h1>
      <p>${headerSubtitle}</p>
    </div>
    <div class="body">
      <p style="font-size:16px;color:#374151;margin:0 0 16px;">Hi ${data.studentName},</p>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
        ${outcomeText}
      </p>
      <p style="font-size:14px;color:#6b7280;margin:0 0 8px;">Your report was about this ${data.questionType} question:</p>
      <div class="question-box">
        <p>"${truncatedQuestion}"</p>
      </div>
      <p style="font-size:13px;color:#9ca3af;margin:0 0 16px;">Reason you reported: <em>${data.reason}</em></p>
      ${noteHtml}
      <a href="${data.dashboardUrl}" class="cta">Back to Dashboard →</a>
    </div>
    <div class="footer">
      <p>EduChamp — AI-Powered Pre-K–12 Learning · <a href="mailto:support@educhamp.co">support@educhamp.co</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = isResolved
    ? `Hi ${data.studentName},\n\nYour report about a ${data.questionType} question has been RESOLVED by our team.\n\nReported question: "${truncatedQuestion}"\nYour reason: ${data.reason}${data.reviewNote ? `\n\nNote from our team: ${data.reviewNote}` : ""}\n\nThank you for helping us improve EduChamp!\n\nDashboard: ${data.dashboardUrl}\n\n---\nEduChamp — support@educhamp.co`
    : `Hi ${data.studentName},\n\nOur team has reviewed your report about a ${data.questionType} question and determined no changes are needed at this time.\n\nReported question: "${truncatedQuestion}"\nYour reason: ${data.reason}${data.reviewNote ? `\n\nNote from our team: ${data.reviewNote}` : ""}\n\nDashboard: ${data.dashboardUrl}\n\n---\nEduChamp — support@educhamp.co`;

  return { subject, html, text };
}
