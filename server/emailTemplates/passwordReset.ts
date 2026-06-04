/**
 * EduChamp — Password Reset Email Template
 *
 * Sent when a user requests a password reset link.
 * The link expires in 1 hour.
 */

export interface PasswordResetEmailData {
  /** User's full name */
  userName: string;
  /** Password reset URL (includes token) */
  resetUrl: string;
}

const BRAND_COLOR = "#4f46e5"; // indigo-600
const BRAND_DARK = "#312e81";  // indigo-900
const BG_COLOR = "#f8fafc";    // slate-50
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#0f172a"; // slate-900
const TEXT_MUTED = "#64748b";   // slate-500
const LOGO_URL = "https://educhamp.co/manus-storage/educhamp-logo-64_28201452.png";

export function buildPasswordResetEmail(data: PasswordResetEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { userName, resetUrl } = data;
  const firstName = userName.split(" ")[0] || userName;
  const subject = "Reset your EduChamp password";

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
    .warning-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 10px; padding: 14px 18px; margin: 24px 0; font-size: 13px; color: #92400e; }
    .footer { padding: 24px 40px; border-top: 1px solid #f1f5f9; text-align: center; }
    .footer p { font-size: 12px; color: ${TEXT_MUTED}; margin: 4px 0; }
    .footer a { color: ${BRAND_COLOR}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <!-- Header -->
      <div class="header">
        <img src="${LOGO_URL}" alt="EduChamp" />
        <h1>Password Reset Request</h1>
        <p>Click the button below to set a new password</p>
      </div>

      <!-- Body -->
      <div class="body">
        <p class="greeting">Hi ${firstName},</p>
        <p class="text">
          We received a request to reset the password for your EduChamp account.
          Click the button below to choose a new password. This link is valid for <strong>1 hour</strong>.
        </p>

        <a href="${resetUrl}" class="cta-btn">Reset My Password</a>

        <div class="warning-box">
          <strong>Didn't request this?</strong> If you didn't ask to reset your password, you can safely ignore this email.
          Your account is still secure and your password has not been changed.
        </div>

        <p class="text" style="font-size:13px;">
          If the button above doesn't work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color:${BRAND_COLOR}; word-break:break-all;">${resetUrl}</a>
        </p>
      </div>

      <!-- Footer -->
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

  const text = `Hi ${firstName},

We received a request to reset the password for your EduChamp account.

Reset your password here (link valid for 1 hour):
${resetUrl}

If you didn't request this, you can safely ignore this email. Your account is still secure.

Questions? support@educhamp.co
© ${new Date().getFullYear()} EduChamp — AI-Powered Learning Solution
`;

  return { html, text, subject };
}
