# GA4 Funnel Exploration Guide — EduChamp Conversion Funnel

This guide walks through building a four-step Funnel Exploration in Google Analytics 4 that tracks the full EduChamp acquisition journey: from landing page visit through pricing discovery, checkout initiation, and trial activation. The funnel uses the five custom events already firing from the deployed codebase.

---

## Events fired by EduChamp

The following events are pushed to `window.dataLayer` and forwarded to GA4 via Google Tag Manager. All five must be configured as GA4 Event tags in GTM before the funnel will populate.

| Event name | Trigger point | Key parameters |
|---|---|---|
| `page_view` | Every page load (automatic via GA4 Configuration tag) | `page_location`, `page_title` |
| `view_pricing` | Pricing section scrolls into view on the landing page | `source: "landing_page"` |
| `begin_checkout` | "Start Free Trial" CTA click on the landing page | `plan`, `billing_period` |
| `checkout_redirect` | User clicks "Proceed to Stripe" in the checkout modal | `plan`, `billing_period`, `coupon_applied` |
| `trial_started` | `/checkout/success` page mounts after Stripe redirect | `plan`, `billing_period` |

---

## Step 1 — Confirm events are arriving in GA4

Before building the funnel, verify that real events are flowing into your GA4 property. Navigate to **Reports → Realtime** in Google Analytics and open `educhamp.app` in a browser tab. Scroll to the pricing section and click the trial CTA. Within 30 seconds you should see `view_pricing`, `begin_checkout`, and (after completing a test checkout) `trial_started` appear in the Realtime event list. If events are missing, use GTM Preview mode to diagnose which tags are not firing.

---

## Step 2 — Open Explorations

In Google Analytics, click **Explore** in the left navigation. This opens the Explorations workspace. Click the **Blank** template to start a new exploration, then change the technique from "Free form" to **Funnel exploration** using the dropdown at the top of the Technique column on the left.

---

## Step 3 — Configure the four funnel steps

In the **Steps** section of the Funnel exploration panel, click **Edit funnel**. Add the following four steps in order:

| Step | Name | Condition | Event / parameter match |
|---|---|---|---|
| 1 | Landing page visit | Event name exactly matches | `page_view` |
| 2 | Viewed pricing | Event name exactly matches | `view_pricing` |
| 3 | Started checkout | Event name exactly matches | `begin_checkout` |
| 4 | Trial activated | Event name exactly matches | `trial_started` |

For Step 1, add a filter to restrict to landing page visits only: **Parameter** `page_location` **contains** `educhamp.app` and does **not contain** `/dashboard` or `/billing`. This excludes authenticated users who are already customers from inflating the top-of-funnel count.

Click **Apply** when all four steps are configured.

---

## Step 4 — Set the date range and segment

Set the date range to **Last 28 days** using the calendar control at the top of the canvas. For the initial view, leave the segment as **All Users**. Once you have sufficient data (typically after 100+ trial sign-ups), create a comparison segment for **Organic** vs **Paid** traffic by adding a segment filter on `Session source / medium`.

---

## Step 5 — Add elapsed time and next-step abandonment

In the **Settings** panel on the left, enable **Show elapsed time** to see how long users take between each funnel step. This is particularly useful for identifying friction: if the median time between Step 2 (view pricing) and Step 3 (begin checkout) is longer than 2 minutes, users are reading the pricing page carefully and may benefit from a live chat prompt or FAQ expansion.

Enable **Make open funnel** if you want to count users who enter the funnel at any step, not just Step 1. For conversion optimisation purposes, a **closed funnel** (the default) is more useful because it measures the true end-to-end journey.

---

## Step 6 — Interpret the results

The funnel will display abandonment rates between each step. The most actionable drop-off points for EduChamp are typically:

**Step 1 → Step 2 (Landing → Pricing):** A low rate here means users are not scrolling far enough to see the pricing section. Consider moving the pricing anchor higher on the page or adding a sticky "View Plans" button in the navigation.

**Step 2 → Step 3 (Pricing → Checkout):** This is the primary conversion gate. A drop-off above 80% is normal for SaaS trials; above 90% suggests the pricing page copy, plan structure, or trust signals need work.

**Step 3 → Step 4 (Checkout → Trial):** This step measures Stripe checkout completion. Drop-off here is usually caused by payment friction (unsupported card types, confusing form layout) or users abandoning after seeing the credit card requirement. Consider A/B testing "No credit card required" messaging if you offer a card-free trial tier.

---

## Step 7 — Save and share

Click the **Save** icon (floppy disk) in the top-right corner and name the exploration `EduChamp Conversion Funnel — Trial Activation`. To share with a team member, click the **Share** icon and select **Share exploration** — they will need Viewer access to the GA4 property.

---

## Step 8 — Set up a funnel report in the standard Reports section (optional)

Explorations are only visible to users with Editor access. To make the funnel visible to all viewers, navigate to **Reports → Library** and create a **Funnel report** using the same four steps. Publish it to the **Acquisition** report collection so it appears in the left navigation for all team members.

---

## Recommended next actions after the funnel is live

Once the funnel is collecting data, the three highest-impact optimisations based on typical SaaS conversion patterns are: (1) adding social proof (testimonials, school logos) directly above the pricing section to reduce Step 2 → Step 3 drop-off; (2) enabling Stripe's Link payment method to reduce checkout friction; and (3) setting up a GA4 Audience for users who completed Step 2 but not Step 3, then retargeting them with a Google Ads remarketing campaign using the `begin_checkout` conversion event as the bid signal.
