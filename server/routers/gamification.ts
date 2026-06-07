/**
 * server/routers/gamification.ts
 * tRPC gamification router — XP, levels, badges, quests, streaks, houses, rewards marketplace.
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getStudentXpSummary } from "../gamification/xp";
import { getLevelProgress } from "../gamification/levels";
import { getBadgesForUser, markBadgesSeen, seedDefaultBadges } from "../gamification/badges";
import { getStreak, addStreakFreeze } from "../gamification/streaks";
import { getQuestsForUser, assignDailyQuests, seedDefaultQuests } from "../gamification/quests";
import { getUserHouse, getHouseLeaderboard, assignHouse, seedDefaultHouses } from "../gamification/houses";
import { getDb } from "../db";
import {
  studentLevels,
  xpLedger,
  rewardsMarketplace,
  rewardRedemptions,
  userAvatars,
  users,
  seasonalChallenges,
  userSeasonalProgress,
} from "../../drizzle/schema";
import { and, eq, desc, sql, count } from "drizzle-orm";

export const gamificationRouter = router({
  // ── Bootstrap (idempotent seed) ──────────────────────────────────────────
  bootstrap: publicProcedure.mutation(async () => {
    await seedDefaultBadges();
    await seedDefaultQuests();
    await seedDefaultHouses();
    return { ok: true };
  }),

  // ── Get full gamification profile ────────────────────────────────────────
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Ensure quests are assigned for today
    await assignDailyQuests(userId);

    const [xpSummary, streak, badges, quests, house] = await Promise.all([
      getStudentXpSummary(userId),
      getStreak(userId),
      getBadgesForUser(userId),
      getQuestsForUser(userId),
      getUserHouse(userId),
    ]);

    const levelProgress = getLevelProgress(xpSummary?.totalXp ?? 0);

    return {
      xp: xpSummary,
      level: levelProgress,
      streak,
      badges: {
        earned: badges.earned,
        all: badges.all,
        earnedCount: badges.earned.length,
        totalCount: badges.all.length,
        newCount: badges.earned.filter((b) => b.isNew).length,
      },
      quests,
      house,
    };
  }),

  // ── Get XP leaderboard ────────────────────────────────────────────────────
  getLeaderboard: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          userId: studentLevels.userId,
          totalXp: studentLevels.totalXp,
          currentLevel: studentLevels.currentLevel,
          currentLevelName: studentLevels.currentLevelName,
          displayName: users.name,
        })
        .from(studentLevels)
        .innerJoin(users, eq(studentLevels.userId, users.id))
        .orderBy(desc(studentLevels.totalXp))
        .limit(input.limit);

      return rows.map((r, i) => ({ ...r, rank: i + 1 }));
    }),

  // ── Get all badges (with earned state) ───────────────────────────────────
  getBadges: protectedProcedure.query(async ({ ctx }) => {
    return getBadgesForUser(ctx.user.id);
  }),

  // ── Mark badges as seen ───────────────────────────────────────────────────
  markBadgesSeen: protectedProcedure
    .input(z.object({ badgeIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      await markBadgesSeen(ctx.user.id, input.badgeIds);
      return { ok: true };
    }),

  // ── Get quests ────────────────────────────────────────────────────────────
  getQuests: protectedProcedure.query(async ({ ctx }) => {
    await assignDailyQuests(ctx.user.id);
    return getQuestsForUser(ctx.user.id);
  }),

  // ── Get streak ────────────────────────────────────────────────────────────
  getStreak: protectedProcedure.query(async ({ ctx }) => {
    return getStreak(ctx.user.id);
  }),

  // ── Use streak freeze ─────────────────────────────────────────────────────
  addStreakFreeze: protectedProcedure
    .input(z.object({ count: z.number().min(1).max(3).default(1) }))
    .mutation(async ({ ctx, input }) => {
      await addStreakFreeze(ctx.user.id, input.count);
      return { ok: true };
    }),

  // ── Get house leaderboard ─────────────────────────────────────────────────
  getHouseLeaderboard: protectedProcedure.query(async () => {
    return getHouseLeaderboard();
  }),

  // ── Assign house ──────────────────────────────────────────────────────────
  assignHouse: protectedProcedure.mutation(async ({ ctx }) => {
    return assignHouse(ctx.user.id);
  }),

  // ── XP history ────────────────────────────────────────────────────────────
  getXpHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(xpLedger)
        .where(eq(xpLedger.userId, ctx.user.id))
        .orderBy(desc(xpLedger.createdAt))
        .limit(input.limit);
    }),

  // ── Rewards marketplace ───────────────────────────────────────────────────
  getRewards: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select()
      .from(rewardsMarketplace)
      .where(and(eq(rewardsMarketplace.childUserId, ctx.user.id), eq(rewardsMarketplace.isActive, true)));
  }),

  createReward: protectedProcedure
    .input(z.object({
      childUserId: z.number(),
      rewardTitle: z.string().min(1).max(256),
      xpCost: z.number().min(50).max(50000),
      category: z.enum(["screen_time", "outing", "treat", "custom"]).default("custom"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const [row] = await db
        .insert(rewardsMarketplace)
        .values({ parentUserId: ctx.user.id, ...input });
      return row;
    }),

  redeemReward: protectedProcedure
    .input(z.object({ rewardId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("db_unavailable");

      const userId = ctx.user.id;

      // Get reward
      const [reward] = await db
        .select()
        .from(rewardsMarketplace)
        .where(and(eq(rewardsMarketplace.id, input.rewardId), eq(rewardsMarketplace.childUserId, userId), eq(rewardsMarketplace.isActive, true)))
        .limit(1);

      if (!reward) throw new Error("reward_not_found");

      // Check XP balance
      const [levelRow] = await db.select({ totalXp: studentLevels.totalXp }).from(studentLevels).where(eq(studentLevels.userId, userId)).limit(1);
      const totalXp = levelRow?.totalXp ?? 0;
      if (totalXp < reward.xpCost) throw new Error("insufficient_xp");

      // Deduct XP (insert negative ledger entry)
      await db.insert(xpLedger).values({
        userId,
        amount: -reward.xpCost,
        source: "reward_redemption",
        sourceId: String(reward.id),
        description: `Redeemed: ${reward.rewardTitle}`,
      });

      // Update total XP
      await db
        .update(studentLevels)
        .set({ totalXp: sql`totalXp - ${reward.xpCost}` })
        .where(eq(studentLevels.userId, userId));

      // Record redemption
      await db.insert(rewardRedemptions).values({
        userId,
        rewardId: reward.id,
        xpSpent: reward.xpCost,
        status: "pending",
      });

      return { ok: true, xpSpent: reward.xpCost };
    }),

  // ── Avatar ────────────────────────────────────────────────────────────────
  getAvatar: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const [row] = await db
      .select()
      .from(userAvatars)
      .where(eq(userAvatars.userId, ctx.user.id))
      .limit(1);

    return row ?? { userId: ctx.user.id, avatarStyle: "default", accessories: "[]", backgroundColor: "#4f46e5", petName: null, unlockedItems: "[]" };
  }),

  updateAvatar: protectedProcedure
    .input(z.object({
      avatarStyle: z.string().max(64).optional(),
      backgroundColor: z.string().max(32).optional(),
      petName: z.string().max(64).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      await db
        .insert(userAvatars)
        .values({ userId: ctx.user.id, avatarStyle: input.avatarStyle ?? "default", backgroundColor: input.backgroundColor ?? "#4f46e5", petName: input.petName ?? null })
        .onDuplicateKeyUpdate({ set: input });

      return { ok: true };
    }),

  // ── Parent: get child gamification summary ─────────────────────────────────
  getChildGamificationSummary: protectedProcedure
    .input(z.object({ childId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify parent-child link
      const db = await getDb();
      if (!db) return null;

      const { parentChildren } = await import("../../drizzle/schema");
      const link = await db
        .select()
        .from(parentChildren)
        .where(and(eq(parentChildren.parentId, ctx.user.id), eq(parentChildren.childId, input.childId)))
        .limit(1);

      if (link.length === 0) return null;

      const [xp, streak, badges, quests, house] = await Promise.all([
        getStudentXpSummary(input.childId),
        getStreak(input.childId),
        getBadgesForUser(input.childId),
        getQuestsForUser(input.childId),
        getUserHouse(input.childId),
      ]);

      const levelProgress = getLevelProgress(xp?.totalXp ?? 0);
      const allBadges = Array.isArray(badges) ? badges : [];
      const allQuests = [
        ...(quests?.daily ?? []),
        ...(quests?.weekly ?? []),
        ...(quests?.monthly ?? []),
      ];

      return {
        xp,
        level: levelProgress,
        streak,
        badges: {
          earnedCount: allBadges.filter((b: any) => b.earned).length,
          recent: allBadges.filter((b: any) => b.earned).slice(0, 8),
        },
        quests: allQuests.filter((q: any) => !q.completed).slice(0, 3),
        house,
      };
    }),

  // ── Seasonal Challenges ────────────────────────────────────────────────────
  getActiveSeasonalChallenge: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const now = new Date();
    // Find the currently active challenge (isActive = true AND within date range)
    const [challenge] = await db
      .select()
      .from(seasonalChallenges)
      .where(and(
        eq(seasonalChallenges.isActive, true),
        sql`${seasonalChallenges.startDate} <= ${now}`,
        sql`${seasonalChallenges.endDate} >= ${now}`,
      ))
      .orderBy(desc(seasonalChallenges.startDate))
      .limit(1);
    if (!challenge) return null;
    // Get user progress for this challenge
    const [progress] = await db
      .select()
      .from(userSeasonalProgress)
      .where(and(
        eq(userSeasonalProgress.userId, ctx.user.id),
        eq(userSeasonalProgress.challengeId, challenge.id),
      ))
      .limit(1);
    const daysLeft = Math.max(0, Math.ceil(
      (new Date(challenge.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));
    return {
      ...challenge,
      userProgress: progress?.progress ?? 0,
      completed: !!progress?.completedAt,
      daysLeft,
    };
  }),

  // ── Parent: get pending redemptions for their children ─────────────────────
  getChildRedemptions: protectedProcedure
    .input(z.object({ childId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get all rewards created by this parent
      const parentRewards = await db
        .select({ id: rewardsMarketplace.id })
        .from(rewardsMarketplace)
        .where(eq(rewardsMarketplace.parentUserId, ctx.user.id));

      if (parentRewards.length === 0) return [];

      const rewardIds = parentRewards.map(r => r.id);

      // Get redemptions for those rewards
      const redemptions = await db
        .select({
          id: rewardRedemptions.id,
          userId: rewardRedemptions.userId,
          rewardId: rewardRedemptions.rewardId,
          redeemedAt: rewardRedemptions.redeemedAt,
          xpSpent: rewardRedemptions.xpSpent,
          status: rewardRedemptions.status,
          rewardTitle: rewardsMarketplace.rewardTitle,
          category: rewardsMarketplace.category,
          childName: users.name,
        })
        .from(rewardRedemptions)
        .innerJoin(rewardsMarketplace, eq(rewardRedemptions.rewardId, rewardsMarketplace.id))
        .innerJoin(users, eq(rewardRedemptions.userId, users.id))
        .where(
          input.childId
            ? and(
                sql`${rewardRedemptions.rewardId} IN (${sql.raw(rewardIds.join(','))})`  ,
                eq(rewardRedemptions.userId, input.childId),
              )
            : sql`${rewardRedemptions.rewardId} IN (${sql.raw(rewardIds.join(','))})`,
        )
        .orderBy(desc(rewardRedemptions.redeemedAt));

      return redemptions;
    }),

  // ── Parent: approve a redemption ──────────────────────────────────────────
  approveRedemption: protectedProcedure
    .input(z.object({ redemptionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("db_unavailable");

      // Verify this redemption belongs to a reward the parent created
      const [redemption] = await db
        .select({
          id: rewardRedemptions.id,
          status: rewardRedemptions.status,
          parentUserId: rewardsMarketplace.parentUserId,
        })
        .from(rewardRedemptions)
        .innerJoin(rewardsMarketplace, eq(rewardRedemptions.rewardId, rewardsMarketplace.id))
        .where(eq(rewardRedemptions.id, input.redemptionId))
        .limit(1);

      if (!redemption || redemption.parentUserId !== ctx.user.id) {
        throw new Error("not_found");
      }
      if (redemption.status !== "pending") {
        throw new Error("already_processed");
      }

      await db
        .update(rewardRedemptions)
        .set({ status: "approved" })
        .where(eq(rewardRedemptions.id, input.redemptionId));

      return { ok: true };
    }),

  // ── Parent: reject a redemption (refund XP) ───────────────────────────────
  rejectRedemption: protectedProcedure
    .input(z.object({ redemptionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("db_unavailable");

      const [redemption] = await db
        .select({
          id: rewardRedemptions.id,
          userId: rewardRedemptions.userId,
          xpSpent: rewardRedemptions.xpSpent,
          status: rewardRedemptions.status,
          parentUserId: rewardsMarketplace.parentUserId,
        })
        .from(rewardRedemptions)
        .innerJoin(rewardsMarketplace, eq(rewardRedemptions.rewardId, rewardsMarketplace.id))
        .where(eq(rewardRedemptions.id, input.redemptionId))
        .limit(1);

      if (!redemption || redemption.parentUserId !== ctx.user.id) {
        throw new Error("not_found");
      }
      if (redemption.status !== "pending") {
        throw new Error("already_processed");
      }

      // Refund XP
      await db.insert(xpLedger).values({
        userId: redemption.userId,
        amount: redemption.xpSpent,
        source: "reward_refund",
        sourceId: String(input.redemptionId),
        description: "Reward redemption rejected — XP refunded",
      });
      await db
        .update(studentLevels)
        .set({ totalXp: sql`totalXp + ${redemption.xpSpent}` })
        .where(eq(studentLevels.userId, redemption.userId));

      await db
        .update(rewardRedemptions)
        .set({ status: "rejected" })
        .where(eq(rewardRedemptions.id, input.redemptionId));

      return { ok: true, xpRefunded: redemption.xpSpent };
    }),

  // ── Task XP Leaderboard (scoped to siblings) ───────────────────────────────
  getTaskLeaderboard: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { leaderboard: [], myRank: null, myStats: null };

      const { parentChildren, parentTaskCompletions, parentTasks } = await import("../../drizzle/schema");
      const { gte, inArray } = await import("drizzle-orm");

      // Find siblings: students who share a parent with the current user
      const myParents = await db
        .select({ parentId: parentChildren.parentId })
        .from(parentChildren)
        .where(eq(parentChildren.childId, ctx.user.id));

      let siblingIds: number[] = [ctx.user.id];
      if (myParents.length > 0) {
        const parentIds = myParents.map((p) => p.parentId);
        const siblings = await db
          .select({ childId: parentChildren.childId })
          .from(parentChildren)
          .where(inArray(parentChildren.parentId, parentIds));
        const allIds = siblings.map((s) => s.childId);
        siblingIds = allIds.filter((id, idx) => allIds.indexOf(id) === idx);
      }

      // Get task XP for each sibling (sum of rewardXp from confirmed completions)
      const results: { userId: number; name: string; taskXp: number; tasksCompleted: number }[] = [];

      for (const studentId of siblingIds) {
        const user = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, studentId))
          .limit(1)
          .then((r) => r[0]);
        if (!user) continue;

        // Count confirmed completions
        const completions = await db
          .select({ taskId: parentTaskCompletions.taskId })
          .from(parentTaskCompletions)
          .where(
            and(
              eq(parentTaskCompletions.studentId, studentId),
              eq(parentTaskCompletions.parentConfirmed, true)
            )
          );

        let taskXp = 0;
        if (completions.length > 0) {
          const taskIds = completions.map((c) => c.taskId);
          const tasks = await db
            .select({ rewardXp: parentTasks.rewardXp })
            .from(parentTasks)
            .where(inArray(parentTasks.id, taskIds));
          taskXp = tasks.reduce((sum, t) => sum + (t.rewardXp ?? 0), 0);
        }

        results.push({
          userId: user.id,
          name: user.name ?? "Student",
          taskXp,
          tasksCompleted: completions.length,
        });
      }

      // Sort by taskXp descending
      results.sort((a, b) => b.taskXp - a.taskXp);

      const leaderboard = results.slice(0, input.limit).map((r, i) => ({
        ...r,
        rank: i + 1,
        isMe: r.userId === ctx.user.id,
      }));

      const myEntry = leaderboard.find((l) => l.isMe);
      const myRank = myEntry?.rank ?? null;
      const myStats = myEntry ? { taskXp: myEntry.taskXp, tasksCompleted: myEntry.tasksCompleted } : null;

      return { leaderboard, myRank, myStats };
    }),
});
