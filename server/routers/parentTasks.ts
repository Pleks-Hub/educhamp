import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { parentTasks, parentTaskCompletions, parentChildren, users } from "../../drizzle/schema";
import { eq, and, desc, inArray, sql, lte, gte, isNull } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyParentOwnsStudent(parentId: number, studentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const link = await db.select().from(parentChildren)
    .where(and(eq(parentChildren.parentId, parentId), eq(parentChildren.childId, studentId), eq(parentChildren.isActive, true)))
    .limit(1);
  if (!link.length) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this student" });
  return link[0];
}

async function verifyTaskBelongsToParent(taskId: number, parentId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const task = await db.select().from(parentTasks)
    .where(and(eq(parentTasks.id, taskId), eq(parentTasks.parentId, parentId)))
    .limit(1);
  if (!task.length) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  return task[0];
}

// ─── Parent Procedures ────────────────────────────────────────────────────────

const parentTaskProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.accountType !== "parent") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only parent accounts can manage tasks" });
  }
  return next({ ctx });
});

const studentTaskProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.accountType !== "student") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only student accounts can access student tasks" });
  }
  return next({ ctx });
});

export const parentTasksRouter = router({
  // ─── Parent: Create Task ──────────────────────────────────────────────────────
  create: parentTaskProcedure
    .input(z.object({
      studentId: z.number(),
      title: z.string().min(1).max(256),
      description: z.string().optional(),
      taskType: z.enum(["one_off", "recurring", "time_bound"]),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      dueDate: z.string().optional(), // ISO date string
      startDate: z.string().optional(),
      recurrenceRule: z.enum(["daily", "weekly", "weekdays", "biweekly", "monthly"]).optional(),
      recurrenceDays: z.array(z.string()).optional(), // ["mon","tue",...]
      recurrenceEndDate: z.string().optional(),
      category: z.string().max(64).optional(),
      rewardXp: z.number().min(0).max(500).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyParentOwnsStudent(ctx.user.id, input.studentId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [task] = await db.insert(parentTasks).values({
        parentId: ctx.user.id,
        studentId: input.studentId,
        title: input.title,
        description: input.description ?? null,
        taskType: input.taskType,
        priority: input.priority,
        status: "pending",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        recurrenceRule: input.recurrenceRule ?? null,
        recurrenceDays: input.recurrenceDays ?? null,
        recurrenceEndDate: input.recurrenceEndDate ? new Date(input.recurrenceEndDate) : null,
        category: input.category ?? null,
        rewardXp: input.rewardXp,
      }).$returningId();

      return { success: true, taskId: task.id };
    }),

  // ─── Parent: List Tasks for a Child ───────────────────────────────────────────
  list: parentTaskProcedure
    .input(z.object({
      studentId: z.number(),
      status: z.enum(["all", "pending", "in_progress", "completed", "overdue", "cancelled"]).default("all"),
      taskType: z.enum(["all", "one_off", "recurring", "time_bound"]).default("all"),
    }))
    .query(async ({ ctx, input }) => {
      await verifyParentOwnsStudent(ctx.user.id, input.studentId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [
        eq(parentTasks.parentId, ctx.user.id),
        eq(parentTasks.studentId, input.studentId),
      ];
      if (input.status !== "all") conditions.push(eq(parentTasks.status, input.status));
      if (input.taskType !== "all") conditions.push(eq(parentTasks.taskType, input.taskType));

      const tasks = await db.select().from(parentTasks)
        .where(and(...conditions))
        .orderBy(desc(parentTasks.createdAt));

      // Get completions for these tasks
      const taskIds = tasks.map(t => t.id);
      let completions: typeof parentTaskCompletions.$inferSelect[] = [];
      if (taskIds.length > 0) {
        completions = await db.select().from(parentTaskCompletions)
          .where(inArray(parentTaskCompletions.taskId, taskIds))
          .orderBy(desc(parentTaskCompletions.completedAt));
      }

      return tasks.map(task => ({
        ...task,
        completions: completions.filter(c => c.taskId === task.id),
      }));
    }),

  // ─── Parent: Update Task ──────────────────────────────────────────────────────
  update: parentTaskProcedure
    .input(z.object({
      taskId: z.number(),
      title: z.string().min(1).max(256).optional(),
      description: z.string().optional(),
      taskType: z.enum(["one_off", "recurring", "time_bound"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      status: z.enum(["pending", "in_progress", "completed", "overdue", "cancelled"]).optional(),
      dueDate: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      recurrenceRule: z.enum(["daily", "weekly", "weekdays", "biweekly", "monthly"]).nullable().optional(),
      recurrenceDays: z.array(z.string()).nullable().optional(),
      recurrenceEndDate: z.string().nullable().optional(),
      category: z.string().max(64).nullable().optional(),
      rewardXp: z.number().min(0).max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTaskBelongsToParent(input.taskId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updates: Record<string, any> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.description !== undefined) updates.description = input.description;
      if (input.taskType !== undefined) updates.taskType = input.taskType;
      if (input.priority !== undefined) updates.priority = input.priority;
      if (input.status !== undefined) updates.status = input.status;
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      if (input.startDate !== undefined) updates.startDate = input.startDate ? new Date(input.startDate) : null;
      if (input.recurrenceRule !== undefined) updates.recurrenceRule = input.recurrenceRule;
      if (input.recurrenceDays !== undefined) updates.recurrenceDays = input.recurrenceDays;
      if (input.recurrenceEndDate !== undefined) updates.recurrenceEndDate = input.recurrenceEndDate ? new Date(input.recurrenceEndDate) : null;
      if (input.category !== undefined) updates.category = input.category;
      if (input.rewardXp !== undefined) updates.rewardXp = input.rewardXp;

      if (Object.keys(updates).length > 0) {
        await db.update(parentTasks).set(updates).where(eq(parentTasks.id, input.taskId));
      }

      return { success: true };
    }),

  // ─── Parent: Delete Task ──────────────────────────────────────────────────────
  delete: parentTaskProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await verifyTaskBelongsToParent(input.taskId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Delete completions first, then the task
      await db.delete(parentTaskCompletions).where(eq(parentTaskCompletions.taskId, input.taskId));
      await db.delete(parentTasks).where(eq(parentTasks.id, input.taskId));
      return { success: true };
    }),

  // ─── Parent: Confirm/Reject Completion ────────────────────────────────────────
  confirmCompletion: parentTaskProcedure
    .input(z.object({
      completionId: z.number(),
      confirmed: z.boolean(),
      parentNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Get the completion and verify the parent owns the task
      const [completion] = await db.select().from(parentTaskCompletions)
        .where(eq(parentTaskCompletions.id, input.completionId))
        .limit(1);
      if (!completion) throw new TRPCError({ code: "NOT_FOUND", message: "Completion not found" });

      await verifyTaskBelongsToParent(completion.taskId, ctx.user.id);

      await db.update(parentTaskCompletions).set({
        parentConfirmed: input.confirmed,
        parentConfirmedAt: new Date(),
        parentNote: input.parentNote ?? null,
      }).where(eq(parentTaskCompletions.id, input.completionId));

      // If confirmed and task is one_off, mark the task as completed
      if (input.confirmed) {
        const [task] = await db.select().from(parentTasks)
          .where(eq(parentTasks.id, completion.taskId)).limit(1);
        if (task && task.taskType === "one_off") {
          await db.update(parentTasks).set({ status: "completed" })
            .where(eq(parentTasks.id, task.id));
        }
        // Award XP if configured
        if (task && task.rewardXp && task.rewardXp > 0) {
          try {
            const { awardXp } = await import("../gamification/xp");
            await awardXp(completion.studentId, "task_completion", task.rewardXp, `Completed task: ${task.title}`);
          } catch (e) {
            console.log(`[Tasks] Failed to award XP for task ${task.id}:`, e);
          }
        }
      }

      return { success: true };
    }),

  // ─── Parent: Get Task Stats for a Child ───────────────────────────────────────
  getStats: parentTaskProcedure
    .input(z.object({ studentId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyParentOwnsStudent(ctx.user.id, input.studentId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const allTasks = await db.select().from(parentTasks)
        .where(and(eq(parentTasks.parentId, ctx.user.id), eq(parentTasks.studentId, input.studentId)));

      const pending = allTasks.filter(t => t.status === "pending").length;
      const inProgress = allTasks.filter(t => t.status === "in_progress").length;
      const completed = allTasks.filter(t => t.status === "completed").length;
      const overdue = allTasks.filter(t => t.status === "overdue").length;

      return { total: allTasks.length, pending, inProgress, completed, overdue };
    }),

  // ═══════════════════════════════════════════════════════════════════════════════
  // ─── Student Endpoints ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════════

  // ─── Student: Get My Tasks ────────────────────────────────────────────────────
  getMyTasks: studentTaskProcedure
    .input(z.object({
      status: z.enum(["all", "pending", "in_progress", "completed", "overdue", "cancelled"]).default("all"),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const status = input?.status ?? "all";

      const conditions = [eq(parentTasks.studentId, ctx.user.id)];
      if (status !== "all") conditions.push(eq(parentTasks.status, status));

      const tasks = await db.select({
        task: parentTasks,
        parentName: users.name,
      }).from(parentTasks)
        .leftJoin(users, eq(users.id, parentTasks.parentId))
        .where(and(...conditions))
        .orderBy(desc(parentTasks.createdAt));

      // Get completions for these tasks
      const taskIds = tasks.map(t => t.task.id);
      let completions: typeof parentTaskCompletions.$inferSelect[] = [];
      if (taskIds.length > 0) {
        completions = await db.select().from(parentTaskCompletions)
          .where(and(
            inArray(parentTaskCompletions.taskId, taskIds),
            eq(parentTaskCompletions.studentId, ctx.user.id),
          ))
          .orderBy(desc(parentTaskCompletions.completedAt));
      }

      return tasks.map(({ task, parentName }) => ({
        ...task,
        assignedBy: parentName ?? "Parent",
        completions: completions.filter(c => c.taskId === task.id),
        latestCompletion: completions.find(c => c.taskId === task.id) ?? null,
      }));
    }),

  // ─── Student: Mark Task Complete ──────────────────────────────────────────────
  markComplete: studentTaskProcedure
    .input(z.object({
      taskId: z.number(),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Verify the task belongs to this student
      const [task] = await db.select().from(parentTasks)
        .where(and(eq(parentTasks.id, input.taskId), eq(parentTasks.studentId, ctx.user.id)))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      if (task.status === "completed" || task.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Task is already completed or cancelled" });
      }

      // For non-recurring tasks, check if there's already a pending completion
      if (task.taskType !== "recurring") {
        const [existing] = await db.select().from(parentTaskCompletions)
          .where(and(
            eq(parentTaskCompletions.taskId, input.taskId),
            eq(parentTaskCompletions.studentId, ctx.user.id),
            isNull(parentTaskCompletions.parentConfirmed),
          ))
          .limit(1);
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Completion already submitted, waiting for parent confirmation" });
      }

      const [completion] = await db.insert(parentTaskCompletions).values({
        taskId: input.taskId,
        studentId: ctx.user.id,
        note: input.note ?? null,
      }).$returningId();

      // Update task status to in_progress (awaiting parent confirmation)
      if (task.status === "pending") {
        await db.update(parentTasks).set({ status: "in_progress" })
          .where(eq(parentTasks.id, input.taskId));
      }

      return { success: true, completionId: completion.id };
    }),

  // ─── Student: Get Task Summary (for dashboard widget) ─────────────────────────
  getMyTaskSummary: studentTaskProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const tasks = await db.select().from(parentTasks)
      .where(and(
        eq(parentTasks.studentId, ctx.user.id),
        inArray(parentTasks.status, ["pending", "in_progress", "overdue"]),
      ))
      .orderBy(parentTasks.dueDate);

    const now = new Date();
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "overdue").length;
    const dueSoon = tasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      const diff = due.getTime() - now.getTime();
      return diff > 0 && diff < 24 * 60 * 60 * 1000; // due within 24h
    }).length;

    return {
      totalActive: tasks.length,
      overdue,
      dueSoon,
      tasks: tasks.slice(0, 5), // top 5 for widget
    };
  }),
});
