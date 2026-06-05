/**
 * Spaced Repetition Service
 * Implements SM-2 algorithm for scheduling skill reviews based on forgetting curves.
 */
import { getDb } from "./db";
import { skillReviewSchedule } from "../drizzle/schema";
import { eq, and, lte, asc } from "drizzle-orm";

// SM-2 Algorithm: Calculate next review interval based on performance
export function calculateSM2(
  quality: number, // 0-5 rating (0=complete failure, 5=perfect)
  prevEaseFactor: number,
  prevInterval: number,
  prevRepetitions: number
): { easeFactor: number; interval: number; repetitions: number } {
  // Clamp quality to 0-5
  const q = Math.max(0, Math.min(5, quality));

  let easeFactor = prevEaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  easeFactor = Math.max(1.3, easeFactor); // Never go below 1.3

  let interval: number;
  let repetitions: number;

  if (q < 3) {
    // Failed review - reset
    repetitions = 0;
    interval = 1;
  } else {
    repetitions = prevRepetitions + 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;
    } else {
      interval = Math.round(prevInterval * easeFactor);
    }
  }

  // Cap interval at 180 days
  interval = Math.min(180, interval);

  return { easeFactor, interval, repetitions };
}

// Convert mastery score (0-100) to SM-2 quality rating (0-5)
export function scoreToQuality(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

// Get skills due for review for a user
export async function getSkillsDueForReview(userId: number, courseId?: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();

  const conditions = [
    eq(skillReviewSchedule.userId, userId),
    lte(skillReviewSchedule.nextReviewAt, now),
  ];

  if (courseId) {
    conditions.push(eq(skillReviewSchedule.courseId, courseId));
  }

  const dueSkills = await db
    .select()
    .from(skillReviewSchedule)
    .where(and(...conditions))
    .orderBy(asc(skillReviewSchedule.nextReviewAt))
    .limit(limit);

  return dueSkills;
}

// Update or create a review schedule after a practice session
export async function updateReviewSchedule(
  userId: number,
  skillId: string,
  courseId: number,
  score: number // 0-100 mastery score from the practice
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const quality = scoreToQuality(score);

  // Check if schedule exists
  const existing = await db
    .select()
    .from(skillReviewSchedule)
    .where(
      and(
        eq(skillReviewSchedule.userId, userId),
        eq(skillReviewSchedule.skillId, skillId)
      )
    )
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    const record = existing[0];
    const { easeFactor, interval, repetitions } = calculateSM2(
      quality,
      parseFloat(String(record.easeFactor)),
      record.interval,
      record.repetitions
    );

    const nextReviewAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    await db
      .update(skillReviewSchedule)
      .set({
        easeFactor: easeFactor.toFixed(2),
        interval,
        repetitions,
        lastReviewedAt: now,
        nextReviewAt,
        totalReviews: record.totalReviews + 1,
        correctReviews: record.correctReviews + (quality >= 3 ? 1 : 0),
      })
      .where(eq(skillReviewSchedule.id, record.id));

    return { nextReviewAt, interval, easeFactor };
  } else {
    // Create new schedule - first review after 1 day
    const { easeFactor, interval, repetitions } = calculateSM2(quality, 2.5, 0, 0);
    const nextReviewAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    await db.insert(skillReviewSchedule).values({
      userId,
      skillId,
      courseId,
      easeFactor: easeFactor.toFixed(2),
      interval,
      repetitions,
      lastReviewedAt: now,
      nextReviewAt,
      totalReviews: 1,
      correctReviews: quality >= 3 ? 1 : 0,
    });

    return { nextReviewAt, interval, easeFactor };
  }
}

// Get review statistics for a user
export async function getReviewStats(userId: number, courseId?: number) {
  const db = await getDb();
  if (!db) return { dueNow: 0, dueToday: 0, totalScheduled: 0, avgEaseFactor: 2.5 };

  const conditions = [eq(skillReviewSchedule.userId, userId)];
  if (courseId) {
    conditions.push(eq(skillReviewSchedule.courseId, courseId));
  }

  const allSchedules = await db
    .select()
    .from(skillReviewSchedule)
    .where(and(...conditions));

  const now = new Date();
  const dueNow = allSchedules.filter((s: any) => new Date(s.nextReviewAt) <= now).length;
  const dueToday = allSchedules.filter((s: any) => {
    const reviewDate = new Date(s.nextReviewAt);
    return reviewDate.toDateString() === now.toDateString();
  }).length;
  const totalScheduled = allSchedules.length;
  const avgEaseFactor =
    allSchedules.length > 0
      ? allSchedules.reduce((sum: number, s: any) => sum + parseFloat(String(s.easeFactor)), 0) / allSchedules.length
      : 2.5;

  return { dueNow, dueToday, totalScheduled, avgEaseFactor };
}
