import { z } from "zod/v4";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { parentTasks, parentTaskCompletions, parentChildren, users, userNotifications, taskCategories } from "../../drizzle/schema";
import { eq, and, desc, inArray, sql, lte, gte, isNull } from "drizzle-orm";
import { storagePut } from "../storage";

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
      requiresProof: z.boolean().default(false),
      encouragementNote: z.string().max(500).optional(),
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
        requiresProof: input.requiresProof,
        encouragementNote: input.encouragementNote ?? null,
      }).$returningId();

      // Notify student of new task assignment
      try {
        await db.insert(userNotifications).values({
          userId: input.studentId,
          type: "task_assigned",
          title: `New task: ${input.title}`,
          message: `${ctx.user.name ?? "Your parent"} assigned you a new ${input.taskType.replace("_", " ")} task${input.dueDate ? " due " + new Date(input.dueDate).toLocaleDateString() : ""}.`,
          metadata: JSON.stringify({ taskId: task.id, parentId: ctx.user.id, priority: input.priority }),
        });
      } catch (e) { console.log("[Tasks] Failed to send task_assigned notification:", e); }

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
      requiresProof: z.boolean().optional(),
      encouragementNote: z.string().max(500).nullable().optional(),
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
      if (input.requiresProof !== undefined) updates.requiresProof = input.requiresProof;
      if (input.encouragementNote !== undefined) updates.encouragementNote = input.encouragementNote;

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
      bonusXp: z.number().min(0).max(500).optional(),
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

      // Get task details for notification
      const [task] = await db.select().from(parentTasks)
        .where(eq(parentTasks.id, completion.taskId)).limit(1);

      // If confirmed and task is one_off, mark the task as completed
      if (input.confirmed) {
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
        // Award bonus XP from parent (extra effort recognition)
        if (input.bonusXp && input.bonusXp > 0) {
          try {
            const { awardXp } = await import("../gamification/xp");
            await awardXp(completion.studentId, "parent_bonus", input.bonusXp, `Parent bonus for: ${task?.title ?? "task"}`);
          } catch (e) {
            console.log(`[Tasks] Failed to award bonus XP:`, e);
          }
        }
        // Check task milestone badges
        try {
          const confirmedCount = await db.select({ count: sql<number>`COUNT(*)` })
            .from(parentTaskCompletions)
            .where(and(
              eq(parentTaskCompletions.studentId, completion.studentId),
              eq(parentTaskCompletions.parentConfirmed, true),
            ));
          const totalConfirmed = confirmedCount[0]?.count ?? 0;
          const { checkAndAwardBadges } = await import("../gamification/badges");
          await checkAndAwardBadges(completion.studentId, { type: "task_complete", completedTaskCount: totalConfirmed });
        } catch (e) {
          console.log(`[Tasks] Failed to check task badges for student ${completion.studentId}:`, e);
        }
      }

      // Notify student of confirmation/rejection
      try {
        const taskTitle = task?.title ?? "a task";
        await db.insert(userNotifications).values({
          userId: completion.studentId,
          type: input.confirmed ? "task_confirmed" : "task_rejected",
          title: input.confirmed ? `Task approved: ${taskTitle}` : `Task needs redo: ${taskTitle}`,
          message: input.confirmed
            ? `${ctx.user.name ?? "Your parent"} confirmed your completion of "${taskTitle}".${task?.rewardXp ? ` You earned ${task.rewardXp} XP!` : ""}`
            : `${ctx.user.name ?? "Your parent"} asked you to redo "${taskTitle}".${input.parentNote ? ` Note: ${input.parentNote}` : ""}`,
          metadata: JSON.stringify({ taskId: completion.taskId, completionId: input.completionId, confirmed: input.confirmed }),
        });
      } catch (e) { console.log("[Tasks] Failed to send task confirmation notification:", e); }

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

  // ─── Student: Upload Proof Image ──────────────────────────────────────────────
  uploadProof: studentTaskProcedure
    .input(z.object({
      taskId: z.number(),
      imageBase64: z.string(), // base64 encoded image
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Verify the task belongs to this student
      const [task] = await db.select().from(parentTasks)
        .where(and(eq(parentTasks.id, input.taskId), eq(parentTasks.studentId, ctx.user.id)))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      // Upload to S3
      const ext = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
      const fileKey = `task-proofs/${ctx.user.id}/${input.taskId}-${Date.now()}.${ext}`;
      const buffer = Buffer.from(input.imageBase64, "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Image must be under 5MB" });
      }
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return { success: true, proofUrl: url };
    }),

  // ─── Student: Mark Task Complete ──────────────────────────────────────────────
  markComplete: studentTaskProcedure
    .input(z.object({
      taskId: z.number(),
      note: z.string().max(500).optional(),
      proofImageUrl: z.string().optional(),
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
        proofImageUrl: input.proofImageUrl ?? null,
      }).$returningId();

      // Update task status to in_progress (awaiting parent confirmation)
      if (task.status === "pending") {
        await db.update(parentTasks).set({ status: "in_progress" })
          .where(eq(parentTasks.id, input.taskId));
      }

      // Notify parent that student submitted completion
      try {
        await db.insert(userNotifications).values({
          userId: task.parentId,
          type: "task_completion_submitted",
          title: `Task done: ${task.title}`,
          message: `${ctx.user.name ?? "Your student"} marked "${task.title}" as done and is waiting for your confirmation.`,
          metadata: JSON.stringify({ taskId: input.taskId, completionId: completion.id, studentId: ctx.user.id }),
        });
      } catch (e) { console.log("[Tasks] Failed to send task_completion_submitted notification:", e); }

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

  // ═══════════════════════════════════════════════════════════════════════════════
  // ─── Category Management (Parent) ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════════

  getCategories: parentTaskProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Seed default categories if none exist for this parent
    const existing = await db.select().from(taskCategories)
      .where(eq(taskCategories.parentId, ctx.user.id));
    if (existing.length === 0) {
      const defaults = [
        { name: "Chores", color: "#f59e0b", icon: "home" },
        { name: "Homework", color: "#3b82f6", icon: "book-open" },
        { name: "Reading", color: "#8b5cf6", icon: "book" },
        { name: "Exercise", color: "#10b981", icon: "heart-pulse" },
        { name: "Creative", color: "#ec4899", icon: "palette" },
      ];
      await db.insert(taskCategories).values(
        defaults.map((d, i) => ({ ...d, parentId: ctx.user.id, isDefault: true, sortOrder: i }))
      );
      return (await db.select().from(taskCategories)
        .where(eq(taskCategories.parentId, ctx.user.id))
        .orderBy(taskCategories.sortOrder));
    }
    return existing.sort((a, b) => a.sortOrder - b.sortOrder);
  }),

  createCategory: parentTaskProcedure
    .input(z.object({
      name: z.string().min(1).max(64),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
      icon: z.string().max(32).default("folder"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Check for duplicate
      const [dup] = await db.select().from(taskCategories)
        .where(and(eq(taskCategories.parentId, ctx.user.id), eq(taskCategories.name, input.name)))
        .limit(1);
      if (dup) throw new TRPCError({ code: "CONFLICT", message: "Category with this name already exists" });
      // Get max sortOrder
      const all = await db.select({ sortOrder: taskCategories.sortOrder }).from(taskCategories)
        .where(eq(taskCategories.parentId, ctx.user.id));
      const maxSort = all.length > 0 ? Math.max(...all.map(a => a.sortOrder)) : 0;
      const [cat] = await db.insert(taskCategories).values({
        parentId: ctx.user.id,
        name: input.name,
        color: input.color,
        icon: input.icon,
        sortOrder: maxSort + 1,
      }).$returningId();
      return { success: true, categoryId: cat.id };
    }),

  updateCategory: parentTaskProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(64).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      icon: z.string().max(32).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [cat] = await db.select().from(taskCategories)
        .where(and(eq(taskCategories.id, input.id), eq(taskCategories.parentId, ctx.user.id)))
        .limit(1);
      if (!cat) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
      const updates: Record<string, unknown> = {};
      if (input.name) updates.name = input.name;
      if (input.color) updates.color = input.color;
      if (input.icon) updates.icon = input.icon;
      if (Object.keys(updates).length > 0) {
        await db.update(taskCategories).set(updates)
          .where(eq(taskCategories.id, input.id));
      }
      return { success: true };
    }),

  deleteCategory: parentTaskProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [cat] = await db.select().from(taskCategories)
        .where(and(eq(taskCategories.id, input.id), eq(taskCategories.parentId, ctx.user.id)))
        .limit(1);
      if (!cat) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
      // Clear category from tasks using this category name
      await db.update(parentTasks).set({ category: null })
        .where(and(eq(parentTasks.parentId, ctx.user.id), eq(parentTasks.category, cat.name)));
      await db.delete(taskCategories).where(eq(taskCategories.id, input.id));
      return { success: true };
    }),

  // ─── Student: Get Tasks for Calendar View ──────────────────────────────────
  getTaskCalendar: studentTaskProcedure
    .input(z.object({
      startDate: z.string(), // ISO date
      endDate: z.string(),   // ISO date
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);

      const tasks = await db.select().from(parentTasks)
        .where(and(
          eq(parentTasks.studentId, ctx.user.id),
          inArray(parentTasks.status, ["pending", "in_progress", "overdue", "completed"]),
        ))
        .orderBy(parentTasks.dueDate);

      // Filter tasks that fall within the date range
      return tasks.filter(t => {
        const dueDate = t.dueDate ? new Date(t.dueDate) : null;
        if (dueDate && dueDate >= start && dueDate <= end) return true;
        const startDate = t.startDate ? new Date(t.startDate) : null;
        if (startDate && startDate >= start && startDate <= end) return true;
        return false;
      }).map(t => ({
        id: t.id,
        title: t.title,
        taskType: t.taskType,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate?.toISOString() ?? null,
        startDate: t.startDate?.toISOString() ?? null,
        category: t.category,
        rewardXp: t.rewardXp,
      }));
    }),
});
