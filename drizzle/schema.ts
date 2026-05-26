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
