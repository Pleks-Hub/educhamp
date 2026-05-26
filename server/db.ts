import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  diagnosticAttempts,
  diagnosticQuestions,
  lessonProgress,
  lessons,
  quizAttempts,
  quizQuestions,
  skills,
  tutorSessions,
  unitProgress,
  units,
  userMastery,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const fields = ["name", "email", "loginMethod"] as const;
  for (const f of fields) {
    if (user[f] !== undefined) {
      values[f] = user[f] ?? null;
      updateSet[f] = user[f] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Units ────────────────────────────────────────────────────────────────────

export async function getAllUnits() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(units).orderBy(units.sortOrder);
}

export async function getUnitByNumber(unitNumber: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(units).where(eq(units.unitNumber, unitNumber)).limit(1);
  return result[0] ?? null;
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export async function getLessonsByUnit(unitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessons).where(eq(lessons.unitId, unitId)).orderBy(lessons.sortOrder);
}

export async function getLessonById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return result[0] ?? null;
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export async function getAllSkills() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).orderBy(skills.sortOrder);
}

export async function getSkillsByUnit(unitNumber: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(skills).where(eq(skills.unitNumber, unitNumber)).orderBy(skills.sortOrder);
}

// ─── Quiz Questions ───────────────────────────────────────────────────────────

export async function getQuizQuestionsByUnit(unitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizQuestions).where(eq(quizQuestions.unitId, unitId)).orderBy(quizQuestions.sortOrder);
}

export async function getQuizQuestionsByUnitNumber(unitNumber: number) {
  const db = await getDb();
  if (!db) return [];
  const unit = await db.select().from(units).where(eq(units.unitNumber, unitNumber)).limit(1);
  if (!unit[0]) return [];
  return db.select().from(quizQuestions).where(eq(quizQuestions.unitId, unit[0].id)).orderBy(quizQuestions.sortOrder);
}

// ─── Diagnostic Questions ─────────────────────────────────────────────────────

export async function getAllDiagnosticQuestions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(diagnosticQuestions).orderBy(diagnosticQuestions.sortOrder);
}

// ─── User Mastery ─────────────────────────────────────────────────────────────

export async function getUserMastery(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userMastery).where(eq(userMastery.userId, userId));
}

export async function getUserMasteryForSkill(userId: number, skillId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(userMastery)
    .where(and(eq(userMastery.userId, userId), eq(userMastery.skillId, skillId)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertUserMastery(userId: number, skillId: string, score: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserMasteryForSkill(userId, skillId);
  if (existing) {
    await db
      .update(userMastery)
      .set({ score, attemptCount: existing.attemptCount + 1, lastAttemptAt: new Date() })
      .where(and(eq(userMastery.userId, userId), eq(userMastery.skillId, skillId)));
  } else {
    await db.insert(userMastery).values({ userId, skillId, score, attemptCount: 1, lastAttemptAt: new Date() });
  }
}

// ─── Unit Progress ────────────────────────────────────────────────────────────

export async function getUserUnitProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(unitProgress).where(eq(unitProgress.userId, userId));
}

export async function getUserUnitProgressForUnit(userId: number, unitId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(unitProgress)
    .where(and(eq(unitProgress.userId, userId), eq(unitProgress.unitId, unitId)))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertUnitProgress(
  userId: number,
  unitId: number,
  unitNumber: number,
  updates: Partial<{ status: "locked" | "in_progress" | "quiz_unlocked" | "completed"; lessonsCompleted: number; totalLessons: number; quizScore: number; quizAttempts: number }>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserUnitProgressForUnit(userId, unitId);
  if (existing) {
    await db
      .update(unitProgress)
      .set({ ...updates, lastActivityAt: new Date() })
      .where(and(eq(unitProgress.userId, userId), eq(unitProgress.unitId, unitId)));
  } else {
    await db.insert(unitProgress).values({ userId, unitId, unitNumber, ...updates, lastActivityAt: new Date() });
  }
}

// ─── Lesson Progress ──────────────────────────────────────────────────────────

export async function getLessonProgressForUser(userId: number, unitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.unitId, unitId)));
}

export async function markLessonComplete(userId: number, lessonId: number, unitId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
    .limit(1);
  if (existing[0]) {
    await db
      .update(lessonProgress)
      .set({ completed: true, completedAt: new Date() })
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
  } else {
    await db.insert(lessonProgress).values({ userId, lessonId, unitId, completed: true, completedAt: new Date() });
  }
}

// ─── Quiz Attempts ────────────────────────────────────────────────────────────

export async function saveQuizAttempt(
  userId: number,
  unitId: number,
  unitNumber: number,
  answers: { questionId: number; answer: string; correct: boolean }[],
  score: number,
  totalQuestions: number,
  correctCount: number
) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(quizAttempts).values({
    userId,
    unitId,
    unitNumber,
    answers,
    score,
    totalQuestions,
    correctCount,
    completedAt: new Date(),
  });
  return result;
}

export async function getQuizAttemptsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).orderBy(desc(quizAttempts.completedAt));
}

export async function getLatestQuizAttempt(userId: number, unitId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.unitId, unitId)))
    .orderBy(desc(quizAttempts.completedAt))
    .limit(1);
  return result[0] ?? null;
}

// ─── Diagnostic Attempts ──────────────────────────────────────────────────────

export async function saveDiagnosticAttempt(
  userId: number,
  answers: { questionId: string; answer: string; correct: boolean }[],
  unitResults: unknown[],
  prerequisiteScore: number,
  overallScore: number,
  placementRecommendation: string
) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(diagnosticAttempts).values({
    userId,
    answers,
    unitResults: unitResults as any,
    prerequisiteScore,
    overallScore,
    placementRecommendation,
    completedAt: new Date(),
  });
}

export async function getLatestDiagnosticAttempt(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(diagnosticAttempts)
    .where(eq(diagnosticAttempts.userId, userId))
    .orderBy(desc(diagnosticAttempts.completedAt))
    .limit(1);
  return result[0] ?? null;
}

// ─── Tutor Sessions ───────────────────────────────────────────────────────────

export async function getOrCreateTutorSession(
  userId: number,
  unitId: number | null,
  lessonId: number | null,
  mode: "teach" | "practice" | "quiz" | "exam_review" | "remediation" | "parent_summary"
) {
  const db = await getDb();
  if (!db) return null;
  // Try to find an existing recent session
  const existing = await db
    .select()
    .from(tutorSessions)
    .where(
      and(
        eq(tutorSessions.userId, userId),
        unitId ? eq(tutorSessions.unitId, unitId) : eq(tutorSessions.userId, userId),
        eq(tutorSessions.mode, mode)
      )
    )
    .orderBy(desc(tutorSessions.updatedAt))
    .limit(1);
  if (existing[0]) return existing[0];
  // Create new session
  const result = await db.insert(tutorSessions).values({
    userId,
    unitId,
    lessonId,
    mode,
    messages: [],
  });
  const newSession = await db.select().from(tutorSessions).where(eq(tutorSessions.userId, userId)).orderBy(desc(tutorSessions.createdAt)).limit(1);
  return newSession[0] ?? null;
}

export async function updateTutorSessionMessages(sessionId: number, messages: unknown[]) {
  const db = await getDb();
  if (!db) return;
  await db.update(tutorSessions).set({ messages: messages as any }).where(eq(tutorSessions.id, sessionId));
}
