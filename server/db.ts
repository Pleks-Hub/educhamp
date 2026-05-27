import { and, count as sqlCount, desc, eq, inArray } from "drizzle-orm";
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

export async function getParentsByChildId(childId: number): Promise<{ parentId: number; parentName: string | null; nickname: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      parentId: parentChildren.parentId,
      parentName: users.name,
      nickname: parentChildren.nickname,
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

export async function getAllUsers(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt));
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
