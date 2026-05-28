/**
 * inactivityNotification.ts
 * Email templates for student inactivity reminders sent to students and parents.
 * Supports 7-day, 14-day, 30-day, and manual notification tiers.
 */

export interface InactivityEmailParams {
  studentName: string;
  inactiveDays: number;
  lastActiveDate: string;
  resumeUrl: string;
  recipientType: "student" | "parent";
  parentName?: string; // used when recipientType === "parent"
}

export function buildInactivityEmail(params: InactivityEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { studentName, inactiveDays, lastActiveDate, resumeUrl, recipientType, parentName } = params;

  const tier = inactiveDays >= 30 ? "30-day" : inactiveDays >= 14 ? "14-day" : "7-day";
  const urgency = inactiveDays >= 30 ? "We miss you!" : inactiveDays >= 14 ? "It's been a while" : "Time to get back on track";

  const subject =
    recipientType === "student"
      ? `EduChamp — ${urgency}, ${studentName}! Resume your learning today`
      : `EduChamp — ${studentName} hasn't been active for ${inactiveDays} days`;

  const greeting =
    recipientType === "student"
      ? `Hi ${studentName},`
      : `Hi ${parentName ?? "there"},`;

  const intro =
    recipientType === "student"
      ? `We noticed you haven't logged into EduChamp in <strong>${inactiveDays} days</strong> (last active: ${lastActiveDate}). Your learning journey is waiting for you — every day counts!`
      : `This is a friendly reminder that <strong>${studentName}</strong> hasn't been active on EduChamp in <strong>${inactiveDays} days</strong> (last active: ${lastActiveDate}). Consistent practice is key to mastery — a gentle nudge can make all the difference.`;

  const cta =
    recipientType === "student"
      ? "Resume My Learning"
      : `View ${studentName}'s Dashboard`;

  const closing =
    recipientType === "student"
      ? "Keep up the great work — your future self will thank you!"
      : "Thank you for supporting your student's learning journey.";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">EduChamp</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">AI-Powered Adaptive Learning</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#1e1b4b;font-weight:600;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">${intro}</p>

              <!-- Stats card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:8px;margin:0 0 28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;padding:0 12px;">
                          <p style="margin:0;font-size:28px;font-weight:700;color:#4f46e5;">${inactiveDays}</p>
                          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Days Inactive</p>
                        </td>
                        <td style="text-align:center;padding:0 12px;border-left:1px solid #e0d9ff;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#374151;">${lastActiveDate}</p>
                          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Last Active</p>
                        </td>
                        <td style="text-align:center;padding:0 12px;border-left:1px solid #e0d9ff;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#374151;">${tier}</p>
                          <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Reminder</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);border-radius:8px;">
                    <a href="${resumeUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px;">${cta} →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">${closing}</p>
              <p style="margin:0;font-size:14px;color:#6b7280;">— The EduChamp Team</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">You are receiving this because you have an active EduChamp account.</p>
              <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} EduChamp. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting}

${
  recipientType === "student"
    ? `We noticed you haven't logged into EduChamp in ${inactiveDays} days (last active: ${lastActiveDate}).`
    : `${studentName} hasn't been active on EduChamp in ${inactiveDays} days (last active: ${lastActiveDate}).`
}

Days Inactive: ${inactiveDays}
Last Active: ${lastActiveDate}
Reminder Tier: ${tier}

${cta}: ${resumeUrl}

${closing}

— The EduChamp Team`;

  return { subject, html, text };
}
