/**
 * trialWelcome.ts
 * Branded "Your 14-day trial has started" onboarding email.
 * Sent immediately after checkout.session.completed for new trial subscriptions.
 */

export interface TrialWelcomeEmailData {
  userName: string;
  userEmail: string;
  planName: string;
  trialEndDate: string; // e.g. "June 11, 2026"
  firstChargeDate: string; // same as trialEndDate
  firstChargeAmount: string; // e.g. "$19.99"
  dashboardUrl: string;
  billingPortalUrl?: string;
}

export function buildTrialWelcomeEmail(data: TrialWelcomeEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your 14-day EduChamp trial has started — here's how to get the most out of it`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4338ca 0%,#6366f1 100%);padding:40px 40px 32px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 16px;">
                    <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">⚡ EduChamp</span>
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 8px;line-height:1.3;">
                Your free trial has started! 🎉
              </h1>
              <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">
                Welcome to ${data.planName} — 14 days, full access, no charge today.
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="color:#1e293b;font-size:16px;margin:0 0 16px;">Hi ${data.userName},</p>
              <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
                You're all set. Your <strong>${data.planName}</strong> trial is active and you have full access to everything EduChamp offers — AI tutoring, adaptive quizzes, mastery tracking, and more.
              </p>
            </td>
          </tr>

          <!-- Trial info card -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#0369a1;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Trial period</span><br/>
                          <span style="color:#0c4a6e;font-size:15px;font-weight:600;">Today → ${data.trialEndDate}</span>
                        </td>
                        <td style="padding:6px 0;text-align:right;">
                          <span style="color:#0369a1;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">First charge</span><br/>
                          <span style="color:#0c4a6e;font-size:15px;font-weight:600;">${data.firstChargeAmount} on ${data.firstChargeDate}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3 Quick-Start Tips -->
          <tr>
            <td style="padding:0 40px 24px;">
              <h2 style="color:#1e293b;font-size:18px;font-weight:700;margin:0 0 16px;">3 things to do in your first 24 hours</h2>

              <!-- Tip 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="width:44px;vertical-align:top;padding-top:2px;">
                    <div style="width:36px;height:36px;background:#eef2ff;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">📊</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="color:#1e293b;font-size:15px;font-weight:600;margin:0 0 4px;">Take the Diagnostic Test</p>
                    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">
                      A 20-minute adaptive placement test builds your personalised learning path. Go to <strong>Diagnostic</strong> in the sidebar.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Tip 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="width:44px;vertical-align:top;padding-top:2px;">
                    <div style="width:36px;height:36px;background:#f0fdf4;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">🤖</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="color:#1e293b;font-size:15px;font-weight:600;margin:0 0 4px;">Chat with EduBot</p>
                    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">
                      Ask EduBot to explain any concept, work through a problem step-by-step, or quiz you on a topic. Click <strong>AI Tutor</strong> in the sidebar.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Tip 3 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="width:44px;vertical-align:top;padding-top:2px;">
                    <div style="width:36px;height:36px;background:#fdf4ff;border-radius:10px;text-align:center;line-height:36px;font-size:18px;">👨‍👩‍👧</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="color:#1e293b;font-size:15px;font-weight:600;margin:0 0 4px;">Invite your children (if applicable)</p>
                    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;">
                      Go to <strong>Parent Dashboard</strong> and add your children so they each get their own adaptive learning path and you can track their progress.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;text-align:center;">
              <a href="${data.dashboardUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#4338ca,#6366f1);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.2px;">
                Go to my dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">
                Questions? Reply to this email or visit <a href="https://educhamp.co" style="color:#6366f1;text-decoration:none;">educhamp.co</a>
              </p>
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                You're receiving this because you started a trial at EduChamp.<br/>
                ${data.billingPortalUrl ? `<a href="${data.billingPortalUrl}" style="color:#94a3b8;">Manage billing</a> · ` : ""}
                <a href="https://educhamp.co" style="color:#94a3b8;">educhamp.co</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${data.userName},

Your EduChamp ${data.planName} 14-day free trial has started!

Trial period: Today → ${data.trialEndDate}
First charge: ${data.firstChargeAmount} on ${data.firstChargeDate}

3 things to do in your first 24 hours:

1. Take the Diagnostic Test — go to Diagnostic in the sidebar to build your personalised learning path.
2. Chat with EduBot — click AI Tutor to get step-by-step explanations and practice quizzes.
3. Invite your children — go to Parent Dashboard to add children and track their progress.

Go to your dashboard: ${data.dashboardUrl}

Questions? Reply to this email or visit https://educhamp.co

— The EduChamp Team`;

  return { subject, html, text };
}
