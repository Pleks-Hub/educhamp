/**
 * EduChamp — Student Account Setup Email Template
 *
 * Sent when a parent enrolls a student by email.
 * Contains a link for the student to create their password and access their account.
 */
export interface StudentSetupEmailData {
  studentName: string;
  parentName: string;
  setupUrl: string;
  personalNote?: string;
}

const BRAND_COLOR = "#4f46e5";
const BRAND_DARK = "#312e81";
const BG_COLOR = "#f8fafc";
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#0f172a";
const TEXT_MUTED = "#64748b";
const LOGO_URL = "https://educhamp.co/manus-storage/educhamp-logo-64_28201452.png";

export function buildStudentSetupEmail(data: StudentSetupEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { studentName, parentName, setupUrl, personalNote } = data;
  const firstName = studentName.split(" ")[0] || studentName;
  const subject = `Welcome to EduChamp! Set up your account, ${firstName}`;

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
    .cta-btn { display: block; width: 100%; max-width: 320px; margin: 28px auto; padding: 14px 24px; background: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 10px; text-align: center; }
    .info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 18px; margin: 24px 0; font-size: 13px; color: #1e40af; }
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
        <h1>Welcome to EduChamp! 🎓</h1>
        <p>Your learning journey starts here</p>
      </div>
      <div class="body">
        <p class="greeting">Hi ${firstName}!</p>
        <p class="text">
          Great news! <strong>${parentName}</strong> has enrolled you in EduChamp — an AI-powered learning platform
          designed to help you master your subjects at your own pace.
        </p>${personalNote ? `
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:14px 18px;margin:16px 0;font-size:14px;color:#92400e;">
          <strong>💬 A note from ${parentName}:</strong><br/>
          <em style="display:block;margin-top:6px;">${personalNote}</em>
        </div>` : ""}
        <p class="text">
          To get started, you need to create a password for your account. Click the button below to set up your login:
        </p>
        <a href="${setupUrl}" class="cta-btn">Create My Password & Sign In</a>
        <div class="info-box">
          <strong>💡 Tip:</strong> If you have an Apple device, you can also sign in using your Apple ID
          (as long as the email matches the one your parent registered). Just click "Sign in with Apple" on the login page.
        </div>
        <p class="text" style="font-size:13px;">
          This link expires in <strong>7 days</strong>. If it expires, ask your parent to resend it from their dashboard.<br/><br/>
          If the button doesn't work, copy and paste this link:<br/>
          <a href="${setupUrl}" style="color:${BRAND_COLOR}; word-break:break-all;">${setupUrl}</a>
        </p>
      </div>
      <div class="footer">
        <p>Questions? Email us at <a href="mailto:support@educhamp.co">support@educhamp.co</a></p>
        <p style="margin-top:12px;">
          © ${new Date().getFullYear()} EduChamp · AI-Powered Learning Solution<br/>
          <a href="https://educhamp.co/privacy">Privacy Policy</a> &nbsp;·&nbsp;
          <a href="https://educhamp.co/terms">Terms of Service</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${firstName}!

Great news! ${parentName} has enrolled you in EduChamp — an AI-powered learning platform.
${personalNote ? `\nA note from ${parentName}: "${personalNote}"\n` : ""}
To get started, create your password here (link valid for 7 days):
${setupUrl}

Tip: If you have an Apple device, you can also sign in using your Apple ID (as long as the email matches).

Questions? support@educhamp.co
© ${new Date().getFullYear()} EduChamp — AI-Powered Learning Solution
`;

  return { html, text, subject };
}
