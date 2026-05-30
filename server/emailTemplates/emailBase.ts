/**
 * emailBase.ts - Shared EduChamp email branding constants and HTML wrapper.
 * All email templates should import BRAND and wrapEmailHtml from here.
 */

export const BRAND = {
  fromAddress: "EduChamp <hi@educhamp.app>",
  supportEmail: "hi@educhamp.app",
  logoUrl: "https://educhamp.manus.space/manus-storage/educhamp-logo-64_7d30d62b.png",
  brandColor: "#6C63FF",
  accentColor: "#FF6584",
  bgColor: "#0F0F1A",
  cardBg: "#1A1A2E",
  footerBg: "#13131F",
  textPrimary: "#FFFFFF",
  textMuted: "#A0A0B8",
  borderColor: "#2A2A3E",
  appName: "EduChamp",
  websiteUrl: "https://educhamp.app",
  supportUrl: "https://educhamp.app/support",
};

export interface WrapEmailHtmlOptions {
  bodyHtml: string;
  previewText?: string;
  footerHtml?: string;
}

export function wrapEmailHtml({
  bodyHtml,
  previewText = "",
  footerHtml,
}: WrapEmailHtmlOptions): string {
  const preview = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;</div>`
    : "";

  const footer =
    footerHtml ??
    `<p style="margin:0 0 8px;font-size:12px;color:${BRAND.textMuted};">
      You received this email because you have an account on
      <a href="${BRAND.websiteUrl}" style="color:${BRAND.brandColor};text-decoration:none;">${BRAND.appName}</a>.
    </p>
    <p style="margin:0;font-size:12px;color:${BRAND.textMuted};">
      Questions? Email us at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.brandColor};text-decoration:none;">${BRAND.supportEmail}</a>
    </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${BRAND.appName}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preview}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${BRAND.bgColor};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;">
          <tr>
            <td style="padding-bottom:24px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:10px;vertical-align:middle;">
                    <img src="${BRAND.logoUrl}" alt="${BRAND.appName} Logo" width="40" height="40"
                      style="display:block;border-radius:8px;border:0;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:700;color:${BRAND.textPrimary};letter-spacing:-0.5px;">${BRAND.appName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:${BRAND.cardBg};border-radius:16px;padding:36px 32px;border:1px solid ${BRAND.borderColor};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:10px;background:${BRAND.brandColor};">
        <a href="${href}" target="_blank"
          style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">${label}</a>
      </td>
    </tr>
  </table>`;
}
