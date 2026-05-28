/**
 * trialExpiry.ts — Branded trial expiry reminder email (T-3 days before trial ends)
 * Triggered by: customer.subscription.trial_will_end Stripe webhook event
 */

export interface TrialExpiryEmailData {
  userName: string;
  userEmail: string;
  planName: string;
  trialEndDate: Date;
  billingDate: Date;
  billingAmount: string; // e.g. "$14.99"
  billingInterval: string; // e.g. "month" | "year"
  dashboardUrl: string;
  billingUrl: string;
}

export function buildTrialExpiryEmail(data: TrialExpiryEmailData): { subject: string; html: string; text: string } {
  const firstName = data.userName.split(" ")[0] ?? data.userName;
  const trialEndStr = data.trialEndDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const billingDateStr = data.billingDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const intervalLabel = data.billingInterval === "year" ? "year" : "month";

  const subject = `Your EduChamp trial ends in 3 days — keep learning!`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">⚡ EduChamp</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;letter-spacing:0.5px;">AI-Powered Adaptive Learning</div>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:#fef3c7;padding:12px 40px;text-align:center;border-bottom:1px solid #fde68a;">
              <span style="font-size:14px;font-weight:600;color:#92400e;">⏰ Your free trial ends on ${trialEndStr}</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hi ${firstName},</p>

              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
                Your 14-day free trial of <strong>EduChamp ${data.planName}</strong> is coming to an end.
                To keep your student's learning momentum going — and avoid losing their progress and mastery scores —
                your subscription will automatically continue on <strong>${billingDateStr}</strong>.
              </p>

              <!-- Plan Summary Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Your Plan</div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:14px;color:#374151;padding:4px 0;">Plan</td>
                        <td style="font-size:14px;font-weight:600;color:#111827;text-align:right;">${data.planName}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#374151;padding:4px 0;">Trial ends</td>
                        <td style="font-size:14px;font-weight:600;color:#111827;text-align:right;">${trialEndStr}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#374151;padding:4px 0;">First charge</td>
                        <td style="font-size:14px;font-weight:600;color:#111827;text-align:right;">${billingDateStr}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;color:#374151;padding:4px 0;">Amount</td>
                        <td style="font-size:14px;font-weight:700;color:#4f46e5;text-align:right;">${data.billingAmount} / ${intervalLabel}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${data.dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.2px;">
                      Continue Learning →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Manage / Cancel -->
              <p style="font-size:13px;color:#6b7280;text-align:center;margin:0 0 24px;">
                Want to change or cancel your plan?
                <a href="${data.billingUrl}" style="color:#4f46e5;text-decoration:underline;">Manage your subscription</a>
              </p>

              <!-- What you keep -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-size:13px;font-weight:600;color:#166534;margin-bottom:10px;">✅ What stays with your subscription</div>
                    <ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;line-height:1.8;">
                      <li>All mastery scores and quiz history</li>
                      <li>Adaptive learning path and placement results</li>
                      <li>AI Tutor (EduBot) with full context awareness</li>
                      <li>Parent Dashboard and progress reports</li>
                      <li>Access to all ${data.planName.includes("School") ? "56+" : "12"} courses</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:0;">
                If you have any questions, reply to this email or visit our
                <a href="${data.dashboardUrl}" style="color:#4f46e5;text-decoration:none;">Help Center</a>.
                We're here to help your student succeed.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0 0 8px;">
                EduChamp · AI-Powered Adaptive Learning for Grades 3–12
              </p>
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                You're receiving this because you started a free trial.
                <a href="${data.billingUrl}" style="color:#6b7280;text-decoration:underline;">Manage subscription</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${firstName},

Your EduChamp ${data.planName} trial ends on ${trialEndStr}.

Your subscription will automatically continue on ${billingDateStr}.

PLAN SUMMARY
  Plan:        ${data.planName}
  Trial ends:  ${trialEndStr}
  First charge: ${billingDateStr}
  Amount:      ${data.billingAmount} / ${intervalLabel}

Continue learning: ${data.dashboardUrl}
Manage subscription: ${data.billingUrl}

If you have any questions, just reply to this email.

— The EduChamp Team`;

  return { subject, html, text };
}
