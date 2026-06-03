import { z } from "zod";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getCouponByCode,
  getCouponById,
  listCoupons,
  createCoupon,
  updateCoupon,
  incrementCouponUsage,
  recordCouponRedemption,
  countUserCouponRedemptions,
  getCouponRedemptionStats,
  saveUserBillingPeriod,
  upsertSubscription,
  getUserSubscription,
  listSubscriptions,
  logPaymentEvent,
  getPaymentAnalytics,
  updateSubscriptionCard,
  createFreeSubscription,
  countParentStudents,
  createBillingDelegation,
  getBillingDelegationByToken,
  getPendingBillingDelegationsForEmail,
  acceptBillingDelegation,
  rejectBillingDelegation,
  getStudentBillingDelegations,
  adminSuspendSubscription,
  adminResumeSubscription,
  adminUpdateSubscriptionStatus,
  adminCreateSubscription,
  getSubscriptionById,
  listSubscriptionsWithUsers,
  getExpiringCardSubscriptions,
  getUserById,
  listPaymentAuditLog,
  listSubscriptionCards,
  adminDeleteCard,
  checkStudentParentBillingCoverage,
} from "../db";
import {
  stripe,
  PLANS,
  getPlanByKey,
  calculateDiscount,
  getOrCreateStripeCustomer,
  createSetupIntent,
  getCardDetailsFromPaymentMethod,
  setDefaultPaymentMethod,
  type CouponValidationResult,
} from "../stripe";
import { ENV } from "../_core/env";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ─── Schemas ──────────────────────────────────────────────────────────────────
const couponCreateSchema = z.object({
  code: z.string().min(3).max(64),
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().positive(),
  maxDiscountAmount: z.number().positive().optional(),
  applicablePlans: z.array(z.string()).optional(),
  eligibility: z.enum(["all", "new_users", "parents", "students", "schools", "selected"]),
  selectedUserIds: z.array(z.number()).optional(),
  minAmount: z.number().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  perUserLimit: z.number().int().positive().default(1),
  duration: z.enum(["once", "repeating", "forever"]),
  durationMonths: z.number().int().positive().optional(),
  startDate: z.date().optional(),
  expiresAt: z.date().optional(),
  isStackable: z.boolean().default(false),
});

// ─── Router ───────────────────────────────────────────────────────────────────
export const paymentRouter = router({

  // ── Public: get plan pricing ────────────────────────────────────────────────
  getPlans: publicProcedure.query(() => {
    return Object.entries(PLANS).map(([key, plan]) => ({
      key,
      name: plan.name,
      monthly: plan.monthly,
      annual: plan.annual,
      features: plan.features,
      maxStudents: plan.maxStudents,
      isFree: plan.isFree ?? false,
    }));
  }),

  // ── Protected: save billing period preference ───────────────────────────────
  saveBillingPeriod: protectedProcedure
    .input(z.object({ billingPeriod: z.enum(["monthly", "annual"]) }))
    .mutation(async ({ ctx, input }) => {
      await saveUserBillingPeriod(ctx.user.id, input.billingPeriod);
      return { success: true };
    }),

  // ── Public: validate coupon code ────────────────────────────────────────────
  validateCoupon: publicProcedure
    .input(
      z.object({
        code: z.string(),
        planKey: z.string(),
        billingPeriod: z.enum(["monthly", "annual"]),
        userId: z.number().optional(),
      })
    )
    .query(async ({ input }): Promise<CouponValidationResult> => {
      const coupon = await getCouponByCode(input.code);
      if (!coupon) return { valid: false, reason: "Coupon code not found." };

      // Status check
      if (coupon.status !== "active") {
        return { valid: false, reason: `Coupon is ${coupon.status}.` };
      }

      // Date range check
      const now = new Date();
      if (coupon.startDate && coupon.startDate > now) {
        return { valid: false, reason: "Coupon is not yet active." };
      }
      if (coupon.expiresAt && coupon.expiresAt < now) {
        return { valid: false, reason: "Coupon has expired." };
      }

      // Usage limit check
      if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        return { valid: false, reason: "Coupon usage limit has been reached." };
      }

      // Plan applicability check
      const plans = coupon.applicablePlans as string[] | null;
      if (plans && plans.length > 0 && !plans.includes(input.planKey)) {
        return { valid: false, reason: "Coupon is not valid for this plan." };
      }

      // Per-user limit check
      if (input.userId) {
        const userCount = await countUserCouponRedemptions(coupon.id, input.userId);
        if (userCount >= coupon.perUserLimit) {
          return { valid: false, reason: "You have already used this coupon." };
        }
      }

      // Calculate discount
      const plan = getPlanByKey(input.planKey);
      if (!plan) return { valid: false, reason: "Invalid plan." };
      const originalAmountCents =
        input.billingPeriod === "annual"
          ? plan.annual.amountCents
          : plan.monthly.amountCents;

      // Min amount check
      if (coupon.minAmount !== null && originalAmountCents < coupon.minAmount) {
        return {
          valid: false,
          reason: `Minimum purchase of $${(coupon.minAmount / 100).toFixed(2)} required.`,
        };
      }

      const { discountAmountCents, finalAmountCents } = calculateDiscount(
        originalAmountCents,
        coupon.discountType,
        coupon.discountValue,
        coupon.maxDiscountAmount ?? null
      );

      return {
        valid: true,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount ?? null,
        duration: coupon.duration,
        durationMonths: coupon.durationMonths ?? null,
        originalAmountCents,
        discountAmountCents,
        finalAmountCents,
        couponId: coupon.id,
        couponName: coupon.name,
      };
    }),

  // ── Protected: create Stripe Checkout session ───────────────────────────────
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planKey: z.enum(["family", "premium_family"]),
        billingPeriod: z.enum(["monthly", "annual"]),
        couponCode: z.string().optional(),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = getPlanByKey(input.planKey);
      if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });

      const amountCents =
        input.billingPeriod === "annual"
          ? plan.annual.amountCents
          : plan.monthly.amountCents;

      // Save billing period to user profile
      await saveUserBillingPeriod(ctx.user.id, input.billingPeriod);

      // Resolve coupon
      let stripeCouponId: string | undefined;
      let couponId: number | undefined;
      let discountAmountCents = 0;
      let finalAmountCents = amountCents;

      if (input.couponCode) {
        const coupon = await getCouponByCode(input.couponCode);
        if (coupon && coupon.status === "active") {
          couponId = coupon.id;
          const calc = calculateDiscount(
            amountCents,
            coupon.discountType,
            coupon.discountValue,
            coupon.maxDiscountAmount ?? null
          );
          discountAmountCents = calc.discountAmountCents;
          finalAmountCents = calc.finalAmountCents;

          // Use Stripe coupon if available, otherwise allow_promotion_codes handles it
          if (coupon.stripeCouponId) {
            stripeCouponId = coupon.stripeCouponId;
          }
        }
      }

      // Get or create Stripe customer
      const stripeCustomerId = await getOrCreateStripeCustomer(
        ctx.user.id,
        ctx.user.email ?? "",
        ctx.user.name
      );

      const priceEntry = input.billingPeriod === "annual" ? plan.annual : plan.monthly;
      const stripePriceId = priceEntry.stripePriceId;

      // Build line items — prefer pre-created Stripe Price ID, with fallback to price_data
      const buildLineItem = (usePriceId: boolean) =>
        usePriceId && stripePriceId
          ? { price: stripePriceId, quantity: 1 }
          : {
              price_data: {
                currency: "usd" as const,
                product_data: {
                  name: `${plan.name} — ${input.billingPeriod === "annual" ? "Annual" : "Monthly"}`,
                  description: plan.features.slice(0, 3).join(" · "),
                },
                unit_amount: amountCents,
                recurring: { interval: (input.billingPeriod === "annual" ? "year" : "month") as "year" | "month" },
              },
              quantity: 1,
            };

      // Try with price ID first, fall back to price_data if price doesn't exist in this Stripe account
      const checkoutParams = {
        customer: stripeCustomerId,
        mode: "subscription" as const,
        payment_method_types: ["card" as const],
        allow_promotion_codes: !stripeCouponId,
        discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            plan_key: input.planKey,
            billing_period: input.billingPeriod,
          },
        },
        client_reference_id: String(ctx.user.id),
        metadata: {
          user_id: String(ctx.user.id),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
          plan_key: input.planKey,
          billing_period: input.billingPeriod,
          coupon_id: couponId ? String(couponId) : "",
        },
        success_url: `${input.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/#pricing`,
      };

      let session;
      try {
        session = await stripe.checkout.sessions.create({
          ...checkoutParams,
          line_items: [buildLineItem(true)],
        });
      } catch (err: any) {
        // If the price ID doesn't exist (e.g., live vs test mode mismatch), fall back to price_data
        if (err?.code === "resource_missing" || err?.message?.includes("No such price")) {
          session = await stripe.checkout.sessions.create({
            ...checkoutParams,
            line_items: [buildLineItem(false)],
          });
        } else {
          throw err;
        }
      }

      // Log the checkout initiation
      await logPaymentEvent({
        userId: ctx.user.id,
        event: "checkout.session.created",
        stripeObjectId: session.id,
        amountCents: finalAmountCents,
        currency: "usd",
        metadata: {
          planKey: input.planKey,
          billingPeriod: input.billingPeriod,
          couponId: couponId ?? null,
        },
      });

      return { url: session.url };
    }),

  // ── Protected: get current user's subscription ──────────────────────────────
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    return getUserSubscription(ctx.user.id);
  }),

  // ── Protected: create Setup Intent for card capture (no charge) ─────────────
  createSetupIntent: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ ctx }) => {
      const stripeCustomerId = await getOrCreateStripeCustomer(
        ctx.user.id,
        ctx.user.email ?? "",
        ctx.user.name
      );
      const si = await createSetupIntent(stripeCustomerId);
      return { clientSecret: si.client_secret, stripeCustomerId };
    }),

  // ── Protected: confirm card captured & activate free plan ───────────────────
  confirmCardAndActivateFreePlan: protectedProcedure
    .input(
      z.object({
        paymentMethodId: z.string(),
        stripeCustomerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get card details from Stripe
      const cardDetails = await getCardDetailsFromPaymentMethod(input.paymentMethodId);
      if (!cardDetails) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment method" });
      }

      // Set as default payment method
      await setDefaultPaymentMethod(input.stripeCustomerId, input.paymentMethodId);

      // Check if user already has a subscription
      const existing = await getUserSubscription(ctx.user.id);
      if (existing) {
        // Just update card on file
        await updateSubscriptionCard(ctx.user.id, cardDetails);
        return { success: true, plan: existing.planName };
      }

      // Create free plan subscription
      await createFreeSubscription(ctx.user.id, input.stripeCustomerId, cardDetails);

      await logPaymentEvent({
        userId: ctx.user.id,
        event: "free_plan.activated",
        stripeObjectId: input.paymentMethodId,
        amountCents: 0,
        currency: "usd",
        metadata: { planKey: "free", stripeCustomerId: input.stripeCustomerId },
      });

      // If this is a parent account, notify linked students that billing is now active
      if (ctx.user.accountType === "parent") {
        try {
          const { getChildrenForParent } = await import("../db");
          const { getDb } = await import("../db");
          const children = await getChildrenForParent(ctx.user.id);
          const db = await getDb();
          if (db && children.length > 0) {
            const { userNotifications } = await import("../../drizzle/schema");
            for (const { child } of children) {
              if (!child) continue;
              // Send in-app notification to each linked student
              await db.insert(userNotifications).values({
                userId: child.id,
                type: "billing_activated",
                title: "Account Activated!",
                message: `Great news! ${ctx.user.name || "Your parent"} has completed billing setup. You now have full access to EduChamp.`,
                isRead: false,
                metadata: JSON.stringify({
                  parentId: ctx.user.id,
                  parentName: ctx.user.name,
                  action: "billing_completed",
                }),
              });
              // Send email notification to student with CAN-SPAM unsubscribe footer
              if (child.email) {
                const { sendEmail } = await import("../emailService");
                const { buildBillingActivatedStudentEmail } = await import("../emailTemplates/billingActivatedStudent");
                const emailData = buildBillingActivatedStudentEmail({
                  studentName: child.name || "there",
                  parentName: ctx.user.name || "Your parent/guardian",
                  loginUrl: "https://educhamp.app",
                });
                await sendEmail({
                  to: child.email,
                  subject: emailData.subject,
                  html: emailData.html,
                  text: emailData.text,
                  templateName: "billing_activated_student",
                }).catch(() => {}); // Non-fatal
              }
            }
          }
        } catch {
          // Non-fatal: don't block billing completion if notification fails
        }
      }

      return { success: true, plan: "free" };
    }),

  // ── Protected: check billing status (card on file + plan) ──────────────────
  getBillingStatus: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getUserSubscription(ctx.user.id);
    // For student accounts without their own subscription, check parent billing coverage
    let coveredByParent = false;
    let parentPlanName: string | null = null;
    if (ctx.user.accountType === "student" && !sub) {
      const coverage = await checkStudentParentBillingCoverage(ctx.user.id);
      coveredByParent = coverage.covered;
      parentPlanName = coverage.planName;
    }
    return {
      hasSubscription: !!sub || coveredByParent,
      cardOnFile: sub?.cardOnFile ?? coveredByParent,
      planName: sub?.planName ?? parentPlanName ?? null,
      status: sub?.status ?? (coveredByParent ? "active" : null),
      suspendedAt: sub?.suspendedAt ?? null,
      maxStudents: sub?.planName ? (getPlanByKey(sub.planName)?.maxStudents ?? 1) : 0,
      coveredByParent,
    };
  }),

  // ── Protected: check if student is covered by parent's billing ──────────
  checkParentBillingCoverage: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.accountType !== "student") {
      return { covered: false, parentId: null, parentName: null, planName: null };
    }
    return checkStudentParentBillingCoverage(ctx.user.id);
  }),

  // ── Protected: check student slot availability for parent ──────────────────
  checkStudentSlots: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getUserSubscription(ctx.user.id);
    if (!sub) return { available: false, current: 0, max: 0, reason: "No subscription" };
    const plan = getPlanByKey(sub.planName);
    const maxStudents = plan?.maxStudents ?? 1;
    const currentStudents = await countParentStudents(ctx.user.id);
    return {
      available: currentStudents < maxStudents,
      current: currentStudents,
      max: maxStudents,
      planName: sub.planName,
    };
  }),

  // ── Protected: update card on file ─────────────────────────────────────────
  updateCard: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await getUserSubscription(ctx.user.id);
      if (!sub?.stripeCustomerId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No subscription found" });
      }
      const cardDetails = await getCardDetailsFromPaymentMethod(input.paymentMethodId);
      if (!cardDetails) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment method" });
      }
      await setDefaultPaymentMethod(sub.stripeCustomerId, input.paymentMethodId);
      await updateSubscriptionCard(ctx.user.id, cardDetails);
      return { success: true, card: cardDetails };
    }),

  // ── Protected: list invoices for current user ─────────────────────────────
  listMyInvoices: protectedProcedure.query(async ({ ctx }) => {
    const sub = await getUserSubscription(ctx.user.id);
    if (!sub?.stripeCustomerId) return { invoices: [] };
    try {
      const invoiceList = await stripe.invoices.list({
        customer: sub.stripeCustomerId,
        limit: 50,
        expand: ["data.charge"],
      });
      const invoices = invoiceList.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        date: inv.created * 1000,
        amountDue: inv.amount_due,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
        description: inv.description || inv.lines?.data?.[0]?.description || null,
        receiptUrl: (inv as any).charge?.receipt_url || null,
      }));
      return { invoices };
    } catch (err) {
      console.error("[listMyInvoices] Stripe error:", err);
      return { invoices: [] };
    }
  }),

  // ── Protected: billing delegation (student requests parent to pay) ─────────
  createBillingDelegation: protectedProcedure
    .input(
      z.object({
        parentEmail: z.string().email(),
        parentName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await createBillingDelegation({
        studentId: ctx.user.id,
        parentEmail: input.parentEmail.toLowerCase(),
        parentName: input.parentName,
        token,
        expiresAt,
      });

      // Send email to parent
      try {
        const { sendEmail } = await import("../emailService");
        await sendEmail({
          to: input.parentEmail,
          subject: `${ctx.user.name ?? "A student"} needs your help to access EduChamp`,
          html: `<p>Hi ${input.parentName ?? "there"},</p>
            <p><strong>${ctx.user.name ?? "A student"}</strong> has requested you to set up billing for their EduChamp account.</p>
            <p>Please log in to EduChamp to review and accept this request. You can add the student to your existing plan or set up a new one.</p>
            <p>This request expires in 7 days.</p>`,
          text: `${ctx.user.name ?? "A student"} has requested you to set up billing for their EduChamp account. Please log in to review.`,
          templateName: "billing_delegation_request",
          referenceId: `delegation_${token}`,
        });
      } catch (err) {
        console.warn("[BillingDelegation] Email send failed:", err);
      }

      return { success: true, expiresAt };
    }),

  // ── Protected: get my billing delegations (student view) ───────────────────
  getMyBillingDelegations: protectedProcedure.query(async ({ ctx }) => {
    return getStudentBillingDelegations(ctx.user.id);
  }),

  // ── Protected: get pending billing delegation requests (parent view) ───────
  getPendingBillingRequests: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.email) return [];
    return getPendingBillingDelegationsForEmail(ctx.user.email);
  }),

  // ── Protected: accept billing delegation (parent) ──────────────────────────
  acceptBillingDelegation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const delegation = await getBillingDelegationByToken(input.token);
      if (!delegation) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (delegation.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
      if (new Date() > delegation.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Request has expired" });

      // Check parent has card on file and plan supports another student
      const sub = await getUserSubscription(ctx.user.id);
      if (!sub?.cardOnFile) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "You must have a card on file to accept this request" });
      }
      const plan = getPlanByKey(sub.planName);
      const maxStudents = plan?.maxStudents ?? 1;
      const currentStudents = await countParentStudents(ctx.user.id);
      if (currentStudents >= maxStudents) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Your ${plan?.name ?? "plan"} supports up to ${maxStudents} students. Please upgrade to add more.`,
        });
      }

      await acceptBillingDelegation(input.token, ctx.user.id);

      // Link the student to the parent and give them free plan access
      const { enrollChild } = await import("../db");
      await enrollChild(ctx.user.id, delegation.studentId);

      // Create free subscription for the student (covered by parent)
      const studentSub = await getUserSubscription(delegation.studentId);
      if (!studentSub) {
        await createFreeSubscription(delegation.studentId, sub.stripeCustomerId ?? "", {
          stripePaymentMethodId: sub.stripePaymentMethodId ?? "",
          cardLast4: sub.cardLast4 ?? "",
          cardBrand: sub.cardBrand ?? "",
          cardExpMonth: sub.cardExpMonth ?? 0,
          cardExpYear: sub.cardExpYear ?? 0,
        });
      }

      return { success: true };
    }),

  // ── Protected: reject billing delegation (parent) ──────────────────────────
  rejectBillingDelegation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const delegation = await getBillingDelegationByToken(input.token);
      if (!delegation) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (delegation.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Request already processed" });
      await rejectBillingDelegation(input.token);
      return { success: true };
    }),

  // ── Protected: open Stripe Customer Portal ──────────────────────────────────
  createPortalSession: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await getUserSubscription(ctx.user.id);
      if (!sub?.stripeCustomerId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active subscription found.",
        });
      }
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${input.origin}/billing`,
      });
      return { url: session.url };
    }),

  // ── Protected: change plan (in-app plan switcher) ──────────────────────────
  changePlan: protectedProcedure
    .input(
      z.object({
        planKey: z.enum(["family", "premium_family"]),
        billingPeriod: z.enum(["monthly", "annual"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = getPlanByKey(input.planKey);
      if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });

      await saveUserBillingPeriod(ctx.user.id, input.billingPeriod);

      const stripeCustomerId = await getOrCreateStripeCustomer(
        ctx.user.id,
        ctx.user.email ?? "",
        ctx.user.name
      );

      const priceEntry = input.billingPeriod === "annual" ? plan.annual : plan.monthly;
      const stripePriceId = priceEntry.stripePriceId;
      const amountCents = priceEntry.amountCents;

      const lineItem = stripePriceId
        ? { price: stripePriceId, quantity: 1 }
        : {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan.name} — ${input.billingPeriod === "annual" ? "Annual" : "Monthly"}`,
              },
              unit_amount: amountCents,
              recurring: { interval: (input.billingPeriod === "annual" ? "year" : "month") as "year" | "month" },
            },
            quantity: 1,
          };

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [lineItem],
        subscription_data: {
          metadata: { plan_key: input.planKey, billing_period: input.billingPeriod },
        },
        client_reference_id: String(ctx.user.id),
        metadata: {
          user_id: String(ctx.user.id),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
          plan_key: input.planKey,
          billing_period: input.billingPeriod,
        },
        success_url: `${input.origin}/billing?plan_changed=1`,
        cancel_url: `${input.origin}/billing`,
      });

      await logPaymentEvent({
        userId: ctx.user.id,
        event: "checkout.session.created",
        stripeObjectId: session.id,
        amountCents,
        currency: "usd",
        metadata: { planKey: input.planKey, billingPeriod: input.billingPeriod, source: "change_plan" },
      });

      return { url: session.url };
    }),

  // ─── Admin: Coupon Management ─────────────────────────────────────────────

  admin: router({
    listCoupons: adminProcedure
      .input(
        z.object({
          status: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().nonnegative().default(0),
        })
      )
      .query(async ({ input }) => {
        return listCoupons(input);
      }),

    getCoupon: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const coupon = await getCouponById(input.id);
        if (!coupon) throw new TRPCError({ code: "NOT_FOUND" });
        const stats = await getCouponRedemptionStats(input.id);
        return { ...coupon, ...stats };
      }),

    createCoupon: adminProcedure
      .input(couponCreateSchema)
      .mutation(async ({ ctx, input }) => {
        // Optionally create a matching Stripe coupon
        let stripeCouponId: string | undefined;
        let stripePromotionCodeId: string | undefined;

        if (ENV.stripeSecretKey) {
          try {
            const sc = await stripe.coupons.create({
              name: input.name,
              ...(input.discountType === "percentage"
                ? { percent_off: input.discountValue }
                : { amount_off: Math.round(input.discountValue), currency: "usd" }),
              duration: input.duration,
              duration_in_months:
                input.duration === "repeating" ? input.durationMonths : undefined,
              max_redemptions: input.usageLimit ?? undefined,
              redeem_by: input.expiresAt
                ? Math.floor(input.expiresAt.getTime() / 1000)
                : undefined,
            });
            stripeCouponId = sc.id;

            // Create a promotion code for the coupon
            // promotionCodes.create takes coupon as a string ID
            // Wrap in try/catch since promo code creation is best-effort
            try {
              const pc = await (stripe.promotionCodes as any).create({
                coupon: sc.id,
                code: input.code,
                max_redemptions: input.usageLimit ?? undefined,
                expires_at: input.expiresAt
                  ? Math.floor(input.expiresAt.getTime() / 1000)
                  : undefined,
              });
              stripePromotionCodeId = pc.id;
            } catch (pcErr) {
              console.warn("[Stripe] Could not create promo code:", pcErr);
            }
          } catch (err) {
            console.warn("[Stripe] Could not create coupon/promo code:", err);
          }
        }

        await createCoupon({
          ...input,
          stripeCouponId,
          stripePromotionCodeId,
          createdBy: ctx.user.id,
        });
        return { success: true };
      }),

    updateCoupon: adminProcedure
      .input(
        z.object({
          id: z.number(),
          data: couponCreateSchema.partial().extend({
            status: z.enum(["active", "paused", "expired", "archived"]).optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateCoupon(input.id, input.data as any);
        return { success: true };
      }),

    archiveCoupon: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateCoupon(input.id, { status: "archived" });
        return { success: true };
      }),

    listSubscriptions: adminProcedure
      .input(
        z.object({
          status: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().nonnegative().default(0),
        })
      )
      .query(async ({ input }) => {
        return listSubscriptions(input);
      }),

    getPaymentAnalytics: adminProcedure.query(async () => {
      return getPaymentAnalytics();
    }),

    // ─── Admin: Subscription Management ─────────────────────────────────────

    listSubscriptionsDetailed: adminProcedure
      .input(
        z.object({
          status: z.string().optional(),
          planName: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().nonnegative().default(0),
        })
      )
      .query(async ({ input }) => {
        return listSubscriptionsWithUsers(input);
      }),

    getSubscription: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const sub = await getSubscriptionById(input.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });
        return sub;
      }),

    suspendSubscription: adminProcedure
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await adminSuspendSubscription(input.id, ctx.user.id, input.reason);
        await logPaymentEvent({
          userId: ctx.user.id,
          event: "admin.subscription.suspended",
          stripeObjectId: String(input.id),
          metadata: { reason: input.reason, adminId: ctx.user.id },
        });
        return { success: true };
      }),

    resumeSubscription: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await adminResumeSubscription(input.id);
        await logPaymentEvent({
          userId: ctx.user.id,
          event: "admin.subscription.resumed",
          stripeObjectId: String(input.id),
          metadata: { adminId: ctx.user.id },
        });
        return { success: true };
      }),

    updateSubscriptionStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["trialing", "active", "past_due", "canceled", "unpaid", "incomplete"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await adminUpdateSubscriptionStatus(input.id, input.status);
        await logPaymentEvent({
          userId: ctx.user.id,
          event: "admin.subscription.status_changed",
          stripeObjectId: String(input.id),
          metadata: { newStatus: input.status, adminId: ctx.user.id },
        });
        return { success: true };
      }),

    cancelSubscription: adminProcedure
      .input(z.object({ id: z.number(), immediate: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        const sub = await getSubscriptionById(input.id);
        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });

        // Cancel in Stripe if there's a Stripe subscription
        if (sub.stripeSubscriptionId) {
          try {
            if (input.immediate) {
              await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
            } else {
              await stripe.subscriptions.update(sub.stripeSubscriptionId, {
                cancel_at_period_end: true,
              });
            }
          } catch (err) {
            console.warn("[Admin] Stripe cancel failed:", err);
          }
        }

        if (input.immediate) {
          await adminUpdateSubscriptionStatus(input.id, "canceled");
        }

        await logPaymentEvent({
          userId: ctx.user.id,
          event: input.immediate ? "admin.subscription.terminated" : "admin.subscription.cancel_scheduled",
          stripeObjectId: String(input.id),
          metadata: { adminId: ctx.user.id, immediate: input.immediate },
        });
        return { success: true };
      }),

    createSubscriptionManual: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          planName: z.enum(["free", "family", "premium_family"]),
          billingPeriod: z.enum(["monthly", "annual"]),
          status: z.enum(["trialing", "active"]).default("active"),
          trialDays: z.number().int().min(0).max(90).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const plan = getPlanByKey(input.planName);
        if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid plan" });

        const user = await getUserById(input.userId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

        let stripeCustomerId: string | undefined;
        if (user.email) {
          stripeCustomerId = await getOrCreateStripeCustomer(input.userId, user.email, user.name);
        }

        const trialEnd = input.trialDays
          ? new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000)
          : undefined;

        await adminCreateSubscription({
          userId: input.userId,
          planName: input.planName,
          billingPeriod: input.billingPeriod,
          status: input.trialDays ? "trialing" : input.status,
          stripeCustomerId,
          amountCents: input.billingPeriod === "annual" ? plan.annual.amountCents : plan.monthly.amountCents,
          trialEnd,
        });

        await logPaymentEvent({
          userId: ctx.user.id,
          event: "admin.subscription.created_manual",
          stripeObjectId: String(input.userId),
          metadata: {
            adminId: ctx.user.id,
            planName: input.planName,
            billingPeriod: input.billingPeriod,
            targetUserId: input.userId,
          },
        });
        return { success: true };
      }),

    getExpiringCards: adminProcedure
      .input(z.object({ withinDays: z.number().int().min(1).max(180).default(30) }))
      .query(async ({ input }) => {
        return getExpiringCardSubscriptions(input.withinDays);
      }),

    listTransactions: adminProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().nonnegative().default(0),
          userId: z.number().optional(),
          event: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return listPaymentAuditLog(input);
      }),

    listCards: adminProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().nonnegative().default(0),
          hasCard: z.boolean().optional(),
        })
      )
      .query(async ({ input }) => {
        return listSubscriptionCards(input);
      }),

    deleteCard: adminProcedure
      .input(z.object({ subscriptionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await adminDeleteCard(input.subscriptionId);
        await logPaymentEvent({
          userId: ctx.user.id,
          event: "admin.card.deleted",
          stripeObjectId: String(input.subscriptionId),
          metadata: { adminId: ctx.user.id },
        });
        return { success: true };
      }),
  }),
});
