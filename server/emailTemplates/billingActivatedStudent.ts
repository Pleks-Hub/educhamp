/**
 * billingActivatedStudent.ts — Email template sent to students when their parent
 * completes billing setup. Includes CAN-SPAM compliant unsubscribe footer.
 */
import { BRAND, wrapEmailHtml } from "./emailBase";

export interface BillingActivatedStudentEmailData {
  studentName: string;
  parentName: string;
  loginUrl: string;
}

export function buildBillingActivatedStudentEmail(data: BillingActivatedStudentEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { studentName, parentName, loginUrl } = data;

  const subject = "Your EduChamp Account is Now Active!";

  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.textPrimary};">
      🎉 Your Account is Active!
    </h2>
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textPrimary};line-height:1.6;">
      Hi ${studentName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:${BRAND.textPrimary};line-height:1.6;">
      Great news! <strong>${parentName}</strong> has completed billing setup for your EduChamp account.
      You now have full access to all courses and features.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textPrimary};line-height:1.6;">
      Log in and start learning today!
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.brandColor};border-radius:8px;padding:12px 28px;">
          <a href="${loginUrl}" style="color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;display:inline-block;">
            Log In to EduChamp
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};line-height:1.5;">
      — The EduChamp Team
    </p>
  `;

  const footerHtml = `
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      You received this email because your parent/guardian activated your
      <a href="${BRAND.websiteUrl}" style="color:${BRAND.brandColor};text-decoration:none;">${BRAND.appName}</a> account.
    </p>
    <p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      Questions? Email us at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.brandColor};text-decoration:none;">${BRAND.supportEmail}</a>
    </p>
    <p style="margin:0 0 4px;font-size:11px;color:${BRAND.textMuted};border-top:1px solid ${BRAND.borderColor};padding-top:12px;margin-top:12px;">
      <strong>To unsubscribe</strong> from transactional emails, log in to your account and visit
      <a href="${BRAND.websiteUrl}/profile" style="color:${BRAND.brandColor};text-decoration:none;">Profile &gt; Settings</a>
      to manage your email preferences. You may also reply to this email with "UNSUBSCRIBE" in the subject line.
    </p>
    <p style="margin:0;font-size:11px;color:${BRAND.textMuted};">
      EduChamp · ${BRAND.websiteUrl}
    </p>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: `${parentName} activated your EduChamp account — you're all set!`,
    footerHtml,
  });

  const text = `Hi ${studentName},

Great news! ${parentName} has completed billing setup for your EduChamp account. You now have full access to all courses and features.

Log in and start learning: ${loginUrl}

— The EduChamp Team

---
You received this email because your parent/guardian activated your EduChamp account.
To unsubscribe, log in and visit Profile > Settings to manage email preferences, or reply with "UNSUBSCRIBE" in the subject line.
EduChamp · ${BRAND.websiteUrl}
`;

  return { subject, html, text };
}
