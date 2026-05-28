# EduChamp — Sprint 32 Setup Guide

**Resend Email Domain Verification · Stripe Webhook Secret · GTM / GA4 Conversion Goals**

---

## 1. Resend Email Domain Verification for educhamp.app

The project's Resend API key is a **send-only** restricted key (the correct security posture for production). Domain management requires a full-access key, which must be used directly in the Resend dashboard. Follow the steps below to verify `educhamp.app` so that emails sent from `invites@educhamp.app` pass SPF, DKIM, and DMARC checks and land in inboxes rather than spam folders.

### Step 1 — Add the domain in Resend

1. Log in to [resend.com/domains](https://resend.com/domains).
2. Click **Add Domain**.
3. Enter `educhamp.app` and select region **US East (N. Virginia)**.
4. Click **Add**.

Resend will display a set of DNS records. The exact values are unique to your account; the record types are listed below.

### Step 2 — DNS records to add at your registrar

Add all of the following records at your DNS provider (Cloudflare, Namecheap, GoDaddy, etc.). The exact values are shown in the Resend dashboard after you add the domain.

| Type | Name / Host | Value | Purpose |
|------|-------------|-------|---------|
| `TXT` | `resend._domainkey` | `p=MIGfMA0GCSq…` (shown in Resend) | DKIM signing key |
| `TXT` | `@` or `educhamp.app` | `v=spf1 include:amazonses.com ~all` | SPF authorisation |
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@educhamp.app` | DMARC policy |
| `MX` | `bounce` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | Bounce handling |

> **Cloudflare users:** set the proxy status to **DNS only** (grey cloud) for all Resend records — proxied records break DKIM verification.

DNS propagation typically takes 5–30 minutes. Once all records show **Verified** in the Resend dashboard, emails from `invites@educhamp.app` will be fully authenticated.

### Step 3 — Confirm the from-address in code

The `emailService.ts` already defaults to `EduChamp <invites@educhamp.app>`. No code change is needed. If you want to use a different address (e.g. `hello@educhamp.app`), set the `RESEND_FROM_EMAIL` environment variable via **Settings → Secrets** in the Management UI.

### Step 4 — Send a test email

After DNS verification, trigger a test by starting a free trial in the staging environment. The `checkout.session.completed` webhook fires the welcome email automatically. Check the **Email Logs** table in the database (via the Database panel) to confirm `status = 'sent'` and a valid `messageId`.

---

## 2. Stripe Webhook Secret

The `STRIPE_WEBHOOK_SECRET` is a built-in Stripe secret managed by the Manus platform and **cannot** be updated via the Secrets panel. Update it through the dedicated Payment settings:

1. Open the Management UI and navigate to **Settings → Payment**.
2. Paste the following value into the **Stripe Webhook Secret** field:

   ```
   whsec_f1YtygORnidWD9MTDUYNpKlNU0alyEhm
   ```

3. Click **Save**.

The server reads this value from `process.env.STRIPE_WEBHOOK_SECRET` at runtime. Once saved, all incoming Stripe webhook events — including `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`, and `customer.subscription.trial_will_end` — will be signature-verified before processing.

> **Important:** The webhook endpoint registered in Stripe must point to `https://educhamp.app/api/stripe/webhook`. Verify this in your [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks). If the endpoint URL is still pointing to a preview domain, update it to the production URL.

---

## 3. Google Tag Manager / GA4 Conversion Goals

The GTM container snippet is already embedded in `client/index.html` and reads the container ID from the `VITE_GTM_ID` environment variable. The `analytics.ts` helper fires the following events into the `window.dataLayer`:

| Event name | Fired from | Payload |
|---|---|---|
| `view_pricing` | LandingPage (IntersectionObserver on `#pricing`) | `{ source: "landing_page" }` |
| `begin_checkout` | LandingPage CTA click | `{ plan, billing_period }` |
| `checkout_redirect` | CheckoutModal → Stripe | `{ plan, billing_period, coupon_applied }` |
| `purchase` | CheckoutSuccess on mount | `{ plan, billing_period }` |
| `trial_started` | CheckoutSuccess on mount | `{ plan, billing_period }` |

### Step 1 — Create a GTM container

1. Go to [tagmanager.google.com](https://tagmanager.google.com/) and sign in with the Google account that owns the GA4 property.
2. Click **Create Account** (or use an existing account).
3. Set **Container name** to `educhamp.app` and **Target platform** to **Web**.
4. Copy the **Container ID** (format: `GTM-XXXXXXX`).
5. In the Management UI go to **Settings → Secrets** and set `VITE_GTM_ID` to your container ID, then redeploy.

### Step 2 — Connect GTM to GA4

Inside your GTM container:

1. **Tags → New → Google Tag** — enter your **GA4 Measurement ID** (format: `G-XXXXXXXXXX`). Set the trigger to **All Pages**. Name it `GA4 — Configuration`. Publish.
2. **Tags → New → Google Analytics: GA4 Event** — configure one tag per custom event:

| Tag name | Event name | Trigger |
|---|---|---|
| `GA4 — view_pricing` | `view_pricing` | Custom Event: `view_pricing` |
| `GA4 — begin_checkout` | `begin_checkout` | Custom Event: `begin_checkout` |
| `GA4 — checkout_redirect` | `checkout_redirect` | Custom Event: `checkout_redirect` |
| `GA4 — purchase` | `purchase` | Custom Event: `purchase` |
| `GA4 — trial_started` | `trial_started` | Custom Event: `trial_started` |

For each event tag, add **Event Parameters** by mapping `plan` → `{{DLV - plan}}` and `billing_period` → `{{DLV - billing_period}}` (create Data Layer Variable variables for each key).

### Step 3 — Mark trial_started as a GA4 Conversion

1. In [Google Analytics](https://analytics.google.com/), open your GA4 property.
2. Go to **Admin → Events** (under the Data display column).
3. Find `trial_started` in the event list (it will appear after the first real event fires). Click the toggle under **Mark as conversion**.

Once marked, `trial_started` appears in **Admin → Conversions** and is available as a conversion action in Google Ads.

### Step 4 — Import the conversion into Google Ads (optional)

1. In [Google Ads](https://ads.google.com/), go to **Goals → Conversions → Summary**.
2. Click **New conversion action → Import → Google Analytics 4 properties**.
3. Select your GA4 property and tick `trial_started`.
4. Set **Category** to `Sign-up`, **Value** to `0` (or your estimated LTV), **Count** to `One`.
5. Click **Import and continue**.

Allow 24–48 hours for conversion data to populate after the first real trial sign-up.

### Step 5 — Verify the full funnel in GTM Preview

1. In GTM, click **Preview** and enter `https://educhamp.app`.
2. Navigate to the Pricing section — confirm `view_pricing` fires.
3. Click **Start Free Trial** — confirm `begin_checkout` fires with the correct plan.
4. Complete a test checkout with card `4242 4242 4242 4242` — confirm `purchase` and `trial_started` fire on the `/checkout/success` page.
5. In GA4 → **Realtime → Events**, confirm all five events appear within seconds.

---

## Summary Checklist

| Task | Owner | Status |
|---|---|---|
| Add `educhamp.app` domain in Resend dashboard | You | Manual step |
| Add DNS records at registrar (SPF, DKIM, DMARC, MX) | You | Manual step |
| Verify domain shows "Verified" in Resend | You | Manual step |
| Update `STRIPE_WEBHOOK_SECRET` in Settings → Payment | You | Manual step |
| Update Stripe webhook endpoint URL to `educhamp.app/api/stripe/webhook` | You | Manual step |
| Create GTM container and set `VITE_GTM_ID` secret | You | Manual step |
| Add GA4 Configuration tag in GTM | You | Manual step |
| Add 5 GA4 Event tags in GTM | You | Manual step |
| Mark `trial_started` as conversion in GA4 | You | Manual step |
| Import `trial_started` conversion into Google Ads | You | Optional |
| GTM container snippet in `index.html` | ✅ Done | Code deployed |
| `analytics.ts` event helper | ✅ Done | Code deployed |
| Welcome email on trial start | ✅ Done | Code deployed |
| Trial reminder email (3 days before expiry) | ✅ Done | Code deployed |
| Post-trial locked-access overlay | ✅ Done | Code deployed |
