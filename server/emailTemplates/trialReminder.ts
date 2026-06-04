/**
 * EduChamp — Trial Ending Reminder Email Template
 *
 * Sent 3 days before a user's free trial expires.
 * Informs the user of the upcoming charge and provides a cancel link.
 */

export interface TrialReminderEmailData {
  /** User's full name */
  userName: string;
  /** User's email address */
  userEmail: string;
  /** Plan name, e.g. "Family Plan" or "Premium Family" */
  planName: string;
  /** Monthly price string, e.g. "$19.99/mo" */
  planPrice: string;
  /** Trial end date */
  trialEndDate: Date;
  /** Stripe Customer Portal URL for cancellation */
  billingPortalUrl: string;
}

const BRAND_COLOR = "#4f46e5"; // indigo-600
const BRAND_DARK = "#312e81";  // indigo-900
const ACCENT_COLOR = "#f59e0b"; // amber-500 — urgency
const BG_COLOR = "#f8fafc";    // slate-50
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#0f172a"; // slate-900
const TEXT_MUTED = "#64748b";   // slate-500
const LOGO_URL = "https://educhamp.co/manus-storage/educhamp-logo-64_28201452.png";

export function buildTrialReminderEmail(data: TrialReminderEmailData): {
  html: string;
  text: string;
  subject: string;
} {
  const { userName, planName, planPrice, trialEndDate, billingPortalUrl } = data;

  const firstName = userName.split(" ")[0] || userName;
  const trialEndLabel = trialEndDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // First charge date = trial end date (Stripe charges on trial_end)
  const chargeLabel = trialEndLabel;

  const subject = `Your EduChamp free trial ends in 3 days — ${planName}`;

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
    .countdown-box { background: linear-gradient(135deg, #fef3c7, #fde68a); border: 2px solid ${ACCENT_COLOR}; border-radius: 12px; padding: 20px 24px; margin: 24px 0; text-align: center; }
    .countdown-box .days { font-size: 48px; font-weight: 900; color: #92400e; line-height: 1; }
    .countdown-box .days-label { font-size: 14px; font-weight: 600; color: #b45309; margin-top: 4px; }
    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 13px; color: ${TEXT_MUTED}; font-weight: 500; }
    .info-value { font-size: 14px; color: ${TEXT_PRIMARY}; font-weight: 600; }
    .cta-btn { display: block; width: 100%; max-width: 320px; margin: 28px auto 0; padding: 14px 24px; background: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 10px; text-align: center; }
    .cancel-link { display: block; text-align: center; margin-top: 16px; font-size: 13px; color: ${TEXT_MUTED}; text-decoration: underline; }
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
        <h1>Your Free Trial Ends Soon</h1>
        <p>Action may be required before ${trialEndLabel}</p>
      </div>

      <!-- Body -->
      <div class="body">
        <p class="greeting">Hi ${firstName},</p>
        <p class="text">
          Thank you for trying EduChamp! Your 14-day free trial is coming to an end.
          Here's a quick summary of what happens next:
        </p>

        <!-- Countdown -->
        <div class="countdown-box">
          <div class="days">3</div>
          <div class="days-label">DAYS REMAINING IN YOUR FREE TRIAL</div>
        </div>

        <!-- Plan details -->
        <div style="background:#f8fafc; border-radius:10px; padding:16px 20px; margin:24px 0;">
          <div class="info-row">
            <span class="info-label">Plan</span>
            <span class="info-value">${planName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Trial ends</span>
            <span class="info-value">${trialEndLabel}</span>
          </div>
          <div class="info-row">
            <span class="info-label">First charge date</span>
            <span class="info-value">${chargeLabel}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Amount</span>
            <span class="info-value">${planPrice}</span>
          </div>
        </div>

        <p class="text">
          If you'd like to continue enjoying unlimited AI tutoring, all 70+ courses (Pre-K through Grade 12), and the parent dashboard,
          no action is needed — your subscription will start automatically.
        </p>
        <p class="text">
          If you decide EduChamp isn't right for you right now, you can cancel anytime before your trial ends
          with no charge.
        </p>

        <!-- CTA -->
        <a href="https://educhamp.co/billing" class="cta-btn">
          View My Subscription
        </a>
        <a href="${billingPortalUrl}" class="cancel-link">
          Cancel or manage my subscription
        </a>
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

Your EduChamp free trial ends in 3 days.

Plan: ${planName}
Trial ends: ${trialEndLabel}
First charge: ${chargeLabel}
Amount: ${planPrice}

If you'd like to continue, no action is needed — your subscription starts automatically on ${chargeLabel}.

To cancel before being charged, visit: ${billingPortalUrl}

View your subscription: https://educhamp.co/billing

Questions? support@educhamp.co
© ${new Date().getFullYear()} EduChamp — AI-Powered Learning Solution
`;

  return { html, text, subject };
}
