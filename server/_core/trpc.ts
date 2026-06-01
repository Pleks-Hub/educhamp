import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// studentProcedure: blocks parent/guardian accounts from taking quizzes, diagnostics, or accumulating mastery
// Also enforces the COPPA gate: students under 14 (EduChamp policy) with pending/denied/expired consent are blocked.
export const studentProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (ctx.user.accountType === "parent") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Parent accounts cannot take quizzes, assessments, or accumulate mastery scores. Please use a student account.",
      });
    }

    // COPPA gate: check if this student requires parental consent
    try {
      const { getPlatformSettings, getUserProfile, requiresCoppaConsentByAge, hasParentalConsent, getLatestParentalConsent } = await import("../db");
      const settings = await getPlatformSettings();
      const gateEnabled = settings.find((s) => s.key === "COPPA_GATE_ENABLED")?.value === "true";
      if (gateEnabled) {
        const profile = await getUserProfile(ctx.user.id);
        // Use DOB-based age check (< 13) when DOB is available; fall back to grade-level heuristic
        if (profile && requiresCoppaConsentByAge(profile.dateOfBirth, profile.gradeLevel)) {
          const approved = await hasParentalConsent(ctx.user.id);
          if (!approved) {
            const latest = await getLatestParentalConsent(ctx.user.id);
            const isExpired = latest && (latest.status === "expired" || latest.expiresAt < new Date());
            const isDenied = latest?.status === "denied";
            if (isDenied) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "COPPA_CONSENT_DENIED",
              });
            }
            if (isExpired) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "COPPA_CONSENT_EXPIRED",
              });
            }
            if (latest?.status === "pending") {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "COPPA_CONSENT_PENDING",
              });
            }
            // No request yet — block with not_requested
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "COPPA_CONSENT_REQUIRED",
            });
          }
        }
      }
    } catch (err) {
      // Re-throw TRPCErrors (COPPA gate); swallow DB errors to avoid blocking on infra failure
      if (err instanceof TRPCError) throw err;
      console.error("[COPPA gate] DB error (non-blocking):", err);
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
