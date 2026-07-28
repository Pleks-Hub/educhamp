/**
 * EduChamp — Trial Ending Reminder Email Template
 *
 * Sent 3 days before a user's free trial expires.
 * Informs the user of the upcoming charge and provides a cancel link.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

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

export function buildTrialReminderEmail(data: TrialReminderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, planName, planPrice, trialEndDate, billingPortalUrl } = data;
  const firstName = userName.split(" ")[0] || userName;
  const endDateStr = trialEndDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const subject = `Reminder: Your EduChamp trial ends in 3 days`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);text-align:center;line-height:64px;">
        <span style="font-size:28px;">⚡</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      Trial Ending Soon
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      Your free trial ends on ${endDateStr}
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Hi ${firstName},
    </p>

    <!-- Body text -->
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Just a friendly reminder that your <strong style="color:${BRAND.textPrimary};">${planName}</strong> free trial
      will end on <strong style="color:${BRAND.textPrimary};">${endDateStr}</strong>.
    </p>

    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      After the trial, your subscription will continue at <strong style="color:${BRAND.textPrimary};">${planPrice}</strong>.
      If you'd like to cancel, you can do so anytime before the trial ends.
    </p>

    <!-- Info box -->
    <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:18px;margin:20px 0;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:${BRAND.textPrimary};">
        📋 Your options:
      </p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:${BRAND.textMuted};line-height:2;">
        <li><strong>Continue:</strong> No action needed — enjoy uninterrupted learning</li>
        <li><strong>Cancel:</strong> Use the link below before ${endDateStr}</li>
        <li><strong>Downgrade:</strong> Switch to a different plan from billing settings</li>
      </ul>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;">
      ${ctaButton("Manage Subscription", billingPortalUrl)}
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
    previewText: `Your EduChamp trial ends on ${endDateStr}. Continue at ${planPrice} or cancel anytime.`,
    footerHtml,
  });

  const text = `Hi ${firstName},

Just a friendly reminder that your ${planName} free trial will end on ${endDateStr}.

After the trial, your subscription will continue at ${planPrice}. If you'd like to cancel, you can do so anytime before the trial ends.

YOUR OPTIONS:
• Continue: No action needed — enjoy uninterrupted learning
• Cancel: Use the link below before ${endDateStr}
• Downgrade: Switch to a different plan from billing settings

Manage Subscription: ${billingPortalUrl}

Need help? Contact us at ${BRAND.supportEmail}
Visit us: ${BRAND.websiteUrl}

© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { subject, html, text };
}
