export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: (() => {
    const raw = process.env.RESEND_FROM_EMAIL ?? "EduChamp <noreply@educhamp.co>";
    // Decode unicode-escaped angle brackets that may come from env injection
    const decoded = raw.replace(/\\u003c/g, "<").replace(/\\u003e/g, ">");
    // Enforce noreply@educhamp.co as the only allowed sender domain
    if (!decoded.includes("noreply@educhamp.co")) {
      return "EduChamp <noreply@educhamp.co>";
    }
    return decoded;
  })(),
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
};
