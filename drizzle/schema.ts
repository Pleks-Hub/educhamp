import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  accountType: mysqlEnum("accountType", ["student", "parent", "teacher"]).default("student").notNull(),
  grade: varchar("grade", { length: 16 }).default("9"),
  school: varchar("school", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Units ────────────────────────────────────────────────────────────────────

export const units = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  unitNumber: int("unitNumber").notNull().unique(),
  title: varchar("title", { length: 256 }).notNull(),
  overview: text("overview").notNull(),
  teksAlignment: text("teksAlignment"),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type Unit = typeof units.$inferSelect;

// ─── Lessons ─────────────────────────────────────────────────────────────────

export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  unitId: int("unitId").notNull(),
  lessonNumber: int("lessonNumber").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  teksAlignment: text("teksAlignment"),
  explanation: text("explanation").notNull(),
  workedExamples: json("workedExamples").$type<WorkedExample[]>().notNull(),
  guidedProblems: json("guidedProblems").$type<GuidedProblem[]>().notNull(),
  independentProblems: json("independentProblems").$type<IndependentProblem[]>().notNull(),
  misconceptions: json("misconceptions").$type<string[]>().notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type Lesson = typeof lessons.$inferSelect;

export type WorkedExample = {
  title: string;
  problem: string;
  steps: { step: string; explanation: string }[];
  answer: string;
};

export type GuidedProblem = {
  problem: string;
  hint1: string;
  hint2: string;
  solution: string;
  explanation: string;
};

export type IndependentProblem = {
  problem: string;
  solution: string;
  explanation: string;
};

// ─── Skills ───────────────────────────────────────────────────────────────────

export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  skillId: varchar("skillId", { length: 32 }).notNull().unique(), // ALG1-U1-S1
  skillName: varchar("skillName", { length: 256 }).notNull(),
  unitId: int("unitId").notNull(),
  unitNumber: int("unitNumber").notNull(),
  prerequisiteSkillIds: json("prerequisiteSkillIds").$type<string[]>().notNull().default([]),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type Skill = typeof skills.$inferSelect;

// ─── Quiz Questions ───────────────────────────────────────────────────────────

export const quizQuestions = mysqlTable("quizQuestions", {
  id: int("id").autoincrement().primaryKey(),
  unitId: int("unitId").notNull(),
  questionText: text("questionText").notNull(),
  questionType: mysqlEnum("questionType", ["multiple_choice", "short_answer", "open_response"]).notNull(),
  choices: json("choices").$type<{ label: string; text: string }[] | null>(),
  correctAnswer: varchar("correctAnswer", { length: 512 }).notNull(),
  explanation: text("explanation").notNull(),
  skillTag: varchar("skillTag", { length: 32 }).notNull(), // ALG1-U1-S1
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard", "challenge"]).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;

// ─── Diagnostic Questions ─────────────────────────────────────────────────────

export const diagnosticQuestions = mysqlTable("diagnosticQuestions", {
  id: int("id").autoincrement().primaryKey(),
  questionId: varchar("questionId", { length: 16 }).notNull().unique(), // DIAG-001
  questionText: text("questionText").notNull(),
  questionType: mysqlEnum("questionType", ["multiple_choice", "short_answer"]).notNull(),
  choices: json("choices").$type<{ label: string; text: string }[] | null>(),
  correctAnswer: varchar("correctAnswer", { length: 512 }).notNull(),
  mapsToUnit: varchar("mapsToUnit", { length: 64 }).notNull(), // unit number or "prerequisite"
  mapsToSkills: json("mapsToSkills").$type<string[]>().notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium"]).notNull(),
  explanation: text("explanation").notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type DiagnosticQuestion = typeof diagnosticQuestions.$inferSelect;

// ─── User Mastery ─────────────────────────────────────────────────────────────

export const userMastery = mysqlTable("userMastery", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  skillId: varchar("skillId", { length: 32 }).notNull(),
  score: int("score").notNull().default(0), // 0–100
  // 0-39: Beginner, 40-59: Developing, 60-74: Approaching, 75-89: Mastered, 90-100: Advanced
  attemptCount: int("attemptCount").notNull().default(0),
  lastAttemptAt: timestamp("lastAttemptAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserMastery = typeof userMastery.$inferSelect;

// ─── Unit Progress ────────────────────────────────────────────────────────────

export const unitProgress = mysqlTable("unitProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  unitId: int("unitId").notNull(),
  unitNumber: int("unitNumber").notNull(),
  status: mysqlEnum("status", ["locked", "in_progress", "quiz_unlocked", "completed"]).notNull().default("locked"),
  lessonsCompleted: int("lessonsCompleted").notNull().default(0),
  totalLessons: int("totalLessons").notNull().default(0),
  quizScore: int("quizScore"),
  quizAttempts: int("quizAttempts").notNull().default(0),
  lastActivityAt: timestamp("lastActivityAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UnitProgress = typeof unitProgress.$inferSelect;

// ─── Lesson Progress ──────────────────────────────────────────────────────────

export const lessonProgress = mysqlTable("lessonProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: int("lessonId").notNull(),
  unitId: int("unitId").notNull(),
  completed: boolean("completed").notNull().default(false),
  guidedCompleted: boolean("guidedCompleted").notNull().default(false),
  independentCompleted: boolean("independentCompleted").notNull().default(false),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LessonProgress = typeof lessonProgress.$inferSelect;

// ─── Quiz Attempts ────────────────────────────────────────────────────────────

export const quizAttempts = mysqlTable("quizAttempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  unitId: int("unitId").notNull(),
  unitNumber: int("unitNumber").notNull(),
  answers: json("answers").$type<{ questionId: number; answer: string; correct: boolean }[]>().notNull(),
  score: int("score").notNull(), // percentage 0-100
  totalQuestions: int("totalQuestions").notNull(),
  correctCount: int("correctCount").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type QuizAttempt = typeof quizAttempts.$inferSelect;

// ─── Diagnostic Attempts ──────────────────────────────────────────────────────

export const diagnosticAttempts = mysqlTable("diagnosticAttempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  answers: json("answers").$type<{ questionId: string; answer: string; correct: boolean }[]>().notNull(),
  unitResults: json("unitResults").$type<DiagnosticUnitResult[]>().notNull(),
  prerequisiteScore: int("prerequisiteScore").notNull(),
  overallScore: int("overallScore").notNull(),
  placementRecommendation: text("placementRecommendation"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});

export type DiagnosticAttempt = typeof diagnosticAttempts.$inferSelect;

export type DiagnosticUnitResult = {
  unitNumber: number;
  unitTitle: string;
  correct: number;
  total: number;
  status: "likely_mastered" | "partial_understanding" | "needs_instruction";
  recommendation: string;
};

// ─── Parent-Child Relationships ─────────────────────────────────────────────

/**
 * Links a parent user account to one or more child student accounts.
 * A child can have multiple parents (e.g. two guardians).
 * A parent can have multiple children.
 */
export const parentChildren = mysqlTable("parentChildren", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),           // FK → users.id (parent)
  childId: int("childId").notNull(),             // FK → users.id (child/student)
  nickname: varchar("nickname", { length: 128 }), // optional display name override
  relationship: varchar("relationship", { length: 64 }).default("parent"), // parent, guardian, teacher
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  isActive: boolean("isActive").notNull().default(true),
});

export type ParentChild = typeof parentChildren.$inferSelect;
export type InsertParentChild = typeof parentChildren.$inferInsert;

/**
 * Pending enrolment invitations — parent enters a child's email;
 * child gets a token to accept and link accounts.
 */
export const enrolmentInvitations = mysqlTable("enrolmentInvitations", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  childEmail: varchar("childEmail", { length: 320 }).notNull(),
  childName: varchar("childName", { length: 256 }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).notNull().default("pending"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EnrolmentInvitation = typeof enrolmentInvitations.$inferSelect;

// ─── Co-Parent / Guardian Access ────────────────────────────────────────────

/**
 * An existing parent invites another adult (co-parent / guardian) to view
 * a specific student's progress. The invitee receives a unique token link.
 * Once accepted, a coParentAccess row is created.
 */
export const coParentInvitations = mysqlTable("coParentInvitations", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),           // FK → users.id (student)
  invitedByParentId: int("invitedByParentId").notNull(), // FK → users.id (primary parent)
  inviteeEmail: varchar("inviteeEmail", { length: 320 }).notNull(),
  inviteeName: varchar("inviteeName", { length: 256 }),  // optional display name
  relationship: varchar("relationship", { length: 64 }).default("guardian"), // co-parent, guardian, grandparent, etc.
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "revoked", "expired"]).notNull().default("pending"),
  acceptedByUserId: int("acceptedByUserId"),       // FK → users.id (the co-parent who accepted)
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CoParentInvitation = typeof coParentInvitations.$inferSelect;
export type InsertCoParentInvitation = typeof coParentInvitations.$inferInsert;

/**
 * Active co-parent access records — one row per (student, co-parent) pair.
 * Created when an invitation is accepted. Soft-deleted via isActive.
 */
export const coParentAccess = mysqlTable("coParentAccess", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  coParentUserId: int("coParentUserId").notNull(),
  invitedByParentId: int("invitedByParentId").notNull(),
  invitationId: int("invitationId").notNull(),
  relationship: varchar("relationship", { length: 64 }).default("guardian"),
  isActive: boolean("isActive").notNull().default(true),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

export type CoParentAccess = typeof coParentAccess.$inferSelect;
export type InsertCoParentAccess = typeof coParentAccess.$inferInsert;

// ─── Tutor Sessions ───────────────────────────────────────────────────────────

export const tutorSessions = mysqlTable("tutorSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  unitId: int("unitId"),
  lessonId: int("lessonId"),
  mode: mysqlEnum("mode", ["teach", "practice", "quiz", "exam_review", "remediation", "parent_summary"]).notNull().default("teach"),
  messages: json("messages").$type<TutorMessage[]>().notNull().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TutorSession = typeof tutorSessions.$inferSelect;

export type TutorMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

// ─── Password Reset Tokens ────────────────────────────────────────────────────

export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ─── Two-Factor Authentication ────────────────────────────────────────────────

export const twoFactorAuth = mysqlTable("twoFactorAuth", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  secret: varchar("secret", { length: 256 }).notNull(),
  isEnabled: boolean("isEnabled").notNull().default(false),
  backupCodes: json("backupCodes").$type<string[]>(),
  enabledAt: timestamp("enabledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TwoFactorAuth = typeof twoFactorAuth.$inferSelect;

// ─── Parent Goals ─────────────────────────────────────────────────────────────

export const parentGoals = mysqlTable("parentGoals", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  childId: int("childId").notNull(),
  goalText: text("goalText").notNull(),
  targetDate: timestamp("targetDate"),
  isCompleted: boolean("isCompleted").notNull().default(false),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ParentGoal = typeof parentGoals.$inferSelect;

// ─── Parent Notes ─────────────────────────────────────────────────────────────

export const parentNotes = mysqlTable("parentNotes", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  childId: int("childId").notNull(),
  noteText: text("noteText").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ParentNote = typeof parentNotes.$inferSelect;
