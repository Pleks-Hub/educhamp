/**
 * cardExpiry.ts — Email template for card expiry reminders.
 * Sent to parents (always) and age-appropriate students.
 */
import { BRAND, wrapEmailHtml } from "./emailBase";

interface CardExpiryEmailParams {
  recipientName: string;
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: number;
  cardExpYear: number;
  billingUrl: string;
}

export function buildCardExpiryEmail(params: CardExpiryEmailParams) {
  const { recipientName, cardBrand, cardLast4, cardExpMonth, cardExpYear, billingUrl } = params;
  const expDate = `${String(cardExpMonth).padStart(2, "0")}/${cardExpYear}`;
  const subject = `Action needed: Your ${cardBrand} card ending in ${cardLast4} is expiring soon`;

  const bodyHtml = `
    <div style="padding: 32px 24px;">
      <h1 style="color: ${BRAND.textPrimary}; font-size: 22px; margin: 0 0 16px;">
        Your payment card is expiring soon
      </h1>
      <p style="color: ${BRAND.textMuted}; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        Hi ${recipientName},
      </p>
      <p style="color: ${BRAND.textMuted}; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        Your <strong style="color: ${BRAND.textPrimary};">${cardBrand} card ending in ${cardLast4}</strong>
        expires on <strong style="color: ${BRAND.textPrimary};">${expDate}</strong>.
        To avoid any interruption in your ${BRAND.appName} subscription, please update your payment method.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${billingUrl}" style="
          display: inline-block;
          background: ${BRAND.brandColor};
          color: #ffffff;
          padding: 14px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 15px;
        ">Update payment method</a>
      </div>
      <p style="color: ${BRAND.textMuted}; font-size: 13px; line-height: 1.5; margin: 20px 0 0;">
        If your card has already been renewed by your bank with a new expiry date,
        you may still need to update it in your ${BRAND.appName} account to ensure
        uninterrupted access.
      </p>
    </div>
  `;

  const html = wrapEmailHtml({
    bodyHtml,
    previewText: `Your ${cardBrand} ****${cardLast4} expires ${expDate} — update now to keep your subscription active.`,
  });

  const text = `Hi ${recipientName},

Your ${cardBrand} card ending in ${cardLast4} expires on ${expDate}. To avoid any interruption in your ${BRAND.appName} subscription, please update your payment method.

Update your card here: ${billingUrl}

If your card has already been renewed by your bank, you may still need to update it in your ${BRAND.appName} account.

— The ${BRAND.appName} Team`;

  return { subject, html, text };
}
