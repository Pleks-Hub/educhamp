import type { Express, Request, Response } from "express";
import express from "express";
import { ENV } from "./_core/env";
import { stripe } from "./stripe";
import {
  upsertSubscription,
  logPaymentEvent,
  saveUserBillingPeriod,
  incrementCouponUsage,
  recordCouponRedemption,
  getDb,
  getUserById,
  updateSubscriptionCard,
} from "./db";
import { users, subscriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "./emailService";
import { getCardDetailsFromPaymentMethod } from "./stripe";
import { buildTrialReminderEmail } from "./emailTemplates/trialReminder";
import { buildTrialExpiryEmail } from "./emailTemplates/trialExpiry";
import { buildTrialWelcomeEmail } from "./emailTemplates/trialWelcome";

/** Derive the app base URL from the request origin header, falling back to a sensible default. */
function getAppBaseUrl(req: Request): string {
  const origin = (req as any).headers?.origin as string | undefined;
  if (origin && origin.startsWith("http")) return origin;
  const host = (req as any).headers?.host as string | undefined;
  if (host) return `https://${host}`;
  return process.env.VITE_APP_URL ?? "https://educhamp.app";
}

export function registerStripeWebhook(app: Express) {
  // MUST use express.raw BEFORE express.json for webhook signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"];

      // ── Test event detection (required by Manus Stripe integration) ──────────
      let event: any;
      try {
        const rawBody = req.body as Buffer;
        const bodyStr = rawBody.toString("utf8");
        const parsed = JSON.parse(bodyStr);

        if (parsed.id && parsed.id.startsWith("evt_test_")) {
          console.log("[Webhook] Test event detected, returning verification response");
          return res.json({ verified: true });
        }

        // Verify real webhook signature
        if (!ENV.stripeWebhookSecret) {
          console.warn("[Webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature check");
          event = parsed;
        } else {
          event = stripe.webhooks.constructEvent(rawBody, sig as string, ENV.stripeWebhookSecret);
        }
      } catch (err: any) {
        console.error("[Webhook] Signature verification failed:", err.message);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      console.log(`[Webhook] Processing event: ${event.type} (${event.id})`);

      try {
        await handleStripeEvent(event, getAppBaseUrl(req));
      } catch (err) {
        console.error("[Webhook] Handler error:", err);
        // Return 200 to prevent Stripe from retrying — log the error for investigation
      }

      res.json({ received: true });
    }
  );
}

async function getUserIdFromStripeCustomer(customerId: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ id: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function getUserIdFromMetadata(metadata: Record<string, string>): Promise<number | null> {
  const rawId = metadata?.user_id;
  if (!rawId) return null;
  const parsed = parseInt(rawId, 10);
  return isNaN(parsed) ? null : parsed;
}

export async function handleStripeEvent(event: any, appBaseUrl: string = "https://educhamp.app") {
  const obj = event.data?.object;

  switch (event.type) {
    // ── Checkout completed ─────────────────────────────────────────────────────
    case "checkout.session.completed": {
      const session = obj;
      const userId =
        (await getUserIdFromMetadata(session.metadata ?? {})) ??
        (session.customer ? await getUserIdFromStripeCustomer(session.customer) : null);

      const planKey = session.metadata?.plan_key ?? "family";
      const billingPeriod: "monthly" | "annual" =
        session.metadata?.billing_period === "annual" ? "annual" : "monthly";
      const couponIdStr = session.metadata?.coupon_id;

      if (userId) {
        // Persist billing period to user profile
        await saveUserBillingPeriod(userId, billingPeriod);

        // Upsert subscription record
        await upsertSubscription({
          userId,
          planName: planKey,
          billingPeriod,
          status: "active",
          stripeCustomerId: session.customer ?? undefined,
          stripeCheckoutSessionId: session.id,
          amountCents: session.amount_total ?? undefined,
        });

        // Capture card details from the checkout session's payment method
        try {
          if (session.subscription && session.customer) {
            const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
            const pmId = stripeSub.default_payment_method as string | null;
            if (pmId) {
              const cardDetails = await getCardDetailsFromPaymentMethod(pmId);
              if (cardDetails) {
                await updateSubscriptionCard(userId, cardDetails);
                console.log(`[Webhook] Card captured for user ${userId}: ${cardDetails.cardBrand} ****${cardDetails.cardLast4}`);
              }
            }
          }
        } catch (err) {
          console.warn("[Webhook] Card capture failed (non-blocking):", err);
        }

        // Record coupon redemption if applicable
        if (couponIdStr) {
          const couponId = parseInt(couponIdStr, 10);
          if (!isNaN(couponId) && session.total_details?.amount_discount) {
            await incrementCouponUsage(couponId);
            await recordCouponRedemption({
              couponId,
              userId,
              planName: planKey,
              billingPeriod,
              originalAmountCents: (session.amount_total ?? 0) + (session.total_details?.amount_discount ?? 0),
              discountAmountCents: session.total_details.amount_discount,
              finalAmountCents: session.amount_total ?? 0,
              stripeCheckoutSessionId: session.id,
            });
          }
        }
      }

      // Send welcome email with quick-start tips
      if (userId) {
        const user = await getUserById(userId);
        if (user?.email) {
          const planDisplayName = planKey === "premium_family" ? "Premium Family" : "Family Plan";
          const monthlyPrice = planKey === "premium_family"
            ? (billingPeriod === "annual" ? "$23.99/mo" : "$29.99/mo")
            : (billingPeriod === "annual" ? "$15.99/mo" : "$19.99/mo");
          const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          const trialEndStr = trialEndDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

          const welcomeEmail = buildTrialWelcomeEmail({
            userName: user.name ?? user.email,
            userEmail: user.email,
            planName: planDisplayName,
            trialEndDate: trialEndStr,
            firstChargeDate: trialEndStr,
            firstChargeAmount: monthlyPrice,
            dashboardUrl: `${appBaseUrl}/dashboard`,
          });

          await sendEmail({
            to: user.email,
            subject: welcomeEmail.subject,
            html: welcomeEmail.html,
            text: welcomeEmail.text,
            templateName: "trial_welcome",
            referenceId: `checkout_${session.id}`,
          }).catch((err) => console.warn("[Webhook] Welcome email failed:", err));

          console.log(`[Webhook] Trial welcome email sent to ${user.email}`);
        }
      }

      await logPaymentEvent({
        userId: userId ?? undefined,
        event: event.type,
        stripeEventId: event.id,
        stripeObjectId: session.id,
        amountCents: session.amount_total ?? undefined,
        currency: session.currency ?? "usd",
        status: session.payment_status,
        metadata: { planKey, billingPeriod, customerId: session.customer },
      });
      break;
    }

    // ── Subscription lifecycle ─────────────────────────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = obj;
      const userId = sub.customer
        ? await getUserIdFromStripeCustomer(sub.customer)
        : null;

      if (userId) {
        const item = sub.items?.data?.[0];
        const interval = item?.price?.recurring?.interval;
        const billingPeriod: "monthly" | "annual" = interval === "year" ? "annual" : "monthly";

        await upsertSubscription({
          userId,
          planName: sub.metadata?.plan_key ?? "family",
          billingPeriod,
          status: sub.status,
          stripeCustomerId: sub.customer,
          stripeSubscriptionId: sub.id,
          currentPeriodStart: sub.current_period_start
            ? new Date(sub.current_period_start * 1000)
            : undefined,
          currentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : undefined,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : undefined,
          trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
          amountCents: item?.price?.unit_amount ?? undefined,
        });
      }

      await logPaymentEvent({
        userId: userId ?? undefined,
        event: event.type,
        stripeEventId: event.id,
        stripeObjectId: sub.id,
        status: sub.status,
        metadata: { customerId: sub.customer },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = obj;
      const userId = sub.customer
        ? await getUserIdFromStripeCustomer(sub.customer)
        : null;

      if (userId) {
        await upsertSubscription({
          userId,
          planName: sub.metadata?.plan_key ?? "family",
          billingPeriod: "monthly",
          status: "canceled",
          stripeCustomerId: sub.customer,
          stripeSubscriptionId: sub.id,
          canceledAt: new Date(),
        });
      }

      await logPaymentEvent({
        userId: userId ?? undefined,
        event: event.type,
        stripeEventId: event.id,
        stripeObjectId: sub.id,
        status: "canceled",
        metadata: { customerId: sub.customer },
      });
      break;
    }

    // ── Invoice events ─────────────────────────────────────────────────────────
    case "invoice.paid": {
      const invoice = obj;
      const userId = invoice.customer
        ? await getUserIdFromStripeCustomer(invoice.customer)
        : null;

      await logPaymentEvent({
        userId: userId ?? undefined,
        event: event.type,
        stripeEventId: event.id,
        stripeObjectId: invoice.id,
        amountCents: invoice.amount_paid,
        currency: invoice.currency,
        status: "paid",
        metadata: { subscriptionId: invoice.subscription, customerId: invoice.customer },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = obj;
      const userId = invoice.customer
        ? await getUserIdFromStripeCustomer(invoice.customer)
        : null;

      // Update subscription status to past_due
      if (userId) {
        const db = await getDb();
        if (db && invoice.subscription) {
          await db
            .update(subscriptions)
            .set({ status: "past_due" })
            .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription));
        }
      }

      await logPaymentEvent({
        userId: userId ?? undefined,
        event: event.type,
        stripeEventId: event.id,
        stripeObjectId: invoice.id,
        amountCents: invoice.amount_due,
        currency: invoice.currency,
        status: "failed",
        metadata: {
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
          nextPaymentAttempt: invoice.next_payment_attempt,
        },
      });
      break;
    }

    // ── Trial ending reminder ──────────────────────────────────────────────────
    case "customer.subscription.trial_will_end": {
      const sub = obj;
      const userId = sub.customer
        ? await getUserIdFromStripeCustomer(sub.customer)
        : null;

      if (userId) {
        const user = await getUserById(userId);
        if (user?.email) {
          // Determine plan details for the email
          const item = sub.items?.data?.[0];
          const interval = item?.price?.recurring?.interval;
          const isAnnual = interval === "year";
          const planKey = sub.metadata?.plan_key ?? "family";
          const planName = planKey === "premium_family" ? "Premium Family" : "Family Plan";
          const monthlyPrice = planKey === "premium_family"
            ? (isAnnual ? "$23.99/mo" : "$29.99/mo")
            : (isAnnual ? "$15.99/mo" : "$19.99/mo");

          const trialEndDate = sub.trial_end
            ? new Date(sub.trial_end * 1000)
            : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

          // Generate Stripe billing portal URL for cancellation
          let billingPortalUrl = `${appBaseUrl}/billing`;
          try {
            const portal = await stripe.billingPortal.sessions.create({
              customer: sub.customer,
              return_url: `${appBaseUrl}/billing`,
            });
            billingPortalUrl = portal.url;
          } catch (err) {
            console.warn("[Webhook] Could not create billing portal session:", err);
          }

          // Compute billing amount from Stripe price (cents → formatted string)
          const unitAmount = item?.price?.unit_amount ?? 0;
          const currency = item?.price?.currency ?? "usd";
          const billingAmount = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency.toUpperCase(),
          }).format(unitAmount / 100);
          const billingInterval = item?.price?.recurring?.interval ?? "month";

          // Billing date = trial end date for Stripe trials
          const billingDate = trialEndDate;

          const emailData = buildTrialExpiryEmail({
            userName: user.name ?? user.email,
            userEmail: user.email,
            planName,
            trialEndDate,
            billingDate,
            billingAmount,
            billingInterval,
            dashboardUrl: `${appBaseUrl}/dashboard`,
            billingUrl: billingPortalUrl,
          });

          await sendEmail({
            to: user.email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
            templateName: "trial_expiry_reminder",
            referenceId: `sub_${sub.id}`,
          });

          console.log(`[Webhook] Trial expiry reminder email sent to ${user.email} (trial ends ${trialEndDate.toISOString()}, billing ${billingAmount})`);
        }
      }

      await logPaymentEvent({
        userId: userId ?? undefined,
        event: event.type,
        stripeEventId: event.id,
        stripeObjectId: sub.id,
        status: "trial_ending",
        metadata: { customerId: sub.customer, trialEnd: sub.trial_end },
      });
      break;
    }

    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }
}
