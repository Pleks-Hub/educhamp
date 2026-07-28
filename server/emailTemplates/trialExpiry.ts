/**
 * trialExpiry.ts — Branded trial expiry reminder email (T-3 days before trial ends)
 * Triggered by: customer.subscription.trial_will_end Stripe webhook event
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

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

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);text-align:center;line-height:64px;">
        <span style="font-size:28px;">⏰</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      Trial Ending Soon
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      3 days remaining on your ${data.planName} trial
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${firstName},
    </p>

    <!-- Body text -->
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Your <strong style="color:${BRAND.textPrimary};">${data.planName}</strong> trial ends on
      <strong style="color:${BRAND.textPrimary};">${trialEndStr}</strong>.
      After that, your subscription will automatically begin.
    </p>

    <!-- Billing details box -->
    <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:10px;padding:18px;margin:20px 0;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${BRAND.textPrimary};">
        💳 Billing Details
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Plan:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${data.planName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">First charge:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${data.billingAmount}/${intervalLabel}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Billing date:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${billingDateStr}</td>
        </tr>
      </table>
    </div>

    <!-- What happens next -->
    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:${BRAND.textPrimary};">
      What happens next?
    </p>
    <ul style="margin:0 0 24px;padding-left:18px;font-size:13px;color:${BRAND.textMuted};line-height:2;">
      <li><strong>Keep it:</strong> No action needed — your subscription starts automatically</li>
      <li><strong>Cancel:</strong> Visit your billing portal before ${trialEndStr} to avoid charges</li>
    </ul>

    <!-- CTA Buttons -->
    <div style="text-align:center;margin-bottom:12px;">
      ${ctaButton("Continue Learning", data.dashboardUrl)}
    </div>
    <div style="text-align:center;">
      <a href="${data.billingUrl}" style="display:inline-block;padding:10px 24px;font-size:13px;color:${BRAND.brandColor};text-decoration:none;border:1px solid ${BRAND.brandColor};border-radius:8px;">
        Manage Billing
      </a>
    </div>
  `;

  const footerHtml = `
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      Need help? Contact us at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.brandColor};text-decoration:none;">${BRAND.supportEmail}</a>
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      <a href="${BRAND.websiteUrl}" style="color:${BRAND.brandColor};text-decoration:none;">Visit EduChamp</a>
      &nbsp;·&nbsp;
      <a href="${BRAND.websiteUrl}/privacy" style="color:${BRAND.brandColor};text-decoration:none;">Privacy Policy</a>
      &nbsp;·&nbsp;
      <a href="${BRAND.websiteUrl}/terms" style="color:${BRAND.brandColor};text-decoration:none;">Terms of Service</a>
    </p>
    <p style="margin:0;font-size:11px;color:${BRAND.textMuted};opacity:0.7;">
      © ${new Date().getFullYear()} EduChamp · AI-Powered Adaptive Learning
    </p>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: `Your EduChamp trial ends on ${trialEndStr}. ${data.billingAmount}/${intervalLabel} billing starts after.`,
    footerHtml,
  });

  const text = `Hi ${firstName},

Your ${data.planName} trial ends on ${trialEndStr}. After that, your subscription will automatically begin.

BILLING DETAILS:
Plan: ${data.planName}
First charge: ${data.billingAmount}/${intervalLabel}
Billing date: ${billingDateStr}

WHAT HAPPENS NEXT:
• Keep it: No action needed — your subscription starts automatically
• Cancel: Visit your billing portal before ${trialEndStr} to avoid charges

Continue Learning: ${data.dashboardUrl}
Manage Billing: ${data.billingUrl}

Need help? Contact us at ${BRAND.supportEmail}
Visit us: ${BRAND.websiteUrl}

© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { subject, html, text };
}
