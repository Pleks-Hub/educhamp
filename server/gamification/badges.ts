/**
 * gamification/badges.ts
 * Badge seed catalogue, award logic, and query helpers.
 *
 * Badge categories:
 *   academic     — subject/course mastery badges
 *   achievement  — milestone badges (first quiz, perfect score, etc.)
 *   behavioral   — consistency and effort badges
 *   consistency  — streak-based badges
 *   special      — seasonal and event badges
 *   parent_engagement — parent involvement badges
 */

import { getDb } from "../db";
import { badges, userBadges } from "../../drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { awardXp } from "./xp";

// ─── Default badge catalogue ──────────────────────────────────────────────────

export const DEFAULT_BADGES = [
  // ── Academic ──────────────────────────────────────────────────────────────
  { key: "algebra_explorer",    name: "Algebra Explorer",      description: "Complete your first Algebra lesson",                    category: "academic",     iconEmoji: "🔢", xpReward: 50,  sortOrder: 10 },
  { key: "reading_champion",    name: "Reading Champion",      description: "Complete 5 ELA lessons",                               category: "academic",     iconEmoji: "📖", xpReward: 75,  sortOrder: 11 },
  { key: "science_investigator",name: "Science Investigator",  description: "Complete 5 Science lessons",                           category: "academic",     iconEmoji: "🔬", xpReward: 75,  sortOrder: 12 },
  { key: "history_detective",   name: "History Detective",     description: "Complete 5 Social Studies lessons",                    category: "academic",     iconEmoji: "🏛️", xpReward: 75,  sortOrder: 13 },
  { key: "math_master",         name: "Math Master",           description: "Achieve mastery in 5 math skills",                     category: "academic",     iconEmoji: "🧮", xpReward: 150, sortOrder: 14 },
  { key: "language_star",       name: "Language Star",         description: "Complete 5 Language lessons",                          category: "academic",     iconEmoji: "🌐", xpReward: 75,  sortOrder: 15 },
  { key: "stem_champion",       name: "STEM Champion",         description: "Achieve mastery in 10 STEM skills",                    category: "academic",     iconEmoji: "🚀", xpReward: 200, sortOrder: 16 },
  { key: "ap_scholar",          name: "AP Scholar",            description: "Complete an AP course unit",                           category: "academic",     iconEmoji: "🎓", xpReward: 200, sortOrder: 17 },

  // ── Achievement ───────────────────────────────────────────────────────────
  { key: "first_lesson",        name: "First Step",            description: "Complete your very first lesson",                      category: "achievement",  iconEmoji: "👣", xpReward: 25,  sortOrder: 20 },
  { key: "first_quiz_passed",   name: "Quiz Starter",          description: "Pass your first quiz",                                 category: "achievement",  iconEmoji: "✅", xpReward: 50,  sortOrder: 21 },
  { key: "perfect_score",       name: "Perfect Score",         description: "Earn 100% on a quiz",                                  category: "achievement",  iconEmoji: "💯", xpReward: 100, sortOrder: 22 },
  { key: "mastery_champion",    name: "Mastery Champion",      description: "Achieve mastery (≥75%) in 10 skills",                  category: "achievement",  iconEmoji: "🏆", xpReward: 250, sortOrder: 23 },
  { key: "grand_master_badge",  name: "Grand Master",          description: "Achieve Grand Master (≥90%) in any skill",             category: "achievement",  iconEmoji: "👑", xpReward: 300, sortOrder: 24 },
  { key: "unit_complete",       name: "Unit Conqueror",        description: "Complete an entire unit",                              category: "achievement",  iconEmoji: "🏅", xpReward: 100, sortOrder: 25 },
  { key: "course_complete",     name: "Course Graduate",       description: "Complete an entire course",                            category: "achievement",  iconEmoji: "🎓", xpReward: 500, sortOrder: 26 },
  { key: "diagnostic_ace",      name: "Diagnostic Ace",        description: "Score 90%+ on a placement diagnostic",                 category: "achievement",  iconEmoji: "🎯", xpReward: 150, sortOrder: 27 },
  { key: "level_10",            name: "Scholar",               description: "Reach Level 10",                                       category: "achievement",  iconEmoji: "⭐", xpReward: 200, sortOrder: 28 },
  { key: "level_25",            name: "Grand Scholar",         description: "Reach Level 25",                                       category: "achievement",  iconEmoji: "🌟", xpReward: 500, sortOrder: 29 },
  { key: "level_50",            name: "EduChamp Legend",       description: "Reach Level 50 — the highest honour",                  category: "achievement",  iconEmoji: "🦁", xpReward: 1000,sortOrder: 30 },

  // ── Behavioral ────────────────────────────────────────────────────────────
  { key: "never_give_up",       name: "Never Give Up",         description: "Retry a quiz after a failed attempt and pass",         category: "behavioral",   iconEmoji: "💪", xpReward: 75,  sortOrder: 40 },
  { key: "focus_warrior",       name: "Focus Warrior",         description: "Complete 3 lessons in a single session",               category: "behavioral",   iconEmoji: "🧠", xpReward: 100, sortOrder: 41 },
  { key: "improvement_hero",    name: "Improvement Hero",      description: "Improve a quiz score by 20+ points",                   category: "behavioral",   iconEmoji: "📈", xpReward: 100, sortOrder: 42 },
  { key: "early_bird",          name: "Early Bird",            description: "Complete a lesson before 9am",                         category: "behavioral",   iconEmoji: "🌅", xpReward: 50,  sortOrder: 43 },
  { key: "night_owl",           name: "Night Owl",             description: "Complete a lesson after 8pm",                          category: "behavioral",   iconEmoji: "🦉", xpReward: 50,  sortOrder: 44 },

  // ── Consistency ───────────────────────────────────────────────────────────
  { key: "streak_3",            name: "3-Day Streak",          description: "Learn 3 days in a row",                                category: "consistency",  iconEmoji: "🔥", xpReward: 50,  sortOrder: 50 },
  { key: "streak_7",            name: "7-Day Streak",          description: "Learn 7 days in a row",                                category: "consistency",  iconEmoji: "🔥", xpReward: 100, sortOrder: 51 },
  { key: "streak_14",           name: "14-Day Streak",         description: "Learn 14 days in a row",                               category: "consistency",  iconEmoji: "🔥", xpReward: 200, sortOrder: 52 },
  { key: "streak_30",           name: "30-Day Streak",         description: "Learn 30 days in a row",                               category: "consistency",  iconEmoji: "🔥", xpReward: 500, sortOrder: 53 },
  { key: "consistency_king",    name: "Consistency King",      description: "Complete at least one lesson every day for 7 days",    category: "consistency",  iconEmoji: "👑", xpReward: 150, sortOrder: 54 },
  { key: "weekend_warrior",     name: "Weekend Warrior",       description: "Learn on both Saturday and Sunday",                    category: "consistency",  iconEmoji: "🏋️", xpReward: 75,  sortOrder: 55 },

  // ── Special / Seasonal ────────────────────────────────────────────────────
  { key: "summer_quest",        name: "Summer Quest",          description: "Complete the Summer Learning Challenge",                category: "special",      iconEmoji: "☀️", xpReward: 300, sortOrder: 60 },
  { key: "back_to_school",      name: "Back to School",        description: "Complete the Back-to-School Challenge",                category: "special",      iconEmoji: "🎒", xpReward: 200, sortOrder: 61 },
  { key: "sat_sprint",          name: "SAT Sprint",            description: "Complete the SAT Sprint Challenge",                    category: "special",      iconEmoji: "📝", xpReward: 400, sortOrder: 62 },
  { key: "stem_month",          name: "STEM Month",            description: "Complete the STEM Month Challenge",                    category: "special",      iconEmoji: "🔭", xpReward: 300, sortOrder: 63 },

  // ── Parent Engagement ─────────────────────────────────────────────────────
  { key: "parent_enrolled",     name: "Family Learner",        description: "Parent enrolled you in EduChamp",                     category: "parent_engagement", iconEmoji: "👨‍👩‍👧", xpReward: 25, sortOrder: 70 },
  { key: "goal_set",            name: "Goal Setter",           description: "Parent set a learning goal for you",                  category: "parent_engagement", iconEmoji: "🎯", xpReward: 25, sortOrder: 71 },
];

// ─── Seed default badges ──────────────────────────────────────────────────────

export async function seedDefaultBadges(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const badge of DEFAULT_BADGES) {
    await db
      .insert(badges)
      .values({ ...badge, isActive: true })
      .onDuplicateKeyUpdate({ set: { name: badge.name, description: badge.description, xpReward: badge.xpReward } });
  }
}

// ─── Award a badge to a user ──────────────────────────────────────────────────

export async function awardBadge(
  userId: number,
  badgeKey: string,
): Promise<{ awarded: boolean; badge?: typeof badges.$inferSelect }> {
  const db = await getDb();
  if (!db) return { awarded: false };

  // Fetch badge definition
  const [badge] = await db.select().from(badges).where(eq(badges.key, badgeKey)).limit(1);
  if (!badge || !badge.isActive) return { awarded: false };

  // Check if already earned
  const [existing] = await db
    .select({ id: userBadges.id })
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badge.id)))
    .limit(1);

  if (existing) return { awarded: false };

  // Award badge
  await db.insert(userBadges).values({ userId, badgeId: badge.id });

  // Award XP for badge
  if (badge.xpReward > 0) {
    await awardXp(userId, "badge_earned", badge.xpReward, `badge_${badge.id}`, `Earned badge: ${badge.name}`);
  }

  return { awarded: true, badge };
}

// ─── Check and auto-award badges based on event ───────────────────────────────

export type GamificationEvent =
  | { type: "lesson_complete"; lessonCount: number }
  | { type: "quiz_pass"; score: number; quizAttemptCount: number; previousBestScore?: number }
  | { type: "mastery_achieved"; masteredSkillCount: number; grandMasterSkillCount: number }
  | { type: "unit_complete" }
  | { type: "course_complete" }
  | { type: "streak_update"; currentStreak: number }
  | { type: "level_up"; newLevel: number }
  | { type: "diagnostic_complete"; score: number }
  | { type: "session_lessons"; count: number };

export async function checkAndAwardBadges(
  userId: number,
  event: GamificationEvent,
): Promise<Array<typeof badges.$inferSelect>> {
  const awarded: Array<typeof badges.$inferSelect> = [];

  const tryAward = async (key: string) => {
    const result = await awardBadge(userId, key);
    if (result.awarded && result.badge) awarded.push(result.badge);
  };

  switch (event.type) {
    case "lesson_complete":
      if (event.lessonCount === 1) await tryAward("first_lesson");
      if (event.lessonCount >= 5) await tryAward("reading_champion");
      break;

    case "quiz_pass":
      if (event.quizAttemptCount === 1) await tryAward("first_quiz_passed");
      if (event.score === 100) await tryAward("perfect_score");
      if (event.previousBestScore !== undefined && event.score - event.previousBestScore >= 20) {
        await tryAward("improvement_hero");
      }
      if (event.quizAttemptCount > 1 && event.score >= 75) await tryAward("never_give_up");
      break;

    case "mastery_achieved":
      if (event.masteredSkillCount >= 10) await tryAward("mastery_champion");
      if (event.grandMasterSkillCount >= 1) await tryAward("grand_master_badge");
      break;

    case "unit_complete":
      await tryAward("unit_complete");
      break;

    case "course_complete":
      await tryAward("course_complete");
      break;

    case "streak_update":
      if (event.currentStreak >= 3) await tryAward("streak_3");
      if (event.currentStreak >= 7) await tryAward("streak_7");
      if (event.currentStreak >= 14) await tryAward("streak_14");
      if (event.currentStreak >= 30) await tryAward("streak_30");
      if (event.currentStreak >= 7) await tryAward("consistency_king");
      break;

    case "level_up":
      if (event.newLevel >= 10) await tryAward("level_10");
      if (event.newLevel >= 25) await tryAward("level_25");
      if (event.newLevel >= 50) await tryAward("level_50");
      break;

    case "diagnostic_complete":
      if (event.score >= 90) await tryAward("diagnostic_ace");
      break;

    case "session_lessons":
      if (event.count >= 3) await tryAward("focus_warrior");
      break;
  }

  return awarded;
}

// ─── Get badges for a user ────────────────────────────────────────────────────

export async function getBadgesForUser(userId: number) {
  const db = await getDb();
  if (!db) return { earned: [], all: [] };

  const [allBadges, earnedRows] = await Promise.all([
    db.select().from(badges).where(eq(badges.isActive, true)).orderBy(badges.sortOrder),
    db.select({ badgeId: userBadges.badgeId, earnedAt: userBadges.earnedAt, seenAt: userBadges.seenAt })
      .from(userBadges)
      .where(eq(userBadges.userId, userId)),
  ]);

  const earnedMap = new Map(earnedRows.map((r) => [r.badgeId, r]));

  return {
    all: allBadges.map((b) => ({
      ...b,
      earned: earnedMap.has(b.id),
      earnedAt: earnedMap.get(b.id)?.earnedAt ?? null,
      isNew: earnedMap.has(b.id) && !earnedMap.get(b.id)?.seenAt,
    })),
    earned: allBadges.filter((b) => earnedMap.has(b.id)).map((b) => ({
      ...b,
      earnedAt: earnedMap.get(b.id)!.earnedAt,
      isNew: !earnedMap.get(b.id)!.seenAt,
    })),
  };
}

// ─── Mark badges as seen ──────────────────────────────────────────────────────

export async function markBadgesSeen(userId: number, badgeIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db || badgeIds.length === 0) return;

  await db
    .update(userBadges)
    .set({ seenAt: new Date() })
    .where(and(eq(userBadges.userId, userId), inArray(userBadges.badgeId, badgeIds)));
}
