/**
 * EduChamp — Student Invite Accepted Email Template
 *
 * Sent to the parent when their child accepts a student invite token
 * and is successfully linked to the parent's account.
 */
export interface InviteAcceptedEmailData {
  parentName: string;
  studentName: string;
  studentEmail: string;
  acceptedAt: Date;
  dashboardUrl: string;
}

const BRAND_COLOR = "#4f46e5";
const BRAND_DARK = "#312e81";
const BG_COLOR = "#f8fafc";
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#0f172a";
const TEXT_MUTED = "#64748b";
const SUCCESS_COLOR = "#10b981";
const LOGO_URL = "https://educhamp.co/manus-storage/educhamp-logo-64_28201452.png";

export function buildInviteAcceptedEmail(data: InviteAcceptedEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { parentName, studentName, studentEmail, acceptedAt, dashboardUrl } = data;
  const parentFirst = parentName.split(" ")[0] || parentName;
  const studentFirst = studentName.split(" ")[0] || studentName;
  const dateStr = acceptedAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const subject = `🎉 ${studentFirst} accepted your invite and joined EduChamp!`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${BG_COLOR}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
    .card { background: ${CARD_BG}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND_COLOR} 100%); padding: 32px 40px; text-align: center; }
    .header img { height: 48px; width: auto; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 700; margin: 16px 0 4px; }
    .header p { color: rgba(255,255,255,0.75); font-size: 14px; margin: 0; }
    .body { padding: 40px; }
    .greeting { font-size: 18px; font-weight: 600; color: ${TEXT_PRIMARY}; margin-bottom: 16px; }
    .text { font-size: 15px; color: ${TEXT_MUTED}; line-height: 1.7; margin-bottom: 16px; }
    .success-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 18px; margin: 24px 0; text-align: center; }
    .success-box .icon { font-size: 32px; margin-bottom: 8px; }
    .success-box .title { font-size: 16px; font-weight: 700; color: #065f46; margin-bottom: 4px; }
    .success-box .detail { font-size: 13px; color: #047857; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-label { color: ${TEXT_MUTED}; }
    .info-value { color: ${TEXT_PRIMARY}; font-weight: 500; }
    .cta-btn { display: block; width: 100%; max-width: 320px; margin: 28px auto; padding: 14px 24px; background: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 10px; text-align: center; }
    .footer { padding: 24px 40px; border-top: 1px solid #f1f5f9; text-align: center; }
    .footer p { font-size: 12px; color: ${TEXT_MUTED}; margin: 4px 0; }
    .footer a { color: ${BRAND_COLOR}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <img src="${LOGO_URL}" alt="EduChamp" />
        <h1>Invite Accepted! 🎉</h1>
        <p>${studentFirst} is now connected to your account</p>
      </div>
      <div class="body">
        <p class="greeting">Hi ${parentFirst}!</p>
        <p class="text">
          Great news — <strong>${studentName}</strong> has accepted your invitation and is now linked to your EduChamp parent account!
        </p>

        <div class="success-box">
          <div class="icon">✅</div>
          <div class="title">Student Linked Successfully</div>
          <div class="detail">${studentFirst}'s progress will now appear in your Parent Dashboard</div>
        </div>

        <div style="margin: 24px 0;">
          <div class="info-row">
            <span class="info-label">Student</span>
            <span class="info-value">${studentName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email</span>
            <span class="info-value">${studentEmail}</span>
          </div>
          <div class="info-row" style="border-bottom: none;">
            <span class="info-label">Accepted</span>
            <span class="info-value">${dateStr}</span>
          </div>
        </div>

        <p class="text">
          You can now view ${studentFirst}'s learning progress, quiz scores, mastery levels, and more from your Parent Dashboard. You'll also receive weekly progress digests summarising their activity.
        </p>

        <a href="${dashboardUrl}" class="cta-btn">View Parent Dashboard</a>
      </div>
      <div class="footer">
        <p>Questions? Email us at <a href="mailto:support@educhamp.co">support@educhamp.co</a></p>
        <p style="margin-top:12px;">
          &copy; ${new Date().getFullYear()} EduChamp &middot; AI-Powered Learning Solution<br/>
          <a href="https://educhamp.co/privacy">Privacy Policy</a> &nbsp;&middot;&nbsp;
          <a href="https://educhamp.co/terms">Terms of Service</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${parentFirst}!

Great news — ${studentName} has accepted your invitation and is now linked to your EduChamp parent account!

Student: ${studentName}
Email: ${studentEmail}
Accepted: ${dateStr}

You can now view ${studentFirst}'s learning progress, quiz scores, mastery levels, and more from your Parent Dashboard. You'll also receive weekly progress digests summarising their activity.

View your Parent Dashboard: ${dashboardUrl}

Questions? support@educhamp.co
© ${new Date().getFullYear()} EduChamp — AI-Powered Learning Solution
`;

  return { html, text, subject };
}
