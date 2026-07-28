/**
 * trialWelcome.ts
 * Branded "Your 14-day trial has started" onboarding email.
 * Sent immediately after checkout.session.completed for new trial subscriptions.
 * Uses the shared email base for consistent branding.
 */
import { BRAND, wrapEmailHtml, ctaButton } from "./emailBase";

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
  const { userName, planName, trialEndDate, firstChargeAmount, dashboardUrl, billingPortalUrl } = data;
  const firstName = userName.split(" ")[0] || userName;
  const subject = `Your 14-day EduChamp trial has started — here's how to get the most out of it`;

  const bodyHtml = `
    <!-- Icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);text-align:center;line-height:64px;">
        <span style="font-size:28px;">🚀</span>
      </div>
    </div>

    <!-- Title -->
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};text-align:center;">
      Your Trial Has Started!
    </h1>
    <p style="margin:0 0 28px;font-size:14px;color:${BRAND.textMuted};text-align:center;">
      14 days of full access to EduChamp
    </p>

    <!-- Greeting -->
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND.textPrimary};">
      Welcome, ${firstName}!
    </p>

    <!-- Body text -->
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textMuted};line-height:1.7;">
      Your <strong style="color:${BRAND.textPrimary};">${planName}</strong> trial is now active.
      You have full access to all EduChamp features for the next 14 days.
    </p>

    <!-- Trial details box -->
    <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:18px;margin:20px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Plan:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${planName}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">Trial ends:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${trialEndDate}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textMuted};">First charge:</td>
          <td style="padding:4px 0;font-size:13px;color:${BRAND.textPrimary};font-weight:600;text-align:right;">${firstChargeAmount} on ${trialEndDate}</td>
        </tr>
      </table>
    </div>

    <!-- Quick start tips -->
    <p style="margin:24px 0 12px;font-size:14px;font-weight:600;color:${BRAND.textPrimary};">
      🎯 Quick Start Tips
    </p>
    <ol style="margin:0;padding-left:18px;font-size:13px;color:${BRAND.textMuted};line-height:2;">
      <li>Add your children from the Parent Dashboard</li>
      <li>Enroll them in courses matched to their grade</li>
      <li>Let the AI tutor guide them through adaptive lessons</li>
      <li>Check the Insights tab for progress analytics</li>
    </ol>

    <!-- CTA Button -->
    <div style="text-align:center;margin-top:24px;">
      ${ctaButton("Go to Dashboard", dashboardUrl)}
    </div>

    ${billingPortalUrl ? `
    <!-- Billing info -->
    <p style="margin:24px 0 0;font-size:12px;color:${BRAND.textMuted};text-align:center;line-height:1.6;">
      Want to manage your subscription or cancel anytime?<br/>
      <a href="${billingPortalUrl}" style="color:${BRAND.brandColor};text-decoration:none;">Manage Billing</a>
    </p>
    ` : ""}
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
    previewText: `Welcome ${firstName}! Your ${planName} trial is active. Full access for 14 days.`,
    footerHtml,
  });

  const text = `Welcome, ${firstName}!

Your ${planName} trial is now active. You have full access to all EduChamp features for the next 14 days.

Plan: ${planName}
Trial ends: ${trialEndDate}
First charge: ${firstChargeAmount} on ${trialEndDate}

QUICK START TIPS:
1. Add your children from the Parent Dashboard
2. Enroll them in courses matched to their grade
3. Let the AI tutor guide them through adaptive lessons
4. Check the Insights tab for progress analytics

Go to Dashboard: ${dashboardUrl}
${billingPortalUrl ? `Manage Billing: ${billingPortalUrl}` : ""}

Need help? Contact us at ${BRAND.supportEmail}
Visit us: ${BRAND.websiteUrl}

© ${new Date().getFullYear()} EduChamp — AI-Powered Adaptive Learning
`;

  return { subject, html, text };
}
