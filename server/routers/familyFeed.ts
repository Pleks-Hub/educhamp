import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { familyActivityFeed, parentChildren } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * Record a family feed event. Called internally from other routers
 * when a student completes a task, earns a badge, wins a challenge, etc.
 */
export async function recordFamilyFeedEvent(params: {
  studentId: number;
  studentName: string;
  eventType: string;
  title: string;
  description?: string;
  xpEarned?: number;
  metadata?: Record<string, unknown>;
}) {
  const db = (await getDb())!;
  // Find all parents linked to this student
  const parents = await db
    .select({ parentId: parentChildren.parentId })
    .from(parentChildren)
    .where(and(eq(parentChildren.childId, params.studentId), eq(parentChildren.isActive, true)));

  if (parents.length === 0) return;

  // Insert one feed entry per parent
  const entries = parents.map((p) => ({
    parentId: p.parentId,
    studentId: params.studentId,
    studentName: params.studentName,
    eventType: params.eventType,
    title: params.title,
    description: params.description ?? null,
    metadata: params.metadata ?? null,
    xpEarned: params.xpEarned ?? 0,
  }));

  await db.insert(familyActivityFeed).values(entries);
}

export const familyFeedRouter = router({
  /**
   * Get paginated family activity feed for the current parent
   */
  getFeed: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(30), cursor: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { limit, cursor } = input;

      const db = (await getDb())!;
      // Get all children linked to this parent
      const children = await db
        .select({ childId: parentChildren.childId })
        .from(parentChildren)
        .where(and(eq(parentChildren.parentId, userId), eq(parentChildren.isActive, true)));

      if (children.length === 0) return { items: [], nextCursor: undefined };

      const childIds = children.map((c) => c.childId);

      // Query feed entries
      const conditions = [
        eq(familyActivityFeed.parentId, userId),
      ];
      if (cursor) {
        conditions.push(sql`${familyActivityFeed.id} < ${cursor}`);
      }

      const items = await db
        .select()
        .from(familyActivityFeed)
        .where(and(...conditions))
        .orderBy(desc(familyActivityFeed.createdAt))
        .limit(limit + 1);

      let nextCursor: number | undefined;
      if (items.length > limit) {
        const last = items.pop()!;
        nextCursor = last.id;
      }

      return { items, nextCursor };
    }),

  /**
   * Get feed stats (counts by event type in last 7 days)
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const db = (await getDb())!;

    const stats = await db
      .select({
        eventType: familyActivityFeed.eventType,
        count: sql<number>`COUNT(*)`,
        totalXp: sql<number>`COALESCE(SUM(${familyActivityFeed.xpEarned}), 0)`,
      })
      .from(familyActivityFeed)
      .where(and(
        eq(familyActivityFeed.parentId, userId),
        sql`${familyActivityFeed.createdAt} >= ${sevenDaysAgo}`
      ))
      .groupBy(familyActivityFeed.eventType);

    return stats;
  }),
});
