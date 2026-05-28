import { and, count as sqlCount, desc, eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertParentChild,
  adminAuditLog,
  coParentAccess,
  coParentInvitations,
  courses,
  diagnosticAttempts,
  diagnosticQuestions,
  enrolmentInvitations,
  lessonProgress,
  lessons,
  parentChildren,
  parentGoals,
  parentNotes,
  passwordResetTokens,
  platformSettings,
  quizAttempts,
  quizQuestions,
  referrals,
  referralSignups,
  skills,
  studentInviteTokens,
  twoFactorAuth,
  tutorSessions,
  unitProgress,
  units,
  userCourseEnrollments,
  userMastery,
  userProfiles,
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
export async function getSkillsForCourse(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  // Join skills → units to filter by courseId
  return db
    .select({ skill: skills, unit: units })
    .from(skills)
    .innerJoin(units, eq(skills.unitId, units.id))
    .where(eq(units.courseId, courseId))
    .orderBy(skills.sortOrder);
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

/** Returns diagnostic questions for a specific course. Falls back to courseId=1 if none found. */
export async function getDiagnosticQuestionsForCourse(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(diagnosticQuestions)
    .where(eq(diagnosticQuestions.courseId, courseId))
    .orderBy(diagnosticQuestions.sortOrder);
  if (rows.length === 0 && courseId !== 1) {
    return db.select().from(diagnosticQuestions).where(eq(diagnosticQuestions.courseId, 1)).orderBy(diagnosticQuestions.sortOrder);
  }
  return rows;
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
  placementRecommendation: string,
  courseId: number = 1
) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(diagnosticAttempts).values({
    userId,
    courseId,
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

export async function getLatestDiagnosticAttemptForCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(diagnosticAttempts)
    .where(and(eq(diagnosticAttempts.userId, userId), eq(diagnosticAttempts.courseId, courseId)))
    .orderBy(desc(diagnosticAttempts.completedAt))
    .limit(1);
  return result[0] ?? null;
}

export async function getAllDiagnosticAttempts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(diagnosticAttempts)
    .where(eq(diagnosticAttempts.userId, userId))
    .orderBy(desc(diagnosticAttempts.completedAt));
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

// ─── Parent Module ────────────────────────────────────────────────────────────

export async function getChildrenForParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get all active parent-child links
  const links = await db
    .select()
    .from(parentChildren)
    .where(and(eq(parentChildren.parentId, parentId), eq(parentChildren.isActive, true)));
  if (links.length === 0) return [];
  const childIds = links.map((l) => l.childId);
  // Get child user records
  const childUsers = await db.select().from(users).where(inArray(users.id, childIds));
  // Merge link metadata with user data
  return links.map((link) => {
    const child = childUsers.find((u) => u.id === link.childId);
    return { link, child: child ?? null };
  });
}

export async function getParentChildLink(parentId: number, childId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(parentChildren)
    .where(and(eq(parentChildren.parentId, parentId), eq(parentChildren.childId, childId)))
    .limit(1);
  return result[0] ?? null;
}

export async function enrollChild(parentId: number, childId: number, nickname?: string, relationship?: string) {
  const db = await getDb();
  if (!db) return null;
  // Check if link already exists
  const existing = await getParentChildLink(parentId, childId);
  if (existing) {
    // Re-activate if previously removed
    if (!existing.isActive) {
      await db
        .update(parentChildren)
        .set({ isActive: true, nickname: nickname ?? existing.nickname, relationship: relationship ?? existing.relationship })
        .where(eq(parentChildren.id, existing.id));
    }
    return existing;
  }
  const result = await db.insert(parentChildren).values({
    parentId,
    childId,
    nickname: nickname ?? null,
    relationship: relationship ?? "parent",
    isActive: true,
  });
  return result;
}

export async function removeChildFromParent(parentId: number, childId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(parentChildren)
    .set({ isActive: false })
    .where(and(eq(parentChildren.parentId, parentId), eq(parentChildren.childId, childId)));
}

export async function updateChildNickname(parentId: number, childId: number, nickname: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(parentChildren)
    .set({ nickname })
    .where(and(eq(parentChildren.parentId, parentId), eq(parentChildren.childId, childId)));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

export async function createChildAccount(name: string, email: string, grade: string, school?: string) {
  const db = await getDb();
  if (!db) return null;
  // Create a synthetic openId for manually-created child accounts
  const { nanoid } = await import("nanoid");
  const openId = `child_${nanoid(24)}`;
  await db.insert(users).values({
    openId,
    name,
    email,
    loginMethod: "parent_enrolled",
    role: "user",
    accountType: "student",
    grade,
    school: school ?? null,
    lastSignedIn: new Date(),
  });
  const created = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return created[0] ?? null;
}

export async function updateUserAccountType(userId: number, accountType: "student" | "parent" | "teacher") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ accountType }).where(eq(users.id, userId));
}

export async function getChildProgressSummary(childId: number) {
  const db = await getDb();
  if (!db) return null;
  const [childRows, mastery, progress, quizHistory, diagnostic] = await Promise.all([
    db.select().from(users).where(eq(users.id, childId)).limit(1),
    db.select().from(userMastery).where(eq(userMastery.userId, childId)),
    db.select().from(unitProgress).where(eq(unitProgress.userId, childId)).orderBy(unitProgress.unitNumber),
    db.select().from(quizAttempts).where(eq(quizAttempts.userId, childId)).orderBy(desc(quizAttempts.completedAt)).limit(10),
    db.select().from(diagnosticAttempts).where(eq(diagnosticAttempts.userId, childId)).orderBy(desc(diagnosticAttempts.completedAt)).limit(1),
  ]);
  const child = childRows[0];
  const diag = diagnostic[0] ?? null;
  return {
    name: child?.name ?? null,
    email: child?.email ?? null,
    grade: (child as any)?.grade ?? null,
    school: (child as any)?.school ?? null,
    placementScore: diag ? Math.round(((diag.overallScore ?? 0))) : null,
    placementRecommendation: (diag as any)?.placementRecommendation ?? null,
    mastery,
    progress,
    quizHistory,
    diagnostic: diag,
  };
}

// ─── Enrolment Invitations ────────────────────────────────────────────────────

export async function createEnrolmentInvitation(parentId: number, childEmail: string, childName?: string, token?: string) {
  const db = await getDb();
  if (!db) return null;
  const { nanoid } = await import("nanoid");
  const inviteToken = token ?? nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(enrolmentInvitations).values({
    parentId,
    childEmail,
    childName: childName ?? null,
    token: inviteToken,
    status: "pending",
    expiresAt,
  });
  return inviteToken;
}

export async function getPendingInvitationsForParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(enrolmentInvitations)
    .where(and(eq(enrolmentInvitations.parentId, parentId), eq(enrolmentInvitations.status, "pending")))
    .orderBy(desc(enrolmentInvitations.createdAt));
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(enrolmentInvitations)
    .where(eq(enrolmentInvitations.token, token))
    .limit(1);
  return result[0] ?? null;
}

export async function acceptInvitation(token: string, childId: number) {
  const db = await getDb();
  if (!db) return false;
  const inv = await getInvitationByToken(token);
  if (!inv || inv.status !== "pending" || inv.expiresAt < new Date()) return false;
  await db.update(enrolmentInvitations).set({ status: "accepted" }).where(eq(enrolmentInvitations.token, token));
  await enrollChild(inv.parentId, childId);
  return true;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? null;
}

export async function getParentsByChildId(childId: number): Promise<{ parentId: number; parentName: string | null; nickname: string | null; parentEmail: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      parentId: parentChildren.parentId,
      parentName: users.name,
      nickname: parentChildren.nickname,
      parentEmail: users.email,
    })
    .from(parentChildren)
    .innerJoin(users, eq(users.id, parentChildren.parentId))
    .where(eq(parentChildren.childId, childId));
  return rows;
}

// ─── Co-Parent / Guardian Access ─────────────────────────────────────────────

export async function createCoParentInvitation(data: {
  studentId: number;
  invitedByParentId: number;
  inviteeEmail: string;
  inviteeName?: string;
  relationship?: string;
  token: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(coParentInvitations).values({
    studentId: data.studentId,
    invitedByParentId: data.invitedByParentId,
    inviteeEmail: data.inviteeEmail.toLowerCase(),
    inviteeName: data.inviteeName ?? null,
    relationship: data.relationship ?? "guardian",
    token: data.token,
    status: "pending",
    expiresAt: data.expiresAt,
  });
}

export async function getCoParentInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(coParentInvitations)
    .where(eq(coParentInvitations.token, token))
    .limit(1);
  return rows[0] ?? undefined;
}

export async function acceptCoParentInvitation(token: string, acceptedByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const inv = await getCoParentInvitationByToken(token);
  if (!inv) throw new Error("Invitation not found");
  if (inv.status !== "pending") throw new Error("Invitation is no longer valid");
  if (new Date() > inv.expiresAt) {
    await db
      .update(coParentInvitations)
      .set({ status: "expired" })
      .where(eq(coParentInvitations.token, token));
    throw new Error("Invitation has expired");
  }
  // Mark invitation accepted
  await db
    .update(coParentInvitations)
    .set({ status: "accepted", acceptedByUserId })
    .where(eq(coParentInvitations.token, token));
  // Create access record (upsert-style: deactivate old, create new)
  await db
    .update(coParentAccess)
    .set({ isActive: false, revokedAt: new Date() })
    .where(
      and(
        eq(coParentAccess.studentId, inv.studentId),
        eq(coParentAccess.coParentUserId, acceptedByUserId)
      )
    );
  await db.insert(coParentAccess).values({
    studentId: inv.studentId,
    coParentUserId: acceptedByUserId,
    invitedByParentId: inv.invitedByParentId,
    invitationId: inv.id,
    relationship: inv.relationship ?? "guardian",
    isActive: true,
  });
  return inv;
}

export async function listCoParentsForStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      accessId: coParentAccess.id,
      coParentUserId: coParentAccess.coParentUserId,
      relationship: coParentAccess.relationship,
      grantedAt: coParentAccess.grantedAt,
      invitedByParentId: coParentAccess.invitedByParentId,
      coParentName: users.name,
      coParentEmail: users.email,
    })
    .from(coParentAccess)
    .innerJoin(users, eq(users.id, coParentAccess.coParentUserId))
    .where(and(eq(coParentAccess.studentId, studentId), eq(coParentAccess.isActive, true)));
  return rows;
}

export async function listPendingInvitationsForStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(coParentInvitations)
    .where(
      and(
        eq(coParentInvitations.studentId, studentId),
        eq(coParentInvitations.status, "pending")
      )
    );
}

export async function revokeCoParentAccess(accessId: number, requestingParentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(coParentAccess)
    .set({ isActive: false, revokedAt: new Date() })
    .where(
      and(
        eq(coParentAccess.id, accessId),
        eq(coParentAccess.invitedByParentId, requestingParentId)
      )
    );
}

export async function cancelCoParentInvitation(invitationId: number, requestingParentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(coParentInvitations)
    .set({ status: "revoked" })
    .where(
      and(
        eq(coParentInvitations.id, invitationId),
        eq(coParentInvitations.invitedByParentId, requestingParentId)
      )
    );
}

/** Returns all students a co-parent has active view access to */
export async function listStudentsForCoParent(coParentUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      accessId: coParentAccess.id,
      studentId: coParentAccess.studentId,
      relationship: coParentAccess.relationship,
      grantedAt: coParentAccess.grantedAt,
      studentName: users.name,
      studentEmail: users.email,
      studentGrade: users.grade,
      studentSchool: users.school,
    })
    .from(coParentAccess)
    .innerJoin(users, eq(users.id, coParentAccess.studentId))
    .where(and(eq(coParentAccess.coParentUserId, coParentUserId), eq(coParentAccess.isActive, true)));
  return rows;
}

/** Verify a co-parent has active access to a specific student */
export async function verifyCoParentAccess(coParentUserId: number, studentId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: coParentAccess.id })
    .from(coParentAccess)
    .where(
      and(
        eq(coParentAccess.coParentUserId, coParentUserId),
        eq(coParentAccess.studentId, studentId),
        eq(coParentAccess.isActive, true)
      )
    )
    .limit(1);
  return rows.length > 0;
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return;
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  return rows[0];
}

export async function markPasswordResetTokenUsed(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.token, token));
}

// ─── 2FA ─────────────────────────────────────────────────────────────────────

export async function upsertTwoFactor(userId: number, secret: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(twoFactorAuth).values({ userId, secret, isEnabled: false })
    .onDuplicateKeyUpdate({ set: { secret, isEnabled: false, enabledAt: null } });
}

export async function getTwoFactor(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(twoFactorAuth).where(eq(twoFactorAuth.userId, userId)).limit(1);
  return rows[0];
}

export async function enableTwoFactor(userId: number, backupCodes: string[]) {
  const db = await getDb();
  if (!db) return;
  await db.update(twoFactorAuth)
    .set({ isEnabled: true, backupCodes, enabledAt: new Date() })
    .where(eq(twoFactorAuth.userId, userId));
}

export async function disableTwoFactor(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(twoFactorAuth)
    .set({ isEnabled: false, enabledAt: null, backupCodes: null })
    .where(eq(twoFactorAuth.userId, userId));
}

export async function consumeBackupCode(userId: number, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(twoFactorAuth).where(eq(twoFactorAuth.userId, userId)).limit(1);
  const record = rows[0];
  if (!record?.backupCodes) return false;
  const idx = record.backupCodes.indexOf(code);
  if (idx === -1) return false;
  const updated = [...record.backupCodes];
  updated.splice(idx, 1);
  await db.update(twoFactorAuth).set({ backupCodes: updated }).where(eq(twoFactorAuth.userId, userId));
  return true;
}

// ─── Parent Goals ─────────────────────────────────────────────────────────────

export async function createParentGoal(parentId: number, childId: number, goalText: string, targetDate?: Date) {
  const db = await getDb();
  if (!db) return;
  await db.insert(parentGoals).values({ parentId, childId, goalText, targetDate: targetDate ?? null });
}

export async function listParentGoals(parentId: number, childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parentGoals)
    .where(and(eq(parentGoals.parentId, parentId), eq(parentGoals.childId, childId)))
    .orderBy(desc(parentGoals.createdAt));
}

export async function completeParentGoal(goalId: number, parentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(parentGoals)
    .set({ isCompleted: true, completedAt: new Date() })
    .where(and(eq(parentGoals.id, goalId), eq(parentGoals.parentId, parentId)));
}

export async function deleteParentGoal(goalId: number, parentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(parentGoals).where(and(eq(parentGoals.id, goalId), eq(parentGoals.parentId, parentId)));
}

// ─── Parent Notes ─────────────────────────────────────────────────────────────

export async function createParentNote(parentId: number, childId: number, noteText: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(parentNotes).values({ parentId, childId, noteText });
}

export async function listParentNotes(parentId: number, childId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parentNotes)
    .where(and(eq(parentNotes.parentId, parentId), eq(parentNotes.childId, childId)))
    .orderBy(desc(parentNotes.createdAt));
}

export async function deleteParentNote(noteId: number, parentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(parentNotes).where(and(eq(parentNotes.id, noteId), eq(parentNotes.parentId, parentId)));
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertUserProfile(
  userId: number,
  data: Partial<{
    dateOfBirth: string;
    gender: string;
    city: string;
    state: string;
    country: string;
    schoolDistrict: string;
    schoolType: "public" | "private" | "homeschool" | "charter" | "other";
    schoolName: string;
    gradeLevel: string;
    parentSignupReason: string;
    parentGoalCategory: string;
    parentGoalDetail: string;
    colorPalette: string;
    displayName: string;
    preferredName: string;
    aiWelcomeMessage: string;
    onboardingCompleted: boolean;
    onboardingStep: number;
  }>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserProfile(userId);
  if (existing) {
    await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, ...data });
  }
}

export async function markOnboardingComplete(userId: number) {
  const db = await getDb();
  if (!db) return;
  await upsertUserProfile(userId, { onboardingCompleted: true, onboardingStep: 99 });
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export async function createReferralCode(referrerId: number, targetRole: "parent" | "student" | "teacher" = "parent", note?: string) {
  const db = await getDb();
  if (!db) return null;
  // Generate a short unique code: 8 chars alphanumeric
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  await db.insert(referrals).values({ referrerId, code, targetRole, note: note ?? null });
  const result = await db.select().from(referrals).where(eq(referrals.code, code)).limit(1);
  return result[0] ?? null;
}

export async function getReferralByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(referrals).where(eq(referrals.code, code)).limit(1);
  return result[0] ?? null;
}

export async function getReferralsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt));
}

export async function incrementReferralClick(referralId: number) {
  const db = await getDb();
  if (!db) return;
  const current = await db.select().from(referrals).where(eq(referrals.id, referralId)).limit(1);
  if (!current[0]) return;
  await db.update(referrals).set({ clickCount: current[0].clickCount + 1 }).where(eq(referrals.id, referralId));
}

export async function recordReferralSignup(referralId: number, referrerId: number, newUserId: number, newUserEmail?: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(referralSignups).values({ referralId, referrerId, newUserId, newUserEmail: newUserEmail ?? null });
  const current = await db.select().from(referrals).where(eq(referrals.id, referralId)).limit(1);
  if (current[0]) {
    await db.update(referrals).set({ signupCount: current[0].signupCount + 1 }).where(eq(referrals.id, referralId));
  }
}

export async function getReferralSignups(referrerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referralSignups).where(eq(referralSignups.referrerId, referrerId)).orderBy(desc(referralSignups.signedUpAt));
}

// ─── Student Invite Tokens ────────────────────────────────────────────────────

export async function createStudentInviteToken(
  parentId: number,
  childName?: string,
  childEmail?: string,
  childGrade?: string
) {
  const db = await getDb();
  if (!db) return null;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) token += chars[Math.floor(Math.random() * chars.length)];
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await db.insert(studentInviteTokens).values({
    parentId,
    token,
    childName: childName ?? null,
    childEmail: childEmail ?? null,
    childGrade: childGrade ?? null,
    expiresAt,
  });
  const result = await db.select().from(studentInviteTokens).where(eq(studentInviteTokens.token, token)).limit(1);
  return result[0] ?? null;
}

export async function getStudentInviteToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(studentInviteTokens).where(eq(studentInviteTokens.token, token)).limit(1);
  return result[0] ?? null;
}

export async function acceptStudentInviteToken(token: string, childId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(studentInviteTokens)
    .set({ status: "accepted", childId, acceptedAt: new Date() })
    .where(eq(studentInviteTokens.token, token));
}

export async function getPendingStudentInvitesForParent(parentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studentInviteTokens)
    .where(and(eq(studentInviteTokens.parentId, parentId), eq(studentInviteTokens.status, "pending")))
    .orderBy(desc(studentInviteTokens.createdAt));
}

// ─── Admin Helpers ────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;
  const [{ total: totalUsers }] = await db.select({ total: sqlCount() }).from(users);
  const [{ total: totalParents }] = await db.select({ total: sqlCount() }).from(users).where(eq(users.accountType, "parent"));
  const [{ total: totalStudents }] = await db.select({ total: sqlCount() }).from(users).where(eq(users.accountType, "student"));
  const [{ total: totalSessions }] = await db.select({ total: sqlCount() }).from(tutorSessions);
  const [{ total: totalDiagnostics }] = await db.select({ total: sqlCount() }).from(diagnosticAttempts);
  const [{ total: totalQuizAttempts }] = await db.select({ total: sqlCount() }).from(quizAttempts);
  const allCourses = await db.select().from(courses).orderBy(courses.sortOrder);
  return {
    totalUsers,
    totalParents,
    totalStudents,
    totalSessions,
    totalDiagnostics,
    totalQuizAttempts,
    courses: allCourses,
  };
}

export async function getAllUsers(limit = 100, offset = 0, search?: string) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const whereClause = search && search.trim()
    ? or(like(users.name, `%${search.trim()}%`), like(users.email, `%${search.trim()}%`))
    : undefined;
  const [rows, [countRow]] = await Promise.all([
    db.select().from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt)),
    db.select({ total: sqlCount() }).from(users).where(whereClause),
  ]);
  return { rows, total: Number(countRow?.total ?? 0) };
}

export async function updateUserRole(userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// Note: users table does not have an isActive column; admin can change role to restrict access
export async function setUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getAllCourses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courses).orderBy(courses.sortOrder);
}

export async function getCourseById(courseId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  return result[0] ?? null;
}

export async function updateCourse(courseId: number, data: {
  title?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(courses).set(data).where(eq(courses.id, courseId));
}

export async function getPlatformSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(platformSettings).orderBy(platformSettings.key);
}

export async function upsertPlatformSetting(settingKey: string, settingValue: string, description?: string, updatedBy?: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, settingKey)).limit(1);
  if (existing.length > 0) {
    await db.update(platformSettings).set({ value: settingValue, updatedAt: new Date(), updatedBy: updatedBy ?? null }).where(eq(platformSettings.key, settingKey));
  } else {
    await db.insert(platformSettings).values({ key: settingKey, value: settingValue, description: description ?? null, updatedBy: updatedBy ?? null });
  }
}

export async function logAdminAction(adminId: number, action: string, targetType: string, targetId: number | null, details: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminAuditLog).values({ adminId, action, targetType: targetType ?? null, targetId: targetId ?? null, details });
}

export async function getAdminAuditLog(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(limit);
}

/**
 * Returns the best default course for a given grade level.
 * Prefers isDefault=true, then falls back to the first active course for that grade.
 * Falls back to courseId=1 (Algebra I) if nothing found.
 */
export async function getGradeDefaultCourse(gradeLevel: string) {
  const db = await getDb();
  if (!db) return null;
  // Try isDefault first
  const defaults = await db.select().from(courses)
    .where(and(eq(courses.gradeLevel, gradeLevel), eq(courses.isActive, true), eq(courses.isDefault, true)))
    .limit(1);
  if (defaults.length > 0) return defaults[0];
  // Fall back to first active course for this grade
  const fallback = await db.select().from(courses)
    .where(and(eq(courses.gradeLevel, gradeLevel), eq(courses.isActive, true)))
    .orderBy(courses.sortOrder)
    .limit(1);
  return fallback[0] ?? null;
}

export async function enrollUserInCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(userCourseEnrollments)
    .where(and(eq(userCourseEnrollments.userId, userId), eq(userCourseEnrollments.courseId, courseId)))
    .limit(1);
  if (existing.length === 0) {
    await db.insert(userCourseEnrollments).values({ userId, courseId, isActive: true });
  }
}

export async function getUserCourseEnrollments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ enrollment: userCourseEnrollments, course: courses })
    .from(userCourseEnrollments)
    .innerJoin(courses, eq(userCourseEnrollments.courseId, courses.id))
    .where(and(eq(userCourseEnrollments.userId, userId), eq(userCourseEnrollments.isActive, true)));
}

export async function getUnitsForCourse(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(units).where(eq(units.courseId, courseId)).orderBy(units.sortOrder);
}

export async function setUserActiveCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return;
  // First ensure the user is enrolled in this course
  await enrollUserInCourse(userId, courseId);
  // Clear isCurrent on all enrollments for this user
  await db.update(userCourseEnrollments)
    .set({ isCurrent: false })
    .where(eq(userCourseEnrollments.userId, userId));
  // Set isCurrent on the target course
  await db.update(userCourseEnrollments)
    .set({ isCurrent: true })
    .where(and(
      eq(userCourseEnrollments.userId, userId),
      eq(userCourseEnrollments.courseId, courseId)
    ));
}

/** Returns the courseId of the user's currently active course (isCurrent=true), or 1 as fallback. */
export async function getActiveCourseIdForUser(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const rows = await db
    .select({ courseId: userCourseEnrollments.courseId })
    .from(userCourseEnrollments)
    .where(and(eq(userCourseEnrollments.userId, userId), eq(userCourseEnrollments.isCurrent, true)))
    .limit(1);
  return rows[0]?.courseId ?? 1;
}

// ─── Multi-course progress aggregation ──────────────────────────────────────
/**
 * Returns progress summary for ALL courses a student is enrolled in.
 * Used by the multi-course dashboard and parent cross-course view.
 */
export async function getAllCourseProgressForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const enrollments = await db
    .select({ enrollment: userCourseEnrollments, course: courses })
    .from(userCourseEnrollments)
    .innerJoin(courses, eq(userCourseEnrollments.courseId, courses.id))
    .where(and(eq(userCourseEnrollments.userId, userId), eq(userCourseEnrollments.isActive, true)));

  if (enrollments.length === 0) return [];

  const unitProgressData = await db.select().from(unitProgress).where(eq(unitProgress.userId, userId));
  const progressMap = new Map(unitProgressData.map((p) => [p.unitId, p]));

  const result = await Promise.all(
    enrollments.map(async ({ enrollment, course }) => {
      const courseUnits = await db
        .select()
        .from(units)
        .where(eq(units.courseId, course.id))
        .orderBy(units.sortOrder);

      const totalUnits = courseUnits.length;
      const completedUnits = courseUnits.filter((u) => progressMap.get(u.id)?.status === "completed").length;
      const inProgressUnits = courseUnits.filter((u) => {
        const s = progressMap.get(u.id)?.status;
        return s === "in_progress" || s === "quiz_unlocked";
      }).length;

      // Find the current active unit (first in_progress or quiz_unlocked)
      const activeUnit = courseUnits.find((u) => {
        const s = progressMap.get(u.id)?.status;
        return s === "in_progress" || s === "quiz_unlocked";
      });

      // Last activity across all units in this course
      const lastActivities = courseUnits
        .map((u) => progressMap.get(u.id)?.lastActivityAt)
        .filter(Boolean) as Date[];
      const lastActivityAt = lastActivities.length > 0
        ? new Date(Math.max(...lastActivities.map((d) => d.getTime())))
        : null;

      return {
        courseId: course.id,
        courseTitle: course.title,
        subject: course.subject,
        gradeLevel: course.gradeLevel,
        isCurrent: enrollment.isCurrent ?? false,
        enrolledAt: enrollment.enrolledAt,
        totalUnits,
        completedUnits,
        inProgressUnits,
        progressPercent: totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0,
        activeUnitTitle: activeUnit?.title ?? null,
        activeUnitNumber: activeUnit?.unitNumber ?? null,
        lastActivityAt,
      };
    })
  );

  return result;
}

// ─── Admin grade management ──────────────────────────────────────────────────

/**
 * Admin: set or update a student's grade level in their userProfile.
 */
export async function setStudentGradeLevel(userId: number, gradeLevel: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(userProfiles).set({ gradeLevel }).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, gradeLevel });
  }
}

/**
 * Admin: bulk-promote all students in a specific grade to the next grade.
 * Returns the count of students promoted.
 */
export async function bulkPromoteStudentGrade(fromGrade: string, toGrade: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .update(userProfiles)
    .set({ gradeLevel: toGrade })
    .where(eq(userProfiles.gradeLevel, fromGrade));
  return (result as any)?.[0]?.affectedRows ?? 0;
}

/**
 * Get all students with a specific grade level (for admin grade management).
 */
export async function getStudentsByGrade(gradeLevel: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ profile: userProfiles, user: users })
    .from(userProfiles)
    .innerJoin(users, eq(userProfiles.userId, users.id))
    .where(eq(userProfiles.gradeLevel, gradeLevel));
}

// ─── Parent Invite Tokens (student → parent direction) ───────────────────────

export async function createParentInviteToken(
  studentId: number,
  parentName?: string,
  parentEmail?: string,
  parentPhone?: string
) {
  const db = await getDb();
  if (!db) return null;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) token += chars[Math.floor(Math.random() * chars.length)];
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
  const { parentInviteTokens } = await import("../drizzle/schema");
  await db.insert(parentInviteTokens).values({
    studentId,
    token,
    parentName: parentName ?? null,
    parentEmail: parentEmail ?? null,
    parentPhone: parentPhone ?? null,
    expiresAt,
  });
  const result = await db.select().from(parentInviteTokens).where(eq(parentInviteTokens.token, token)).limit(1);
  return result[0] ?? null;
}

export async function getParentInviteToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const { parentInviteTokens } = await import("../drizzle/schema");
  const result = await db.select().from(parentInviteTokens).where(eq(parentInviteTokens.token, token)).limit(1);
  return result[0] ?? null;
}

export async function acceptParentInviteToken(token: string, parentId: number) {
  const db = await getDb();
  if (!db) return;
  const { parentInviteTokens } = await import("../drizzle/schema");
  await db.update(parentInviteTokens)
    .set({ status: "accepted", parentId, acceptedAt: new Date() })
    .where(eq(parentInviteTokens.token, token));
}

export async function getPendingParentInvitesForStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  const { parentInviteTokens } = await import("../drizzle/schema");
  return db.select().from(parentInviteTokens)
    .where(and(eq(parentInviteTokens.studentId, studentId), eq(parentInviteTokens.status, "pending")))
    .orderBy(desc(parentInviteTokens.createdAt));
}

// ─── Newsletter Subscriptions ─────────────────────────────────────────────────

export async function subscribeToNewsletter(email: string, name?: string, source = "landing_page") {
  const db = await getDb();
  if (!db) return null;
  const { newsletterSubscriptions } = await import("../drizzle/schema");
  // Upsert: if already subscribed, reactivate
  const existing = await db.select().from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.email, email.toLowerCase().trim()))
    .limit(1);
  if (existing[0]) {
    if (!existing[0].isActive) {
      await db.update(newsletterSubscriptions)
        .set({ isActive: true, unsubscribedAt: null, source })
        .where(eq(newsletterSubscriptions.email, email.toLowerCase().trim()));
    }
    return { alreadySubscribed: !existing[0].isActive, email };
  }
  await db.insert(newsletterSubscriptions).values({
    email: email.toLowerCase().trim(),
    name: name ?? null,
    source,
    isActive: true,
  });
  return { alreadySubscribed: false, email };
}


// ─── Sprint 18: User Status Management ───────────────────────────────────────

export async function updateUserStatus(userId: number, status: "active" | "suspended" | "archived" | "deleted") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ status }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  // Soft-delete: mark as deleted
  await db.update(users).set({ status: "deleted" }).where(eq(users.id, userId));
}

export async function createUser(data: {
  name: string;
  email: string;
  role: "user" | "admin";
  accountType: "student" | "parent" | "teacher";
  grade?: string;
  school?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  // Generate a unique openId for manually-created users
  const openId = `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    role: data.role,
    accountType: data.accountType,
    grade: data.grade ?? null,
    school: data.school ?? null,
    status: "active",
    lastSignedIn: new Date(),
  });
  return result;
}

// ─── Sprint 18: Course Status & Cooldown ─────────────────────────────────────

export async function updateCourseWithStatus(courseId: number, data: {
  title?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  status?: "active" | "archived" | "suspended";
  diagnosticCooldownDays?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(courses).set(data).where(eq(courses.id, courseId));
}

export async function getCourseCooldownDays(courseId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 7;
  const result = await db.select({ diagnosticCooldownDays: courses.diagnosticCooldownDays })
    .from(courses).where(eq(courses.id, courseId)).limit(1);
  return result[0]?.diagnosticCooldownDays ?? 7;
}

export async function removeStudentFromCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(userCourseEnrollments)
    .where(and(eq(userCourseEnrollments.userId, userId), eq(userCourseEnrollments.courseId, courseId)));
}

export async function bulkEnrollStudents(userIds: number[], courseId: number) {
  const db = await getDb();
  if (!db) return 0;
  let enrolled = 0;
  for (const userId of userIds) {
    const existing = await db.select().from(userCourseEnrollments)
      .where(and(eq(userCourseEnrollments.userId, userId), eq(userCourseEnrollments.courseId, courseId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(userCourseEnrollments).values({ userId, courseId, isCurrent: false });
      enrolled++;
    }
  }
  return enrolled;
}

// ─── Sprint 18: CMS Content ───────────────────────────────────────────────────

export async function getCmsContent(section?: string) {
  const db = await getDb();
  if (!db) return [];
  const { cmsContent } = await import("../drizzle/schema");
  if (section) {
    return db.select().from(cmsContent).where(eq(cmsContent.section, section)).orderBy(cmsContent.key);
  }
  return db.select().from(cmsContent).orderBy(cmsContent.section, cmsContent.key);
}

export async function getCmsContentByKey(key: string) {
  const db = await getDb();
  if (!db) return null;
  const { cmsContent } = await import("../drizzle/schema");
  const result = await db.select().from(cmsContent).where(eq(cmsContent.key, key)).limit(1);
  return result[0] ?? null;
}

export async function upsertCmsDraft(key: string, section: string, label: string, draftValue: string, updatedBy: number, contentType: "text" | "richtext" | "image" | "url" | "boolean" = "text") {
  const db = await getDb();
  if (!db) return;
  const { cmsContent } = await import("../drizzle/schema");
  const existing = await db.select().from(cmsContent).where(eq(cmsContent.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(cmsContent)
      .set({ draftValue, isDraft: true, updatedBy, updatedAt: new Date() })
      .where(eq(cmsContent.key, key));
  } else {
    await db.insert(cmsContent).values({
      key, section, label, contentType,
      publishedValue: null, draftValue, isDraft: true,
      version: 1, updatedBy,
    });
  }
}

export async function publishCmsContent(key: string, updatedBy: number, changeNote?: string) {
  const db = await getDb();
  if (!db) return;
  const { cmsContent, cmsContentHistory } = await import("../drizzle/schema");
  const existing = await db.select().from(cmsContent).where(eq(cmsContent.key, key)).limit(1);
  if (!existing[0]) return;
  const item = existing[0];
  // Save current published value to history before overwriting
  if (item.publishedValue !== null) {
    await db.insert(cmsContentHistory).values({
      contentId: item.id,
      version: item.version,
      value: item.publishedValue,
      changedBy: updatedBy,
      changeNote: changeNote ?? "Published update",
    });
  }
  await db.update(cmsContent)
    .set({
      publishedValue: item.draftValue,
      draftValue: null,
      isDraft: false,
      version: item.version + 1,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(cmsContent.key, key));
}

export async function revertCmsContent(key: string, version: number, updatedBy: number) {
  const db = await getDb();
  if (!db) return;
  const { cmsContent, cmsContentHistory } = await import("../drizzle/schema");
  const historyRow = await db.select().from(cmsContentHistory)
    .where(and(
      eq(cmsContentHistory.version, version),
    ))
    .limit(1);
  if (!historyRow[0]) return;
  const item = await db.select().from(cmsContent).where(eq(cmsContent.key, key)).limit(1);
  if (!item[0]) return;
  // Save current as history
  await db.insert(cmsContentHistory).values({
    contentId: item[0].id,
    version: item[0].version,
    value: item[0].publishedValue,
    changedBy: updatedBy,
    changeNote: `Reverted to version ${version}`,
  });
  await db.update(cmsContent)
    .set({
      publishedValue: historyRow[0].value,
      draftValue: null,
      isDraft: false,
      version: item[0].version + 1,
      updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(cmsContent.key, key));
}

export async function getCmsHistory(key: string) {
  const db = await getDb();
  if (!db) return [];
  const { cmsContent, cmsContentHistory } = await import("../drizzle/schema");
  const item = await db.select().from(cmsContent).where(eq(cmsContent.key, key)).limit(1);
  if (!item[0]) return [];
  return db.select().from(cmsContentHistory)
    .where(eq(cmsContentHistory.contentId, item[0].id))
    .orderBy(desc(cmsContentHistory.changedAt));
}

// ─── Sprint 18: RBAC ─────────────────────────────────────────────────────────

export async function listAdminRoles() {
  const db = await getDb();
  if (!db) return [];
  const { adminRoles, rolePermissions } = await import("../drizzle/schema");
  const roles = await db.select().from(adminRoles).where(eq(adminRoles.isActive, true)).orderBy(adminRoles.name);
  const perms = await db.select().from(rolePermissions);
  return roles.map((r) => ({
    ...r,
    permissions: perms.filter((p) => p.roleId === r.id),
  }));
}

export async function createAdminRole(name: string, description: string, permissions: Array<{ resource: string; action: string }>, createdBy: number) {
  const db = await getDb();
  if (!db) return null;
  const { adminRoles, rolePermissions } = await import("../drizzle/schema");
  const result = await db.insert(adminRoles).values({
    name, description, isSystem: false, isActive: true, createdBy,
  });
  const roleId = (result as unknown as [{ insertId: number }])[0].insertId;
  if (permissions.length > 0) {
    await db.insert(rolePermissions).values(permissions.map((p) => ({ roleId, resource: p.resource, action: p.action })));
  }
  return roleId;
}

export async function updateAdminRole(roleId: number, name: string, description: string, permissions: Array<{ resource: string; action: string }>) {
  const db = await getDb();
  if (!db) return;
  const { adminRoles, rolePermissions } = await import("../drizzle/schema");
  await db.update(adminRoles).set({ name, description, updatedAt: new Date() }).where(eq(adminRoles.id, roleId));
  // Replace permissions
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (permissions.length > 0) {
    await db.insert(rolePermissions).values(permissions.map((p) => ({ roleId, resource: p.resource, action: p.action })));
  }
}

export async function deleteAdminRole(roleId: number) {
  const db = await getDb();
  if (!db) return;
  const { adminRoles, rolePermissions, adminRoleAssignments } = await import("../drizzle/schema");
  // Check if system role
  const role = await db.select().from(adminRoles).where(eq(adminRoles.id, roleId)).limit(1);
  if (role[0]?.isSystem) throw new Error("Cannot delete a system role");
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  await db.delete(adminRoleAssignments).where(eq(adminRoleAssignments.roleId, roleId));
  await db.delete(adminRoles).where(eq(adminRoles.id, roleId));
}

export async function assignRoleToUser(userId: number, roleId: number, assignedBy: number) {
  const db = await getDb();
  if (!db) return;
  const { adminRoleAssignments } = await import("../drizzle/schema");
  const existing = await db.select().from(adminRoleAssignments)
    .where(and(eq(adminRoleAssignments.userId, userId), eq(adminRoleAssignments.roleId, roleId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(adminRoleAssignments).set({ isActive: true }).where(eq(adminRoleAssignments.id, existing[0].id));
  } else {
    await db.insert(adminRoleAssignments).values({ userId, roleId, assignedBy, isActive: true });
  }
}

export async function revokeRoleFromUser(userId: number, roleId: number) {
  const db = await getDb();
  if (!db) return;
  const { adminRoleAssignments } = await import("../drizzle/schema");
  await db.update(adminRoleAssignments).set({ isActive: false })
    .where(and(eq(adminRoleAssignments.userId, userId), eq(adminRoleAssignments.roleId, roleId)));
}

export async function getUserRoles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { adminRoles, adminRoleAssignments, rolePermissions } = await import("../drizzle/schema");
  const assignments = await db.select().from(adminRoleAssignments)
    .where(and(eq(adminRoleAssignments.userId, userId), eq(adminRoleAssignments.isActive, true)));
  if (assignments.length === 0) return [];
  const roleIds = assignments.map((a) => a.roleId);
  const roles = await db.select().from(adminRoles).where(inArray(adminRoles.id, roleIds));
  const perms = await db.select().from(rolePermissions).where(inArray(rolePermissions.roleId, roleIds));
  return roles.map((r) => ({
    ...r,
    permissions: perms.filter((p) => p.roleId === r.id),
  }));
}

export async function getUserPermissions(userId: number): Promise<Array<{ resource: string; action: string }>> {
  const roles = await getUserRoles(userId);
  const perms: Array<{ resource: string; action: string }> = [];
  for (const role of roles) {
    for (const p of role.permissions) {
      if (!perms.find((x) => x.resource === p.resource && x.action === p.action)) {
        perms.push({ resource: p.resource, action: p.action });
      }
    }
  }
  return perms;
}

export async function seedDefaultRoles(createdBy: number) {
  const db = await getDb();
  if (!db) return;
  const { adminRoles, rolePermissions } = await import("../drizzle/schema");
  const existing = await db.select({ name: adminRoles.name }).from(adminRoles);
  const existingNames = new Set(existing.map((r) => r.name));

  const systemRoles: Array<{
    name: string;
    description: string;
    permissions: Array<{ resource: string; action: string }>;
  }> = [
    {
      name: "Super Administrator",
      description: "Full access to all platform features and settings.",
      permissions: [
        "users", "courses", "cms", "rbac", "reports", "diagnostics", "settings", "enrollments"
      ].flatMap((r) => ["view", "create", "edit", "delete", "approve", "export"].map((a) => ({ resource: r, action: a }))),
    },
    {
      name: "Content Manager",
      description: "Can manage CMS content, banners, FAQs, and announcements.",
      permissions: [
        { resource: "cms", action: "view" },
        { resource: "cms", action: "create" },
        { resource: "cms", action: "edit" },
        { resource: "cms", action: "approve" },
        { resource: "courses", action: "view" },
      ],
    },
    {
      name: "Academic Coordinator",
      description: "Manages courses, enrollments, and diagnostic results.",
      permissions: [
        { resource: "courses", action: "view" },
        { resource: "courses", action: "create" },
        { resource: "courses", action: "edit" },
        { resource: "enrollments", action: "view" },
        { resource: "enrollments", action: "create" },
        { resource: "enrollments", action: "delete" },
        { resource: "diagnostics", action: "view" },
        { resource: "reports", action: "view" },
        { resource: "reports", action: "export" },
      ],
    },
    {
      name: "Customer Support Officer",
      description: "Can view and manage user accounts for support purposes.",
      permissions: [
        { resource: "users", action: "view" },
        { resource: "users", action: "edit" },
        { resource: "enrollments", action: "view" },
        { resource: "enrollments", action: "create" },
        { resource: "reports", action: "view" },
      ],
    },
    {
      name: "Teacher/Tutor",
      description: "Can view student progress and diagnostic results for their courses.",
      permissions: [
        { resource: "users", action: "view" },
        { resource: "courses", action: "view" },
        { resource: "diagnostics", action: "view" },
        { resource: "reports", action: "view" },
        { resource: "enrollments", action: "view" },
      ],
    },
    {
      name: "Finance/Admin Officer",
      description: "Access to financial reports and platform settings.",
      permissions: [
        { resource: "reports", action: "view" },
        { resource: "reports", action: "export" },
        { resource: "settings", action: "view" },
        { resource: "settings", action: "edit" },
      ],
    },
    {
      name: "Marketing Officer",
      description: "Can manage CMS content and view analytics reports.",
      permissions: [
        { resource: "cms", action: "view" },
        { resource: "cms", action: "edit" },
        { resource: "reports", action: "view" },
        { resource: "reports", action: "export" },
      ],
    },
    {
      name: "Parent Support Representative",
      description: "Can view parent and student accounts for support.",
      permissions: [
        { resource: "users", action: "view" },
        { resource: "enrollments", action: "view" },
        { resource: "diagnostics", action: "view" },
      ],
    },
  ];

  for (const roleData of systemRoles) {
    if (existingNames.has(roleData.name)) continue;
    const result = await db.insert(adminRoles).values({
      name: roleData.name,
      description: roleData.description,
      isSystem: true,
      isActive: true,
      createdBy,
    });
    const roleId = (result as unknown as [{ insertId: number }])[0].insertId;
    if (roleData.permissions.length > 0) {
      await db.insert(rolePermissions).values(
        roleData.permissions.map((p) => ({ roleId, resource: p.resource, action: p.action }))
      );
    }
  }
}


// ─── Sprint 19: Parent Invite — extended helpers ──────────────────────────────

/**
 * Look up pending parent invites by the invitee's email address.
 * Used to show "Pending Student Requests" in the Parent Portal for existing users.
 */
export async function getPendingInvitesForParentEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  const { parentInviteTokens } = await import("../drizzle/schema");
  return db.select().from(parentInviteTokens)
    .where(
      and(
        eq(parentInviteTokens.parentEmail, email.toLowerCase().trim()),
        eq(parentInviteTokens.status, "pending")
      )
    )
    .orderBy(desc(parentInviteTokens.createdAt));
}

/**
 * Reject a parent invite token (parent declines the student's request).
 */
export async function rejectParentInviteToken(token: string) {
  const db = await getDb();
  if (!db) return;
  const { parentInviteTokens } = await import("../drizzle/schema");
  await db.update(parentInviteTokens)
    .set({ status: "rejected", rejectedAt: new Date() })
    .where(eq(parentInviteTokens.token, token));
}

/**
 * Update a parent invite token with student context for richer email content.
 */
export async function updateParentInviteStudentContext(
  token: string,
  context: { studentName?: string; studentGrade?: string; courseName?: string }
) {
  const db = await getDb();
  if (!db) return;
  const { parentInviteTokens } = await import("../drizzle/schema");
  await db.update(parentInviteTokens)
    .set({
      studentName: context.studentName ?? null,
      studentGrade: context.studentGrade ?? null,
      courseName: context.courseName ?? null,
    })
    .where(eq(parentInviteTokens.token, token));
}

// ─── Billing Period ───────────────────────────────────────────────────────────

export async function saveUserBillingPeriod(
  userId: number,
  billingPeriod: "monthly" | "annual"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ billingPeriod }).where(eq(users.id, userId));
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const { coupons } = await import("../drizzle/schema");
  const rows = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code.toUpperCase().trim()))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCouponById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { coupons } = await import("../drizzle/schema");
  const rows = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listCoupons(opts: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { coupons } = await import("../drizzle/schema");
  const { and, count, desc } = await import("drizzle-orm");
  const conditions = [];
  if (opts.status) conditions.push(eq(coupons.status, opts.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(coupons)
      .where(where)
      .orderBy(desc(coupons.createdAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0),
    db.select({ total: count() }).from(coupons).where(where),
  ]);
  return { rows, total };
}

export async function createCoupon(data: {
  code: string;
  name: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount?: number;
  applicablePlans?: string[];
  eligibility: "all" | "new_users" | "parents" | "students" | "schools" | "selected";
  selectedUserIds?: number[];
  minAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  duration: "once" | "repeating" | "forever";
  durationMonths?: number;
  startDate?: Date;
  expiresAt?: Date;
  isStackable?: boolean;
  stripeCouponId?: string;
  stripePromotionCodeId?: string;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { coupons } = await import("../drizzle/schema");
  const [result] = await db.insert(coupons).values({
    code: data.code.toUpperCase().trim(),
    name: data.name,
    description: data.description ?? null,
    discountType: data.discountType,
    discountValue: data.discountValue,
    maxDiscountAmount: data.maxDiscountAmount ?? null,
    applicablePlans: data.applicablePlans ?? null,
    eligibility: data.eligibility,
    selectedUserIds: data.selectedUserIds ?? null,
    minAmount: data.minAmount ?? null,
    usageLimit: data.usageLimit ?? null,
    perUserLimit: data.perUserLimit ?? 1,
    duration: data.duration,
    durationMonths: data.durationMonths ?? null,
    startDate: data.startDate ?? null,
    expiresAt: data.expiresAt ?? null,
    isStackable: data.isStackable ?? false,
    stripeCouponId: data.stripeCouponId ?? null,
    stripePromotionCodeId: data.stripePromotionCodeId ?? null,
    createdBy: data.createdBy ?? null,
  });
  return result;
}

export async function updateCoupon(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    maxDiscountAmount: number;
    applicablePlans: string[];
    eligibility: "all" | "new_users" | "parents" | "students" | "schools" | "selected";
    usageLimit: number;
    perUserLimit: number;
    duration: "once" | "repeating" | "forever";
    durationMonths: number;
    startDate: Date;
    expiresAt: Date;
    status: "active" | "paused" | "expired" | "archived";
    isStackable: boolean;
    stripeCouponId: string;
    stripePromotionCodeId: string;
  }>
) {
  const db = await getDb();
  if (!db) return;
  const { coupons } = await import("../drizzle/schema");
  await db.update(coupons).set(data as any).where(eq(coupons.id, id));
}

export async function incrementCouponUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  const { coupons } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");
  await db
    .update(coupons)
    .set({ usageCount: sql`${coupons.usageCount} + 1` })
    .where(eq(coupons.id, id));
}

export async function recordCouponRedemption(data: {
  couponId: number;
  userId: number;
  planName: string;
  billingPeriod: "monthly" | "annual";
  originalAmountCents: number;
  discountAmountCents: number;
  finalAmountCents: number;
  stripeCheckoutSessionId?: string;
}) {
  const db = await getDb();
  if (!db) return;
  const { couponRedemptions } = await import("../drizzle/schema");
  await db.insert(couponRedemptions).values({
    couponId: data.couponId,
    userId: data.userId,
    planName: data.planName,
    billingPeriod: data.billingPeriod,
    originalAmountCents: data.originalAmountCents,
    discountAmountCents: data.discountAmountCents,
    finalAmountCents: data.finalAmountCents,
    stripeCheckoutSessionId: data.stripeCheckoutSessionId ?? null,
  });
}

export async function countUserCouponRedemptions(couponId: number, userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const { couponRedemptions } = await import("../drizzle/schema");
  const { count, and } = await import("drizzle-orm");
  const [row] = await db
    .select({ total: count() })
    .from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, couponId), eq(couponRedemptions.userId, userId)));
  return row?.total ?? 0;
}

export async function getCouponRedemptionStats(couponId: number) {
  const db = await getDb();
  if (!db) return { totalRedemptions: 0, totalDiscountCents: 0 };
  const { couponRedemptions } = await import("../drizzle/schema");
  const { count, sum } = await import("drizzle-orm");
  const [row] = await db
    .select({
      totalRedemptions: count(),
      totalDiscountCents: sum(couponRedemptions.discountAmountCents),
    })
    .from(couponRedemptions)
    .where(eq(couponRedemptions.couponId, couponId));
  return {
    totalRedemptions: row?.totalRedemptions ?? 0,
    totalDiscountCents: Number(row?.totalDiscountCents ?? 0),
  };
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export async function upsertSubscription(data: {
  userId: number;
  planName: string;
  billingPeriod: "monthly" | "annual";
  status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  trialEnd?: Date;
  amountCents?: number;
}) {
  const db = await getDb();
  if (!db) return;
  const { subscriptions } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");
  await db
    .insert(subscriptions)
    .values({
      userId: data.userId,
      planName: data.planName,
      billingPeriod: data.billingPeriod,
      status: data.status,
      stripeCustomerId: data.stripeCustomerId ?? null,
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      stripeCheckoutSessionId: data.stripeCheckoutSessionId ?? null,
      currentPeriodStart: data.currentPeriodStart ?? null,
      currentPeriodEnd: data.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      canceledAt: data.canceledAt ?? null,
      trialEnd: data.trialEnd ?? null,
      amountCents: data.amountCents ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        planName: data.planName,
        billingPeriod: data.billingPeriod,
        status: data.status,
        stripeCustomerId: data.stripeCustomerId ?? null,
        currentPeriodStart: data.currentPeriodStart ?? null,
        currentPeriodEnd: data.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        canceledAt: data.canceledAt ?? null,
        trialEnd: data.trialEnd ?? null,
        amountCents: data.amountCents ?? null,
        updatedAt: sql`NOW()`,
      },
    });
}

export async function getActiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const { subscriptions } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) =>
        inArray(t.status, ["active", "trialing", "past_due"]) &&
        eq(t.userId, userId)
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const { subscriptions } = await import("../drizzle/schema");
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(subscriptions.createdAt)
    .limit(1);
  return rows[0] ?? null;
}

export async function listSubscriptions(opts: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { subscriptions } = await import("../drizzle/schema");
  const { and, count, desc } = await import("drizzle-orm");
  const conditions = [eq(subscriptions.userId, subscriptions.userId)];
  if (opts.status) conditions.push(eq(subscriptions.status, opts.status as any));
  const where = and(...conditions);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(subscriptions)
      .where(where)
      .orderBy(desc(subscriptions.createdAt))
      .limit(opts.limit ?? 50)
      .offset(opts.offset ?? 0),
    db.select({ total: count() }).from(subscriptions).where(where),
  ]);
  return { rows, total };
}

// ─── Payment Audit Log ────────────────────────────────────────────────────────

export async function logPaymentEvent(data: {
  userId?: number;
  event: string;
  stripeEventId?: string;
  stripeObjectId?: string;
  amountCents?: number;
  currency?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  const { paymentAuditLog } = await import("../drizzle/schema");
  await db.insert(paymentAuditLog).values({
    userId: data.userId ?? null,
    event: data.event,
    stripeEventId: data.stripeEventId ?? null,
    stripeObjectId: data.stripeObjectId ?? null,
    amountCents: data.amountCents ?? null,
    currency: data.currency ?? null,
    status: data.status ?? null,
    metadata: data.metadata ?? null,
  });
}

export async function getPaymentAnalytics() {
  const db = await getDb();
  if (!db) return null;
  const { subscriptions, couponRedemptions, paymentAuditLog } = await import("../drizzle/schema");
  const { count, sum, inArray } = await import("drizzle-orm");

  const [
    [activeSubsRow],
    [trialSubsRow],
    [canceledSubsRow],
    [mrrRow],
    [totalRedemptionsRow],
    [totalDiscountRow],
    [failedPaymentsRow],
  ] = await Promise.all([
    db.select({ total: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
    db.select({ total: count() }).from(subscriptions).where(eq(subscriptions.status, "trialing")),
    db.select({ total: count() }).from(subscriptions).where(eq(subscriptions.status, "canceled")),
    db
      .select({ total: sum(subscriptions.amountCents) })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active")),
    db.select({ total: count() }).from(couponRedemptions),
    db.select({ total: sum(couponRedemptions.discountAmountCents) }).from(couponRedemptions),
    db
      .select({ total: count() })
      .from(paymentAuditLog)
      .where(eq(paymentAuditLog.event, "invoice.payment_failed")),
  ]);

  const mrrCents = Number(mrrRow?.total ?? 0);

  // Plan breakdown
  const { sql } = await import("drizzle-orm");
  const planRows = await db
    .select({ planName: subscriptions.planName, cnt: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"))
    .groupBy(subscriptions.planName);

  const planBreakdown: Record<string, number> = {};
  for (const r of planRows) planBreakdown[r.planName] = r.cnt;

  // Billing period split
  const billingRows = await db
    .select({ billingPeriod: subscriptions.billingPeriod, cnt: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"))
    .groupBy(subscriptions.billingPeriod);

  let monthlyCount = 0;
  let annualCount = 0;
  for (const r of billingRows) {
    if (r.billingPeriod === "monthly") monthlyCount = r.cnt;
    else if (r.billingPeriod === "annual") annualCount = r.cnt;
  }

  // Recent payment events (last 20)
  const { desc } = await import("drizzle-orm");
  const recentEvents = await db
    .select()
    .from(paymentAuditLog)
    .orderBy(desc(paymentAuditLog.createdAt))
    .limit(20);

  return {
    activeSubscriptions: activeSubsRow?.total ?? 0,
    trialSubscriptions: trialSubsRow?.total ?? 0,
    canceledSubscriptions: canceledSubsRow?.total ?? 0,
    mrrCents,
    arrCents: mrrCents * 12,
    monthlyRevenueCents: mrrCents,
    totalCouponRedemptions: totalRedemptionsRow?.total ?? 0,
    totalRedemptions: totalRedemptionsRow?.total ?? 0,
    totalDiscountCents: Number(totalDiscountRow?.total ?? 0),
    failedPayments: failedPaymentsRow?.total ?? 0,
    planBreakdown,
    monthlyCount,
    annualCount,
    recentEvents,
  };
}

// ─── Course Requests ──────────────────────────────────────────────────────────

import { courseRequests } from "../drizzle/schema";
import crypto from "crypto";

export async function createCourseRequest(
  studentId: number,
  courseId: number,
  requestedBy: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  // Check for existing pending or approved request
  const existing = await db.select().from(courseRequests)
    .where(and(
      eq(courseRequests.studentId, studentId),
      eq(courseRequests.courseId, courseId),
      inArray(courseRequests.status, ["pending", "approved"])
    ))
    .limit(1);
  if (existing.length > 0) return { alreadyExists: true, request: existing[0] };

  // Generate two single-use tokens (one for approve, one for reject)
  const approveToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [result] = await db.insert(courseRequests).values({
    studentId,
    courseId,
    requestedBy,
    status: "pending",
    approvalToken: approveToken,
    tokenAction: "approve",
    tokenExpiresAt,
  });
  const id = (result as { insertId: number }).insertId;
  return { alreadyExists: false, request: { id, approveToken, tokenExpiresAt } };
}

export async function getCourseRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(courseRequests).where(eq(courseRequests.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getCourseRequestByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(courseRequests)
    .where(eq(courseRequests.approvalToken, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCourseRequestsForStudent(studentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ request: courseRequests, course: courses })
    .from(courseRequests)
    .innerJoin(courses, eq(courseRequests.courseId, courses.id))
    .where(eq(courseRequests.studentId, studentId))
    .orderBy(courseRequests.createdAt);
}

export async function getPendingRequestsForParentStudents(studentIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (studentIds.length === 0) return [];
  return db.select({ request: courseRequests, course: courses })
    .from(courseRequests)
    .innerJoin(courses, eq(courseRequests.courseId, courses.id))
    .where(and(
      inArray(courseRequests.studentId, studentIds),
      eq(courseRequests.status, "pending")
    ))
    .orderBy(courseRequests.createdAt);
}

export async function getAllRequestsForParentStudents(studentIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (studentIds.length === 0) return [];
  return db.select({ request: courseRequests, course: courses })
    .from(courseRequests)
    .innerJoin(courses, eq(courseRequests.courseId, courses.id))
    .where(inArray(courseRequests.studentId, studentIds))
    .orderBy(courseRequests.createdAt);
}

export async function approveCourseRequest(requestId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(courseRequests)
    .set({ status: "approved", approvedBy, approvedAt: new Date(), tokenUsedAt: new Date() })
    .where(eq(courseRequests.id, requestId));
}

export async function rejectCourseRequest(requestId: number, rejectedBy: number, rejectionReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(courseRequests)
    .set({ status: "rejected", rejectedBy, rejectedAt: new Date(), rejectionReason: rejectionReason ?? null, tokenUsedAt: new Date() })
    .where(eq(courseRequests.id, requestId));
}

export async function cancelCourseRequest(requestId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(courseRequests)
    .set({ status: "cancelled" })
    .where(eq(courseRequests.id, requestId));
}

export async function getAllCourseRequestsAdmin(limit = 100, offset = 0, statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = statusFilter
    ? [eq(courseRequests.status, statusFilter as "pending" | "approved" | "rejected" | "cancelled")]
    : [];
  return db.select({
    request: courseRequests,
    course: courses,
    student: users,
  })
    .from(courseRequests)
    .innerJoin(courses, eq(courseRequests.courseId, courses.id))
    .innerJoin(users, eq(courseRequests.studentId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(courseRequests.createdAt)
    .limit(limit)
    .offset(offset);
}

export async function removeStudentCourseEnrollment(studentId: number, courseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(userCourseEnrollments)
    .set({ isActive: false })
    .where(and(
      eq(userCourseEnrollments.userId, studentId),
      eq(userCourseEnrollments.courseId, courseId)
    ));
}

export async function processCourseRequestToken(
  token: string,
  action: 'approve' | 'reject'
): Promise<{ success: boolean; reason?: 'expired' | 'already_actioned' | 'not_found' }> {
  const db = await getDb();
  if (!db) return { success: false, reason: 'not_found' };

  const rows = await db.select().from(courseRequests)
    .where(eq(courseRequests.approvalToken, token))
    .limit(1);

  const req = rows[0];
  if (!req) return { success: false, reason: 'not_found' };
  if (req.status !== 'pending') return { success: false, reason: 'already_actioned' };
  if (req.tokenExpiresAt && new Date() > new Date(req.tokenExpiresAt)) {
    return { success: false, reason: 'expired' };
  }

  if (action === 'approve') {
    await db.update(courseRequests)
      .set({ status: 'approved', approvedAt: new Date(), tokenUsedAt: new Date() })
      .where(eq(courseRequests.id, req.id));
    // Enroll the student in the course (ignore if already enrolled)
    await enrollUserInCourse(req.studentId, req.courseId).catch(() => {});
  } else {
    await db.update(courseRequests)
      .set({ status: 'rejected', rejectedAt: new Date(), tokenUsedAt: new Date() })
      .where(eq(courseRequests.id, req.id));
  }

  return { success: true };
}
