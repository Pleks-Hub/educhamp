/**
 * parentBillingNotification.ts
 * Email template sent to parent/guardian when a minor student needs billing setup.
 */
import { BRAND, wrapEmailHtml } from "./emailBase";

export interface ParentBillingNotificationData {
  studentName: string;
  parentName?: string;
  billingSetupUrl: string;
  isReminder?: boolean;
}

export function buildParentBillingNotificationEmail(data: ParentBillingNotificationData) {
  const { studentName, parentName, billingSetupUrl, isReminder } = data;
  const greeting = parentName ? `Hi ${parentName},` : "Hi there,";
  const title = isReminder ? "Reminder: Billing Setup Still Needed" : "Billing Setup Needed";
  const emoji = isReminder ? "⏰" : "🔔";

  const bodyHtml = `
    <div style="padding: 32px 24px; text-align: center;">
      <div style="width: 64px; height: 64px; margin: 0 auto 20px; border-radius: 50%; background: ${BRAND.brandColor}22; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 28px;">${emoji}</span>
      </div>
      <h1 style="color: ${BRAND.textPrimary}; font-size: 22px; font-weight: 700; margin: 0 0 12px;">
        ${title}
      </h1>
      <p style="color: ${BRAND.textMuted}; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        ${greeting}<br/><br/>
        <strong style="color: ${BRAND.textPrimary};">${studentName}</strong> is trying to access ${BRAND.appName}. 
        To activate their account, please log in, complete billing setup, and add them to your profile.
      </p>
      <p style="color: ${BRAND.textMuted}; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        A payment card on file is required before any student can access the platform — even on the free plan. 
        Once you complete billing and link ${studentName} to your account, they'll have immediate access.
      </p>
      <a href="${billingSetupUrl}" style="display: inline-block; padding: 14px 32px; background: ${BRAND.brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
        Set Up Billing Now
      </a>
      <p style="color: ${BRAND.textMuted}; font-size: 13px; margin: 24px 0 0;">
        If you didn't expect this notification, you can safely ignore it.
      </p>
    </div>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: `${studentName} needs you to set up billing on EduChamp`,
  });

  const text = `${greeting}

${studentName} is trying to access ${BRAND.appName}. To activate their account, please log in, complete billing setup, and add them to your profile.

A payment card on file is required before any student can access the platform — even on the free plan.

Set up billing: ${billingSetupUrl}

If you didn't expect this notification, you can safely ignore it.

— The ${BRAND.appName} Team`;

  const subject = isReminder
    ? `Reminder: ${studentName} is still waiting for account access on ${BRAND.appName}`
    : `${studentName} needs you to set up billing on ${BRAND.appName}`;

  return {
    html,
    text,
    subject,
  };
}
