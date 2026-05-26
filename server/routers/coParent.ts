import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod/v4";
import {
  acceptCoParentInvitation,
  cancelCoParentInvitation,
  createCoParentInvitation,
  getChildProgressSummary,
  getCoParentInvitationByToken,
  getUserByOpenId,
  listCoParentsForStudent,
  listPendingInvitationsForStudent,
  listStudentsForCoParent,
  revokeCoParentAccess,
  verifyCoParentAccess,
} from "../db";
import { notifyOwner } from "../_core/notification";
import { protectedProcedure, router } from "../_core/trpc";

/**
 * Co-parent / guardian router.
 *
 * A "primary parent" is someone who has enrolled a child via the parent module.
 * They can invite additional adults (co-parents, guardians, grandparents) to
 * view-only access for a specific student.
 *
 * Role enforcement:
 *  - accountType "parent" cannot access student quiz/mastery routes (enforced in those routers)
 *  - accountType "student" cannot access this router (enforced below via parentGuard)
 */

/** Middleware: caller must not be a student */
const parentGuard = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.accountType === "student") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Student accounts cannot access parent features.",
    });
  }
  return next({ ctx });
});

export const coParentRouter = router({
  /**
   * Primary parent invites a co-parent by email for a specific student.
   * Returns the invitation token (for building the invite link on the frontend).
   */
  inviteCoParent: parentGuard
    .input(
      z.object({
        studentId: z.number().int().positive(),
        inviteeEmail: z.string().email(),
        inviteeName: z.string().max(256).optional(),
        relationship: z
          .enum(["co-parent", "guardian", "grandparent", "aunt/uncle", "other"])
          .default("guardian"),
        origin: z.string().url(), // frontend must pass window.location.origin
      })
    )
    .mutation(async ({ ctx, input }) => {
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await createCoParentInvitation({
        studentId: input.studentId,
        invitedByParentId: ctx.user.id,
        inviteeEmail: input.inviteeEmail,
        inviteeName: input.inviteeName,
        relationship: input.relationship,
        token,
        expiresAt,
      });

      const inviteUrl = `${input.origin}/accept-invite?token=${token}`;

      // Notify the platform owner
      await notifyOwner({
        title: "Co-parent invitation sent",
        content: `${ctx.user.name ?? "A parent"} invited ${input.inviteeEmail} as a ${input.relationship} for student #${input.studentId}. Link: ${inviteUrl}`,
      });

      return { token, inviteUrl, expiresAt };
    }),

  /**
   * Preview an invitation before accepting (shown on the /accept-invite page).
   * Public — no auth required, just the token.
   */
  previewInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const inv = await getCoParentInvitationByToken(input.token);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });
      if (inv.status === "revoked") throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has been revoked." });
      if (inv.status === "accepted") throw new TRPCError({ code: "CONFLICT", message: "This invitation has already been accepted." });
      if (new Date() > inv.expiresAt) throw new TRPCError({ code: "FORBIDDEN", message: "This invitation has expired." });
      return {
        studentId: inv.studentId,
        inviteeEmail: inv.inviteeEmail,
        inviteeName: inv.inviteeName,
        relationship: inv.relationship,
        expiresAt: inv.expiresAt,
      };
    }),

  /**
   * Logged-in user accepts an invitation.
   * Their account is switched to accountType "parent" if it was "student".
   * ENFORCEMENT: if the invitee is currently a student with quiz/mastery data,
   * we block the acceptance and ask them to use a separate account.
   */
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await getCoParentInvitationByToken(input.token);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found." });
      if (inv.status !== "pending") {
        throw new TRPCError({ code: "CONFLICT", message: "Invitation is no longer valid." });
      }
      if (new Date() > inv.expiresAt) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invitation has expired." });
      }

      // Role separation enforcement: a student account cannot become a co-parent
      if (ctx.user.accountType === "student") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "This account is registered as a student. Please sign in with a different account (or create a new one) to accept a co-parent invitation. A parent account cannot also be a student.",
        });
      }

      const accessRecord = await acceptCoParentInvitation(input.token, ctx.user.id);

      await notifyOwner({
        title: "Co-parent invitation accepted",
        content: `${ctx.user.name ?? ctx.user.email} accepted a co-parent invitation for student #${accessRecord.studentId}.`,
      });

      return { success: true, studentId: accessRecord.studentId };
    }),

  /**
   * List all active co-parents for a specific student.
   * Only the primary parent (who enrolled the child) can see this list.
   */
  listCoParents: parentGuard
    .input(z.object({ studentId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const [active, pending] = await Promise.all([
        listCoParentsForStudent(input.studentId),
        listPendingInvitationsForStudent(input.studentId),
      ]);
      return { active, pending };
    }),

  /**
   * Revoke an active co-parent's access.
   */
  revokeAccess: parentGuard
    .input(z.object({ accessId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await revokeCoParentAccess(input.accessId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Cancel a pending invitation.
   */
  cancelInvitation: parentGuard
    .input(z.object({ invitationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await cancelCoParentInvitation(input.invitationId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Co-parent: list all students they have view access to.
   */
  myStudents: parentGuard.query(async ({ ctx }) => {
    return listStudentsForCoParent(ctx.user.id);
  }),

  /**
   * Co-parent: get full progress for a student they have access to.
   * Enforces that the caller actually has access before returning data.
   */
  getStudentProgress: parentGuard
    .input(z.object({ studentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const hasAccess = await verifyCoParentAccess(ctx.user.id, input.studentId);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this student's data.",
        });
      }
      return getChildProgressSummary(input.studentId);
    }),
});
