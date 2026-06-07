import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { sharedTasks, sharedTaskClaims, parentChildren, users, userNotifications } from "../../drizzle/schema";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import { awardXp } from "../gamification/xp";

// ─── Shared Tasks Router ────────────────────────────────────────────────────

export const sharedTasksRouter = router({
  // Parent: Create a shared task for all children
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(256),
      description: z.string().max(1000).optional(),
      category: z.string().max(64).optional(),
      rewardXp: z.number().min(0).max(500).default(15),
      maxClaimants: z.number().min(1).max(10).default(1),
      dueDate: z.string().optional(), // ISO date
      requiresProof: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify user is a parent
      if (ctx.user.role !== "parent" && ctx.user.accountType !== "parent") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only parents can create shared tasks" });
      }

      const [result] = await db.insert(sharedTasks).values({
        parentId: ctx.user.id,
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        rewardXp: input.rewardXp,
        maxClaimants: input.maxClaimants,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        requiresProof: input.requiresProof,
        status: "open",
      }).$returningId();

      // Notify all children about the new shared task
      try {
        const children = await db.select({ childId: parentChildren.childId })
          .from(parentChildren)
          .where(eq(parentChildren.parentId, ctx.user.id));

        if (children.length > 0) {
          await db.insert(userNotifications).values(
            children.map(c => ({
              userId: c.childId,
              type: "shared_task_available",
              title: `New shared task: ${input.title}`,
              message: `${ctx.user.name ?? "Your parent"} posted a shared task. Be the first to claim it!`,
              metadata: JSON.stringify({ sharedTaskId: result.id }),
            }))
          );
        }
      } catch (e) {
        console.log("[SharedTasks] Failed to notify children:", e);
      }

      return { id: result.id };
    }),

  // Parent: List all shared tasks they created
  listForParent: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const tasks = await db.select()
      .from(sharedTasks)
      .where(eq(sharedTasks.parentId, ctx.user.id))
      .orderBy(desc(sharedTasks.createdAt));

    // Get claims for each task
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) return [];

    const claims = await db.select({
      id: sharedTaskClaims.id,
      sharedTaskId: sharedTaskClaims.sharedTaskId,
      studentId: sharedTaskClaims.studentId,
      claimedAt: sharedTaskClaims.claimedAt,
      completedAt: sharedTaskClaims.completedAt,
      proofImageUrl: sharedTaskClaims.proofImageUrl,
      parentConfirmed: sharedTaskClaims.parentConfirmed,
    })
      .from(sharedTaskClaims)
      .where(inArray(sharedTaskClaims.sharedTaskId, taskIds));

    // Get student names
    const studentIds = Array.from(new Set(claims.map(c => c.studentId)));
    let studentMap = new Map<number, string>();
    if (studentIds.length > 0) {
      const studentRows = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, studentIds));
      studentMap = new Map(studentRows.map(s => [s.id, s.name ?? "Student"]));
    }

    return tasks.map(task => ({
      ...task,
      claims: claims
        .filter(c => c.sharedTaskId === task.id)
        .map(c => ({
          ...c,
          studentName: studentMap.get(c.studentId) ?? "Student",
        })),
    }));
  }),

  // Student: List available shared tasks from their parent(s)
  listForStudent: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Get parent IDs for this student
    const parentLinks = await db.select({ parentId: parentChildren.parentId })
      .from(parentChildren)
      .where(eq(parentChildren.childId, ctx.user.id));

    if (parentLinks.length === 0) return [];

    const parentIds = parentLinks.map(p => p.parentId);
    const tasks = await db.select()
      .from(sharedTasks)
      .where(and(
        inArray(sharedTasks.parentId, parentIds),
        eq(sharedTasks.status, "open"),
      ))
      .orderBy(desc(sharedTasks.createdAt));

    // Get all claims for these tasks
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) return [];

    const allClaims = await db.select()
      .from(sharedTaskClaims)
      .where(inArray(sharedTaskClaims.sharedTaskId, taskIds));

    // Get student names for claims
    const studentIds = Array.from(new Set(allClaims.map(c => c.studentId)));
    let studentMap = new Map<number, string>();
    if (studentIds.length > 0) {
      const studentRows = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, studentIds));
      studentMap = new Map(studentRows.map(s => [s.id, s.name ?? "Student"]));
    }

    return tasks.map(task => {
      const taskClaims = allClaims.filter(c => c.sharedTaskId === task.id);
      const myClaim = taskClaims.find(c => c.studentId === ctx.user.id);
      const claimCount = taskClaims.length;
      const isFull = claimCount >= task.maxClaimants;

      return {
        ...task,
        myClaim: myClaim ?? null,
        claimCount,
        isFull,
        claimedBy: taskClaims.map(c => ({
          studentId: c.studentId,
          studentName: studentMap.get(c.studentId) ?? "Student",
          completedAt: c.completedAt,
          parentConfirmed: c.parentConfirmed,
        })),
      };
    });
  }),

  // Student: Claim a shared task
  claim: protectedProcedure
    .input(z.object({ sharedTaskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get the task
      const [task] = await db.select()
        .from(sharedTasks)
        .where(eq(sharedTasks.id, input.sharedTaskId))
        .limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      if (task.status !== "open") throw new TRPCError({ code: "BAD_REQUEST", message: "Task is no longer available" });

      // Check if already claimed by this student
      const [existingClaim] = await db.select()
        .from(sharedTaskClaims)
        .where(and(
          eq(sharedTaskClaims.sharedTaskId, input.sharedTaskId),
          eq(sharedTaskClaims.studentId, ctx.user.id),
        ))
        .limit(1);

      if (existingClaim) throw new TRPCError({ code: "BAD_REQUEST", message: "You already claimed this task" });

      // Check if task is full
      const [claimCount] = await db.select({ count: count() })
        .from(sharedTaskClaims)
        .where(eq(sharedTaskClaims.sharedTaskId, input.sharedTaskId));

      if ((claimCount?.count ?? 0) >= task.maxClaimants) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This task has already been claimed by enough people" });
      }

      // Create claim
      const [result] = await db.insert(sharedTaskClaims).values({
        sharedTaskId: input.sharedTaskId,
        studentId: ctx.user.id,
      }).$returningId();

      // Update task status if now full
      if ((claimCount?.count ?? 0) + 1 >= task.maxClaimants) {
        await db.update(sharedTasks).set({ status: "in_progress" })
          .where(eq(sharedTasks.id, input.sharedTaskId));
      }

      return { claimId: result.id };
    }),

  // Student: Mark a claimed shared task as complete (with optional proof)
  complete: protectedProcedure
    .input(z.object({
      claimId: z.number(),
      proofImageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [claim] = await db.select()
        .from(sharedTaskClaims)
        .where(and(
          eq(sharedTaskClaims.id, input.claimId),
          eq(sharedTaskClaims.studentId, ctx.user.id),
        ))
        .limit(1);

      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
      if (claim.completedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Already completed" });

      await db.update(sharedTaskClaims).set({
        completedAt: new Date(),
        proofImageUrl: input.proofImageUrl ?? null,
      }).where(eq(sharedTaskClaims.id, input.claimId));

      // Notify parent
      try {
        const [task] = await db.select().from(sharedTasks)
          .where(eq(sharedTasks.id, claim.sharedTaskId)).limit(1);
        if (task) {
          await db.insert(userNotifications).values({
            userId: task.parentId,
            type: "shared_task_completed",
            title: `Shared task completed: ${task.title}`,
            message: `${ctx.user.name ?? "Your child"} completed the shared task "${task.title}". Review and confirm!`,
            metadata: JSON.stringify({ sharedTaskId: task.id, claimId: input.claimId }),
          });
        }
      } catch (e) {
        console.log("[SharedTasks] Failed to notify parent:", e);
      }

      return { success: true };
    }),

  // Parent: Confirm or reject a shared task completion
  confirmClaim: protectedProcedure
    .input(z.object({
      claimId: z.number(),
      confirmed: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [claim] = await db.select()
        .from(sharedTaskClaims)
        .where(eq(sharedTaskClaims.id, input.claimId))
        .limit(1);

      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });

      // Verify parent owns the task
      const [task] = await db.select()
        .from(sharedTasks)
        .where(and(
          eq(sharedTasks.id, claim.sharedTaskId),
          eq(sharedTasks.parentId, ctx.user.id),
        ))
        .limit(1);

      if (!task) throw new TRPCError({ code: "FORBIDDEN", message: "Not your task" });

      await db.update(sharedTaskClaims).set({
        parentConfirmed: input.confirmed,
        confirmedAt: new Date(),
      }).where(eq(sharedTaskClaims.id, input.claimId));

      // Award XP if confirmed
      if (input.confirmed && task.rewardXp > 0) {
        await awardXp(claim.studentId, "task_completion", task.rewardXp, `shared_task_${task.id}`, `Shared task: ${task.title}`);
      }

      // Notify student
      try {
        await db.insert(userNotifications).values({
          userId: claim.studentId,
          type: input.confirmed ? "task_confirmed" : "task_rejected",
          title: input.confirmed ? `Shared task approved: ${task.title}` : `Shared task needs redo: ${task.title}`,
          message: input.confirmed
            ? `${ctx.user.name ?? "Your parent"} approved your completion of "${task.title}".${task.rewardXp ? ` You earned ${task.rewardXp} XP!` : ""}`
            : `${ctx.user.name ?? "Your parent"} asked you to redo "${task.title}".`,
        });
      } catch (e) {
        console.log("[SharedTasks] Failed to notify student:", e);
      }

      // Check if all claims are confirmed → mark task as completed
      if (input.confirmed) {
        const allClaims = await db.select()
          .from(sharedTaskClaims)
          .where(eq(sharedTaskClaims.sharedTaskId, task.id));
        const allConfirmed = allClaims.every(c => c.parentConfirmed === true);
        if (allConfirmed) {
          await db.update(sharedTasks).set({ status: "completed" })
            .where(eq(sharedTasks.id, task.id));
        }
      }

      return { success: true };
    }),

  // Parent: Delete a shared task
  delete: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [task] = await db.select()
        .from(sharedTasks)
        .where(and(
          eq(sharedTasks.id, input.taskId),
          eq(sharedTasks.parentId, ctx.user.id),
        ))
        .limit(1);

      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      // Delete claims first, then task
      await db.delete(sharedTaskClaims).where(eq(sharedTaskClaims.sharedTaskId, input.taskId));
      await db.delete(sharedTasks).where(eq(sharedTasks.id, input.taskId));

      return { success: true };
    }),
});
