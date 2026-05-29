/**
 * gamification/quests.ts
 * Quest generation, progress tracking, and completion logic.
 */

import { getDb } from "../db";
import { quests, userQuests } from "../../drizzle/schema";
import { and, eq, isNull, gte, lte } from "drizzle-orm";
import { awardXp } from "./xp";

// ─── Default quest catalogue ──────────────────────────────────────────────────

export const DEFAULT_QUESTS = [
  // Daily quests
  { key: "daily_lesson_1",    title: "Daily Learner",       description: "Complete 1 lesson today",                   questType: "daily"   as const, xpReward: 50,  requirementType: "lessons_completed", requirementValue: 1,  sortOrder: 1 },
  { key: "daily_lesson_3",    title: "Triple Learner",      description: "Complete 3 lessons today",                  questType: "daily"   as const, xpReward: 100, requirementType: "lessons_completed", requirementValue: 3,  sortOrder: 2 },
  { key: "daily_quiz_1",      title: "Quiz Taker",          description: "Pass 1 quiz today",                         questType: "daily"   as const, xpReward: 75,  requirementType: "quizzes_passed",    requirementValue: 1,  sortOrder: 3 },
  { key: "daily_xp_100",      title: "XP Hunter",           description: "Earn 100 XP today",                         questType: "daily"   as const, xpReward: 50,  requirementType: "xp_earned",         requirementValue: 100, sortOrder: 4 },

  // Weekly quests
  { key: "weekly_lesson_10",  title: "Weekly Scholar",      description: "Complete 10 lessons this week",             questType: "weekly"  as const, xpReward: 200, requirementType: "lessons_completed", requirementValue: 10, sortOrder: 10 },
  { key: "weekly_quiz_5",     title: "Quiz Champion",       description: "Pass 5 quizzes this week",                  questType: "weekly"  as const, xpReward: 300, requirementType: "quizzes_passed",    requirementValue: 5,  sortOrder: 11 },
  { key: "weekly_mastery_2",  title: "Skill Master",        description: "Achieve mastery in 2 skills this week",     questType: "weekly"  as const, xpReward: 400, requirementType: "mastery_achieved",  requirementValue: 2,  sortOrder: 12 },
  { key: "weekly_streak_5",   title: "Streak Keeper",       description: "Maintain a 5-day learning streak",          questType: "weekly"  as const, xpReward: 250, requirementType: "streak_days",       requirementValue: 5,  sortOrder: 13 },
  { key: "weekly_xp_500",     title: "XP Collector",        description: "Earn 500 XP this week",                     questType: "weekly"  as const, xpReward: 150, requirementType: "xp_earned",         requirementValue: 500, sortOrder: 14 },

  // Monthly quests
  { key: "monthly_lesson_40", title: "Monthly Marathon",    description: "Complete 40 lessons this month",            questType: "monthly" as const, xpReward: 1000, requirementType: "lessons_completed", requirementValue: 40, sortOrder: 20 },
  { key: "monthly_mastery_5", title: "Mastery Collector",   description: "Achieve mastery in 5 skills this month",    questType: "monthly" as const, xpReward: 1500, requirementType: "mastery_achieved",  requirementValue: 5,  sortOrder: 21 },
  { key: "monthly_quiz_20",   title: "Quiz Marathon",       description: "Pass 20 quizzes this month",                questType: "monthly" as const, xpReward: 1200, requirementType: "quizzes_passed",    requirementValue: 20, sortOrder: 22 },
];

// ─── Seed default quests ──────────────────────────────────────────────────────

export async function seedDefaultQuests(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const quest of DEFAULT_QUESTS) {
    await db
      .insert(quests)
      .values({ ...quest, isActive: true })
      .onDuplicateKeyUpdate({ set: { title: quest.title, description: quest.description, xpReward: quest.xpReward } });
  }
}

// ─── Assign quests for today ──────────────────────────────────────────────────

export async function assignDailyQuests(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const today = getTodayString();
  const weekStart = getWeekStartString();
  const monthStart = getMonthStartString();

  // Get all active quests
  const allQuests = await db.select().from(quests).where(eq(quests.isActive, true));

  for (const quest of allQuests) {
    const assignedDate =
      quest.questType === "daily" ? today :
      quest.questType === "weekly" ? weekStart :
      monthStart;

    // Insert if not already assigned
    await db
      .insert(userQuests)
      .values({ userId, questId: quest.id, assignedDate, progress: 0 })
      .onDuplicateKeyUpdate({ set: { questId: quest.id } }); // no-op on duplicate
  }
}

// ─── Update quest progress ────────────────────────────────────────────────────

export type QuestEventType = "lessons_completed" | "quizzes_passed" | "xp_earned" | "mastery_achieved" | "streak_days";

export async function updateQuestProgress(
  userId: number,
  eventType: QuestEventType,
  increment: number,
): Promise<Array<{ questId: number; title: string; completed: boolean; xpAwarded: number }>> {
  const db = await getDb();
  if (!db) return [];

  const today = getTodayString();
  const weekStart = getWeekStartString();
  const monthStart = getMonthStartString();

  const results: Array<{ questId: number; title: string; completed: boolean; xpAwarded: number }> = [];

  // Get active user quests matching this event type
  const activeUserQuests = await db
    .select({ uq: userQuests, q: quests })
    .from(userQuests)
    .innerJoin(quests, eq(userQuests.questId, quests.id))
    .where(
      and(
        eq(userQuests.userId, userId),
        eq(quests.requirementType, eventType),
        isNull(userQuests.completedAt),
      ),
    );

  for (const { uq, q } of activeUserQuests) {
    // Check if the quest is still in its valid period
    const validDate =
      q.questType === "daily" ? today :
      q.questType === "weekly" ? weekStart :
      monthStart;

    if (uq.assignedDate !== validDate) continue;

    const newProgress = uq.progress + increment;
    const completed = newProgress >= q.requirementValue;

    await db
      .update(userQuests)
      .set({
        progress: Math.min(newProgress, q.requirementValue),
        completedAt: completed ? new Date() : null,
        xpAwarded: completed && !uq.xpAwarded ? true : uq.xpAwarded,
      })
      .where(eq(userQuests.id, uq.id));

    let xpAwarded = 0;
    if (completed && !uq.xpAwarded) {
      const xpResult = await awardXp(userId, "quest_complete", q.xpReward, `quest_${q.id}_${validDate}`, `Quest: ${q.title}`);
      xpAwarded = xpResult.awarded ? xpResult.amount : 0;
    }

    results.push({ questId: q.id, title: q.title, completed, xpAwarded });
  }

  return results;
}

// ─── Get quests for user ──────────────────────────────────────────────────────

export async function getQuestsForUser(userId: number) {
  const db = await getDb();
  if (!db) return { daily: [], weekly: [], monthly: [] };

  const today = getTodayString();
  const weekStart = getWeekStartString();
  const monthStart = getMonthStartString();

  const rows = await db
    .select({ uq: userQuests, q: quests })
    .from(userQuests)
    .innerJoin(quests, eq(userQuests.questId, quests.id))
    .where(and(eq(userQuests.userId, userId), eq(quests.isActive, true)));

  const daily = rows
    .filter((r) => r.q.questType === "daily" && r.uq.assignedDate === today)
    .map(toQuestView);
  const weekly = rows
    .filter((r) => r.q.questType === "weekly" && r.uq.assignedDate === weekStart)
    .map(toQuestView);
  const monthly = rows
    .filter((r) => r.q.questType === "monthly" && r.uq.assignedDate === monthStart)
    .map(toQuestView);

  return { daily, weekly, monthly };
}

function toQuestView({ uq, q }: { uq: typeof userQuests.$inferSelect; q: typeof quests.$inferSelect }) {
  return {
    id: uq.id,
    questId: q.id,
    key: q.key,
    title: q.title,
    description: q.description,
    questType: q.questType,
    xpReward: q.xpReward,
    requirementType: q.requirementType,
    requirementValue: q.requirementValue,
    progress: uq.progress,
    progressPercent: Math.min(100, Math.round((uq.progress / q.requirementValue) * 100)),
    completed: !!uq.completedAt,
    completedAt: uq.completedAt,
  };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStartString(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getMonthStartString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
