import { z } from "zod";
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
} from "../db";
import {
  stripe,
  PLANS,
  getPlanByKey,
  calculateDiscount,
  getOrCreateStripeCustomer,
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

      // Build line items — prefer pre-created Stripe Price ID for proper subscription management
      const lineItem = stripePriceId
        ? { price: stripePriceId, quantity: 1 }
        : {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan.name} — ${input.billingPeriod === "annual" ? "Annual" : "Monthly"}`,
                description: plan.features.slice(0, 3).join(" · "),
              },
              unit_amount: amountCents,
              recurring: { interval: (input.billingPeriod === "annual" ? "year" : "month") as "year" | "month" },
            },
            quantity: 1,
          };

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "subscription",
        payment_method_types: ["card", "paypal", "us_bank_account"],
        allow_promotion_codes: !stripeCouponId, // allow manual codes if no server-side coupon
        discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
        line_items: [lineItem],
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
      });

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
        return_url: `${input.origin}/dashboard`,
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
  }),
});
