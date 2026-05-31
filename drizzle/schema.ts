import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  uniqueIndex,
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
  status: mysqlEnum("status", ["active", "suspended", "deactivated", "pending_verification", "archived", "deleted"]).notNull().default("active"),
  billingPeriod: mysqlEnum("billingPeriod", ["monthly", "annual"]).default("monthly"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  lastActiveAt: timestamp("lastActiveAt"),                  // updated on login + lesson/quiz activity
}, (t) => ({
  // P1-7: indexes for high-traffic lookup patterns
  emailIdx: index("users_email_idx").on(t.email),
  statusIdx: index("users_status_idx").on(t.status),
  roleIdx: index("users_role_idx").on(t.role),
  lastActiveIdx: index("users_last_active_idx").on(t.lastActiveAt),
}));
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Units ────────────────────────────────────────────────────────────────────

export const units = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull().default(1),
  unitNumber: int("unitNumber").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  overview: text("overview").notNull(),
  teksAlignment: text("teksAlignment"),
  sortOrder: int("sortOrder").notNull().default(0),
}, (t) => ({
  courseUnitUnique: uniqueIndex("course_unit_unique").on(t.courseId, t.unitNumber),
}));

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
  courseId: int("courseId").notNull().default(1), // FK → courses.id
  questionId: varchar("questionId", { length: 32 }).notNull().unique(), // DIAG-001, ENG1-D-001
  questionText: text("questionText").notNull(),
  questionType: mysqlEnum("questionType", ["multiple_choice", "short_answer"]).notNull(),
  choices: json("choices").$type<{ label: string; text: string }[] | null>(),
  correctAnswer: varchar("correctAnswer", { length: 512 }).notNull(),
  mapsToUnit: varchar("mapsToUnit", { length: 64 }).notNull(), // unit number or "prerequisite"
  mapsToSkills: json("mapsToSkills").$type<string[]>().notNull(),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
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
}, (t) => ({
  userIdIdx: index("userMastery_userId_idx").on(t.userId),
  userSkillIdx: uniqueIndex("userMastery_userId_skillId_idx").on(t.userId, t.skillId),
}));

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
}, (t) => ({
  userIdIdx: index("unitProgress_userId_idx").on(t.userId),
  userUnitIdx: uniqueIndex("unitProgress_userId_unitId_idx").on(t.userId, t.unitId),
}));

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
}, (t) => ({
  userIdIdx: index("lessonProgress_userId_idx").on(t.userId),
  userLessonIdx: uniqueIndex("lessonProgress_userId_lessonId_idx").on(t.userId, t.lessonId),
}));

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
  questionTimings: json("questionTimings").$type<{ questionId: number; seconds: number }[]>(),
  isPracticeMode: boolean("isPracticeMode").notNull().default(false),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("quizAttempts_userId_idx").on(t.userId),
  userUnitIdx: index("quizAttempts_userId_unitId_idx").on(t.userId, t.unitId),
}));

export type QuizAttempt = typeof quizAttempts.$inferSelect;

// ─── Diagnostic Attempts ──────────────────────────────────────────────────────

export const diagnosticAttempts = mysqlTable("diagnosticAttempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull().default(1),
  answers: json("answers").$type<{ questionId: string; answer: string; correct: boolean }[]>().notNull(),
  unitResults: json("unitResults").$type<DiagnosticUnitResult[]>().notNull(),
  prerequisiteScore: int("prerequisiteScore").notNull(),
  overallScore: int("overallScore").notNull(),
  placementRecommendation: text("placementRecommendation"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("diagnosticAttempts_userId_idx").on(t.userId),
  userCourseIdx: index("diagnosticAttempts_userId_courseId_idx").on(t.userId, t.courseId),
}));

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
}, (t) => ({
  // P1-7: indexes for parent-child lookups
  parentIdIdx: index("parentChildren_parentId_idx").on(t.parentId),
  childIdIdx: index("parentChildren_childId_idx").on(t.childId),
}));

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
  mode: mysqlEnum("mode", ["teach", "practice", "quiz", "exam_review", "exam_prep", "remediation", "parent_summary", "misconception_drill"]).notNull().default("teach"),
  messages: json("messages").$type<TutorMessage[]>().notNull().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  // P1-7: index for per-user session lookups
  userIdIdx: index("tutorSessions_userId_idx").on(t.userId),
  userUpdatedIdx: index("tutorSessions_userId_updatedAt_idx").on(t.userId, t.updatedAt),
}));

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

// ─── User Profiles (extended demographics) ───────────────────────────────────

/**
 * Extended demographic profile for all users (students and parents).
 * Collected during onboarding wizard after first OAuth sign-in.
 */
export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Common
  dateOfBirth: varchar("dateOfBirth", { length: 16 }),   // YYYY-MM-DD
  gender: varchar("gender", { length: 64 }),              // "male" | "female" | "non_binary" | "prefer_not_to_say" | custom
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  country: varchar("country", { length: 64 }).default("US"),
  // School info (students)
  schoolDistrict: varchar("schoolDistrict", { length: 256 }),
  schoolType: mysqlEnum("schoolType", ["public", "private", "homeschool", "charter", "other"]),
  schoolName: varchar("schoolName", { length: 256 }),
  gradeLevel: varchar("gradeLevel", { length: 16 }),      // "8" | "9" | "10" | "11" | "12" | "other"
  // Parent-specific
  parentSignupReason: text("parentSignupReason"),         // free-text "why are you signing up?"
  parentGoalCategory: varchar("parentGoalCategory", { length: 64 }), // "grade_improvement" | "test_prep" | "enrichment" | "remediation" | "homeschool_supplement" | "other"
  parentGoalDetail: text("parentGoalDetail"),             // AI-generated personalised goal statement
  // Personalization
  colorPalette: varchar("colorPalette", { length: 32 }).default("indigo"),
  displayName: varchar("displayName", { length: 128 }),
  preferredName: varchar("preferredName", { length: 64 }),   // nickname the AI uses when addressing the student
  aiWelcomeMessage: text("aiWelcomeMessage"),                 // custom welcome message shown in AI chat
  // Early childhood modes
  parentLedMode: boolean("parentLedMode").notNull().default(false), // Parent-Led Learning Mode for Pre-K/K
  disableAnimations: boolean("disableAnimations").notNull().default(false), // Disable celebration animations
  disableSound: boolean("disableSound").notNull().default(false), // Disable celebration sounds
  // Onboarding state
  onboardingCompleted: boolean("onboardingCompleted").notNull().default(false),
  onboardingStep: int("onboardingStep").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─── Referrals ────────────────────────────────────────────────────────────────

/**
 * Platform referral links. Any user can generate a referral code.
 * When a new user signs up via a referral link, the referrer is credited.
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),               // FK → users.id (who created the link)
  code: varchar("code", { length: 32 }).notNull().unique(), // short alphanumeric code
  // Tracking
  clickCount: int("clickCount").notNull().default(0),
  signupCount: int("signupCount").notNull().default(0),
  // Optional target audience hint (for personalised landing page copy)
  targetRole: mysqlEnum("targetRole", ["parent", "student", "teacher"]).default("parent"),
  note: varchar("note", { length: 256 }),                // e.g. "Shared on Facebook"
  isActive: boolean("isActive").notNull().default(true),
  expiresAt: timestamp("expiresAt"),                     // null = never expires
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;

/**
 * Records each time a referral code resulted in a new user sign-up.
 */
export const referralSignups = mysqlTable("referralSignups", {
  id: int("id").autoincrement().primaryKey(),
  referralId: int("referralId").notNull(),               // FK → referrals.id
  referrerId: int("referrerId").notNull(),               // FK → users.id
  newUserId: int("newUserId").notNull(),                  // FK → users.id (the person who signed up)
  newUserEmail: varchar("newUserEmail", { length: 320 }),
  signedUpAt: timestamp("signedUpAt").defaultNow().notNull(),
});

export type ReferralSignup = typeof referralSignups.$inferSelect;

// ─── Student Invite Tokens (parent → child) ───────────────────────────────────

/**
 * When a parent adds a child, a unique invite token is generated.
 * The child uses this token to complete their account setup.
 * Students CANNOT self-register — they must use a parent-issued invite token.
 */
export const studentInviteTokens = mysqlTable("studentInviteTokens", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),                   // FK → users.id (parent who invited)
  childId: int("childId"),                               // FK → users.id — set once child signs up
  token: varchar("token", { length: 128 }).notNull().unique(),
  childName: varchar("childName", { length: 256 }),
  childEmail: varchar("childEmail", { length: 320 }),
  childGrade: varchar("childGrade", { length: 32 }),      // pre-set by parent, pre-fills student onboarding
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).notNull().default("pending"),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudentInviteToken = typeof studentInviteTokens.$inferSelect;

// ─── Courses ──────────────────────────────────────────────────────────────────

/**
 * A course is a subject offering (e.g. "Algebra I", "English I", "Biology I").
 * All units, skills, quiz questions, and diagnostic questions belong to a course.
 * The original Algebra I content maps to courseId = 1.
 */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  courseCode: varchar("courseCode", { length: 32 }).notNull().unique(), // e.g. "ALG1", "ENG1", "BIO1"
  title: varchar("title", { length: 256 }).notNull(),
  subject: varchar("subject", { length: 64 }).notNull(),   // "math" | "english" | "science" | "social_studies" | "language" | "other"
  gradeLevel: varchar("gradeLevel", { length: 16 }).notNull(), // "3" | "9" | "AP" etc.
  description: text("description"),
  teksCode: varchar("teksCode", { length: 128 }),           // e.g. "TEKS 111.39"
    isActive: boolean("isActive").notNull().default(true),
  isDefault: boolean("isDefault").notNull().default(false), // the course shown to new students by default
  sortOrder: int("sortOrder").notNull().default(0),
  status: mysqlEnum("status", ["active", "archived", "suspended"]).notNull().default("active"),
  diagnosticCooldownDays: int("diagnosticCooldownDays").notNull().default(7), // per-course retake cooldown
  isTimedExam: boolean("isTimedExam").notNull().default(false),  // enables countdown timer in quiz mode
  timeLimitMinutes: int("timeLimitMinutes"),                      // null = no limit; total minutes for the full unit quiz
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Course = typeof courses.$inferSelect;

// ─── User Course Enrollments ──────────────────────────────────────────────────

/**
 * Tracks which courses a student is enrolled in and which one is currently active.
 */
export const userCourseEnrollments = mysqlTable("userCourseEnrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  isCurrent: boolean("isCurrent").notNull().default(false), // the course currently shown in the UI
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdIdx: index("userCourseEnrollments_userId_idx").on(t.userId),
  userCourseIdx: uniqueIndex("userCourseEnrollments_userId_courseId_idx").on(t.userId, t.courseId),
}));

export type UserCourseEnrollment = typeof userCourseEnrollments.$inferSelect;

// ─── Platform Settings ────────────────────────────────────────────────────────

/**
 * Key-value store for platform-wide configuration managed by admins.
 * Values are stored as JSON strings for flexibility.
 */
export const platformSettings = mysqlTable("platformSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value").notNull(),                           // JSON-encoded value
  label: varchar("label", { length: 256 }),                 // human-readable label
  description: text("description"),
  category: varchar("category", { length: 64 }).notNull().default("general"), // "general" | "features" | "notifications" | "ai" | "enrollment"
  updatedBy: int("updatedBy"),                              // FK → users.id (last admin who changed it)
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;

// ─── Admin Audit Log ──────────────────────────────────────────────────────────

/**
 * Records all admin actions for accountability and debugging.
 */
export const adminAuditLog = mysqlTable("adminAuditLog", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),                        // FK → users.id
  action: varchar("action", { length: 128 }).notNull(),     // e.g. "user.role_change", "course.create"
  targetType: varchar("targetType", { length: 64 }),        // "user" | "course" | "setting" | "content"
  targetId: int("targetId"),                                // ID of the affected record
  details: json("details").$type<Record<string, unknown>>(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminAuditLogEntry = typeof adminAuditLog.$inferSelect;

// ─── Parent Invite Tokens ─────────────────────────────────────────────────────
/**
 * Tokens created by students to invite a parent/guardian to link their account.
 * This is the reverse of studentInviteTokens (student → parent direction).
 */
export const parentInviteTokens = mysqlTable("parentInviteTokens", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),                    // FK → users.id (student who sent invite)
  parentId: int("parentId"),                                // FK → users.id — set once parent signs up
  token: varchar("token", { length: 128 }).notNull().unique(),
  parentName: varchar("parentName", { length: 256 }),       // optional name hint
  parentEmail: varchar("parentEmail", { length: 320 }),     // email to send invite to
  parentPhone: varchar("parentPhone", { length: 32 }),      // optional phone
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked", "rejected"]).notNull().default("pending"),
  studentName: varchar("studentName", { length: 256 }),       // student's display name for email
  studentGrade: varchar("studentGrade", { length: 64 }),      // student's grade level for email
  courseName: varchar("courseName", { length: 256 }),         // active course name for email
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  rejectedAt: timestamp("rejectedAt"),
  resendCount: int("resendCount").notNull().default(0),
  lastResentAt: timestamp("lastResentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  // P1-1: indexes for invite polling (polled every 30s by notification bell)
  studentStatusIdx: index("parentInviteTokens_studentId_status_idx").on(t.studentId, t.status),
  parentIdIdx: index("parentInviteTokens_parentId_idx").on(t.parentId),
  statusExpiresIdx: index("parentInviteTokens_status_expiresAt_idx").on(t.status, t.expiresAt),
}));
export type ParentInviteToken = typeof parentInviteTokens.$inferSelect;

// ─── Newsletter Subscriptions ─────────────────────────────────────────────────
/**
 * Email addresses that have subscribed to EduChamp updates/newsletter.
 */
export const newsletterSubscriptions = mysqlTable("newsletterSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 256 }),
  source: varchar("source", { length: 64 }).notNull().default("landing_page"), // "landing_page" | "onboarding" | "dashboard"
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribedAt"),
  isActive: boolean("isActive").notNull().default(true),
});
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;

// ─── Newsletter Campaigns ─────────────────────────────────────────────────────
/**
 * Newsletter campaigns created and managed by admins.
 * Supports AI-drafted content, scheduling, audience segmentation, and analytics.
 */
export const newsletterCampaigns = mysqlTable("newsletterCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  bodyHtml: text("bodyHtml").notNull(),
  bodyText: text("bodyText"),
  segment: mysqlEnum("segment", ["all", "students", "parents", "landing_page"]).notNull().default("all"),
  status: mysqlEnum("status", ["draft", "scheduled", "sent", "cancelled"]).notNull().default("draft"),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  recipientCount: int("recipientCount").default(0),
  openCount: int("openCount").default(0),
  clickCount: int("clickCount").default(0),
  aiGenerated: boolean("aiGenerated").notNull().default(false),
  createdBy: int("createdBy"),   // FK → users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type NewsletterCampaign = typeof newsletterCampaigns.$inferSelect;
export type InsertNewsletterCampaign = typeof newsletterCampaigns.$inferInsert;

// ─── Landing Chat Sessions ────────────────────────────────────────────────────
/**
 * Stores anonymous visitor chat sessions from the landing page chatbot.
 * Used for lead capture and admin review.
 */
export const chatSessions = mysqlTable("chatSessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 64 }).notNull().unique(),
  visitorEmail: varchar("visitorEmail", { length: 256 }),
  visitorName: varchar("visitorName", { length: 256 }),
  visitorPhone: varchar("visitorPhone", { length: 32 }),
  source: varchar("source", { length: 64 }).default("landing_page"),
  status: mysqlEnum("status", ["active", "converted", "archived"]).notNull().default("active"),
  messageCount: int("messageCount").notNull().default(0),
  lastMessageAt: timestamp("lastMessageAt"),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ChatSession = typeof chatSessions.$inferSelect;

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ChatMessage = typeof chatMessages.$inferSelect;

// ─── CMS Content ─────────────────────────────────────────────────────────────

/**
 * Stores all editable site content blocks (hero text, FAQ entries, banners, etc.)
 * Each row has a stable `key` (e.g. "home.hero.title"), a `publishedValue` (live),
 * and a `draftValue` (pending). Admins edit the draft, then publish to go live.
 */
export const cmsContent = mysqlTable("cmsContent", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),   // e.g. "home.hero.title"
  section: varchar("section", { length: 64 }).notNull(),     // "homepage" | "faq" | "banners" | "announcements" | "onboarding"
  label: varchar("label", { length: 256 }).notNull(),        // Human-readable label for admin UI
  contentType: mysqlEnum("contentType", ["text", "richtext", "image", "url", "boolean"]).notNull().default("text"),
  publishedValue: text("publishedValue"),                    // Currently live value
  draftValue: text("draftValue"),                            // Pending draft (null = no pending changes)
  isDraft: boolean("isDraft").notNull().default(false),      // true when draftValue differs from publishedValue
  version: int("version").notNull().default(1),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CmsContent = typeof cmsContent.$inferSelect;

/**
 * Full version history for each CMS content entry.
 */
export const cmsContentHistory = mysqlTable("cmsContentHistory", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull(),
  version: int("version").notNull(),
  value: text("value"),
  changedBy: int("changedBy"),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
  changeNote: varchar("changeNote", { length: 512 }),
});
export type CmsContentHistory = typeof cmsContentHistory.$inferSelect;

// ─── RBAC: Admin Roles & Permissions ─────────────────────────────────────────

/**
 * Custom administrative roles (e.g. "Content Manager", "Academic Coordinator").
 * System roles (isSystem=true) cannot be deleted.
 */
export const adminRoles = mysqlTable("adminRoles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  description: text("description"),
  isSystem: boolean("isSystem").notNull().default(false),   // built-in roles cannot be deleted
  isActive: boolean("isActive").notNull().default(true),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdminRole = typeof adminRoles.$inferSelect;

/**
 * Granular permission entries per role.
 * resource: users | courses | cms | rbac | reports | diagnostics | settings | enrollments
 * action:   view | create | edit | delete | approve | export
 */
export const rolePermissions = mysqlTable("rolePermissions", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId").notNull(),
  resource: varchar("resource", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
}, (t) => ({
  roleResourceActionUnique: uniqueIndex("role_resource_action_unique").on(t.roleId, t.resource, t.action),
}));
export type RolePermission = typeof rolePermissions.$inferSelect;

/**
 * Assigns admin roles to users. A user can have multiple roles.
 */
export const adminRoleAssignments = mysqlTable("adminRoleAssignments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  roleId: int("roleId").notNull(),
  assignedBy: int("assignedBy").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  isActive: boolean("isActive").notNull().default(true),
}, (t) => ({
  userRoleUnique: uniqueIndex("user_role_unique").on(t.userId, t.roleId),
}));
export type AdminRoleAssignment = typeof adminRoleAssignments.$inferSelect;

// ─── Email Logs ───────────────────────────────────────────────────────────────

/**
 * Audit log for all transactional emails sent by EduChamp.
 * Records delivery status, Resend message ID, and any error messages.
 */
export const emailLogs = mysqlTable("emailLogs", {
  id: int("id").autoincrement().primaryKey(),
  toEmail: varchar("toEmail", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  templateName: varchar("templateName", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "skipped"]).notNull(),
  messageId: varchar("messageId", { length: 256 }),   // Resend message ID
  referenceId: varchar("referenceId", { length: 256 }), // e.g. checkout_xxx or sub_xxx
  errorMessage: text("errorMessage"),
  /** Delivery status updated by Resend webhook events */
  deliveryStatus: mysqlEnum("deliveryStatus", ["sent", "delivered", "opened", "bounced", "complained", "failed"]).default("sent"),
  deliveryUpdatedAt: timestamp("deliveryUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  // P1-1: indexes for admin email logs tab
  toEmailIdx: index("emailLogs_toEmail_idx").on(t.toEmail),
  statusIdx: index("emailLogs_status_idx").on(t.status),
  createdAtIdx: index("emailLogs_createdAt_idx").on(t.createdAt),
}));
export type EmailLog = typeof emailLogs.$inferSelect;

/**
 * In-app notifications for individual users.
 * Used for system alerts, invite status updates, and platform messages.
 */
export const userNotifications = mysqlTable("userNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull().default("general"),
  // e.g. "invite_expired" | "invite_accepted" | "invite_declined" | "general"
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  metadata: text("metadata"), // JSON string for extra context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("userNotifications_userId_idx").on(t.userId),
  userReadIdx: index("userNotifications_userId_isRead_idx").on(t.userId, t.isRead),
}));
export type UserNotification = typeof userNotifications.$inferSelect;

// ─── Demo Requests (ISD / School Licensing Leads) ────────────────────────────

export const demoRequests = mysqlTable("demoRequests", {
  id: int("id").autoincrement().primaryKey(),

  // Submitter info
  fullName: varchar("fullName", { length: 256 }).notNull(),
  schoolName: varchar("schoolName", { length: 256 }).notNull(),
  roleTitle: varchar("roleTitle", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),

  // Institutional details
  numStudents: varchar("numStudents", { length: 64 }),       // e.g. "500-1000"
  gradeLevels: text("gradeLevels"),                          // JSON array of strings
  subjects: text("subjects"),                                // JSON array of strings
  challenges: text("challenges"),                            // free text

  // Engagement details
  interestType: mysqlEnum("interestType", [
    "demo",
    "pilot",
    "district_license",
    "campus_license",
    "partnership",
    "curriculum_licensing",
    "other",
  ]).notNull().default("demo"),
  preferredTime: varchar("preferredTime", { length: 128 }),  // e.g. "Weekday mornings"
  notes: text("notes"),

  // CRM workflow
  status: mysqlEnum("status", [
    "new",
    "contacted",
    "demo_scheduled",
    "proposal_sent",
    "closed_won",
    "closed_lost",
    "on_hold",
  ]).notNull().default("new"),
  assignedTo: varchar("assignedTo", { length: 256 }),        // admin name / email
  adminNotes: text("adminNotes"),
  respondedAt: timestamp("respondedAt"),

  // Audit
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  emailIdx: index("demoRequests_email_idx").on(t.email),
  statusIdx: index("demoRequests_status_idx").on(t.status),
  createdAtIdx: index("demoRequests_createdAt_idx").on(t.createdAt),
}));

export type DemoRequest = typeof demoRequests.$inferSelect;
export type InsertDemoRequest = typeof demoRequests.$inferInsert;

// ─── Coupons ──────────────────────────────────────────────────────────────────

export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),

  // Discount configuration
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(),
  discountValue: float("discountValue").notNull(),               // % or cents
  maxDiscountAmount: float("maxDiscountAmount"),                  // cap for percentage discounts

  // Applicability
  applicablePlans: json("applicablePlans").$type<string[]>(), // [] = all plans; nullable, default handled in app layer
  eligibility: mysqlEnum("eligibility", ["all", "new_users", "parents", "students", "schools", "selected"]).notNull().default("all"),
  selectedUserIds: json("selectedUserIds").$type<number[]>(),    // only used when eligibility = 'selected'
  minAmount: float("minAmount"),                                 // minimum subscription price in cents

  // Usage limits
  usageLimit: int("usageLimit"),                                 // null = unlimited
  perUserLimit: int("perUserLimit").notNull().default(1),
  usageCount: int("usageCount").notNull().default(0),

  // Duration
  duration: mysqlEnum("duration", ["once", "repeating", "forever"]).notNull().default("once"),
  durationMonths: int("durationMonths"),                         // only for repeating

  // Validity
  startDate: timestamp("startDate"),
  expiresAt: timestamp("expiresAt"),
  status: mysqlEnum("status", ["active", "paused", "expired", "archived"]).notNull().default("active"),

  // Stacking
  isStackable: boolean("isStackable").notNull().default(false),

  // Stripe coupon ID (synced when created)
  stripeCouponId: varchar("stripeCouponId", { length: 128 }),
  stripePromotionCodeId: varchar("stripePromotionCodeId", { length: 128 }),

  createdBy: int("createdBy"),                                   // FK → users.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  codeIdx: uniqueIndex("coupons_code_idx").on(t.code),
  statusIdx: index("coupons_status_idx").on(t.status),
}));

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// ─── Coupon Redemptions ───────────────────────────────────────────────────────

export const couponRedemptions = mysqlTable("couponRedemptions", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("couponId").notNull(),
  userId: int("userId").notNull(),
  planName: varchar("planName", { length: 128 }).notNull(),
  billingPeriod: mysqlEnum("billingPeriod", ["monthly", "annual"]).notNull().default("monthly"),
  originalAmountCents: int("originalAmountCents").notNull(),
  discountAmountCents: int("discountAmountCents").notNull(),
  finalAmountCents: int("finalAmountCents").notNull(),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 256 }),
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
}, (t) => ({
  couponIdIdx: index("couponRedemptions_couponId_idx").on(t.couponId),
  userIdIdx: index("couponRedemptions_userId_idx").on(t.userId),
}));

export type CouponRedemption = typeof couponRedemptions.$inferSelect;

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planName: varchar("planName", { length: 128 }).notNull(),
  billingPeriod: mysqlEnum("billingPeriod", ["monthly", "annual"]).notNull().default("monthly"),
  status: mysqlEnum("status", ["trialing", "active", "past_due", "canceled", "unpaid", "incomplete"]).notNull().default("active"),

  // Stripe identifiers
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }).unique(),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 256 }),

  // Billing cycle
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
  canceledAt: timestamp("canceledAt"),
  trialEnd: timestamp("trialEnd"),

  // Pricing snapshot
  amountCents: int("amountCents"),
  currency: varchar("currency", { length: 8 }).notNull().default("usd"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  userIdIdx: index("subscriptions_userId_idx").on(t.userId),
  stripeSubIdx: index("subscriptions_stripeSubscriptionId_idx").on(t.stripeSubscriptionId),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Payment Audit Log ────────────────────────────────────────────────────────

export const paymentAuditLog = mysqlTable("paymentAuditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  event: varchar("event", { length: 128 }).notNull(),            // e.g. "checkout.session.completed"
  stripeEventId: varchar("stripeEventId", { length: 256 }).unique(),
  stripeObjectId: varchar("stripeObjectId", { length: 256 }),    // subscription/invoice/payment_intent ID
  amountCents: int("amountCents"),
  currency: varchar("currency", { length: 8 }),
  status: varchar("status", { length: 64 }),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  userIdIdx: index("paymentAuditLog_userId_idx").on(t.userId),
  eventIdx: index("paymentAuditLog_event_idx").on(t.event),
  createdAtIdx: index("paymentAuditLog_createdAt_idx").on(t.createdAt),
}));

export type PaymentAuditLogEntry = typeof paymentAuditLog.$inferSelect;

// ─── Email Suppression List ───────────────────────────────────────────────────
/**
 * Tracks email addresses that should never receive transactional emails.
 * Populated automatically by the Resend bounce/complaint webhook.
 * sendEmail() checks this table before every send.
 */
export const emailSuppression = mysqlTable("emailSuppression", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  reason: mysqlEnum("reason", ["bounced", "complained", "manual"]).notNull(),
  resendEventId: varchar("resendEventId", { length: 256 }),
  suppressedAt: timestamp("suppressedAt").defaultNow().notNull(),
  unsuppressedAt: timestamp("unsuppressedAt"),
  isActive: boolean("isActive").notNull().default(true),
  notes: text("notes"),
}, (t) => ({
  emailIdx: uniqueIndex("emailSuppression_email_idx").on(t.email),
  activeIdx: index("emailSuppression_isActive_idx").on(t.isActive),
}));

export type EmailSuppressionEntry = typeof emailSuppression.$inferSelect;

// ─── Suppression Audit Log ────────────────────────────────────────────────────
/**
 * Records every admin action taken on the emailSuppression table.
 * Provides a full audit trail for compliance and debugging.
 */
export const suppressionAuditLog = mysqlTable("suppressionAuditLog", {
  id: int("id").autoincrement().primaryKey(),
  suppressionId: int("suppressionId").notNull(),   // FK → emailSuppression.id
  email: varchar("email", { length: 320 }).notNull(),
  action: mysqlEnum("action", ["suppressed", "unsuppressed", "updated"]).notNull(),
  reason: mysqlEnum("reason", ["bounced", "complained", "manual"]),
  adminId: int("adminId"),                          // FK → users.id (null = system/webhook)
  adminName: varchar("adminName", { length: 256 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  suppressionIdIdx: index("suppressionAuditLog_suppressionId_idx").on(t.suppressionId),
  emailIdx: index("suppressionAuditLog_email_idx").on(t.email),
  adminIdIdx: index("suppressionAuditLog_adminId_idx").on(t.adminId),
}));

export type SuppressionAuditLogEntry = typeof suppressionAuditLog.$inferSelect;

// ─── Course Requests ──────────────────────────────────────────────────────────
/**
 * Tracks student course access requests that require parent/guardian approval.
 * Students submit requests; parents approve or reject via dashboard or email link.
 * Direct parent-initiated assignments bypass this table (they go straight to userCourseEnrollments).
 */
export const courseRequests = mysqlTable("courseRequests", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),                     // FK → users.id (the student)
  courseId: int("courseId").notNull(),                       // FK → courses.id
  requestedBy: int("requestedBy").notNull(),                 // FK → users.id (always the student)
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).notNull().default("pending"),

  // Approval / rejection actors
  approvedBy: int("approvedBy"),                             // FK → users.id (parent who approved)
  rejectedBy: int("rejectedBy"),                             // FK → users.id (parent who rejected)
  approvedAt: timestamp("approvedAt"),
  rejectedAt: timestamp("rejectedAt"),
  rejectionReason: text("rejectionReason"),                  // optional message from parent

  // Email-link approval token (single-use, 7-day expiry)
  approvalToken: varchar("approvalToken", { length: 128 }).unique(),
  tokenAction: mysqlEnum("tokenAction", ["approve", "reject"]),  // which action this token performs
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  tokenUsedAt: timestamp("tokenUsedAt"),                     // set when token is consumed

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  studentStatusIdx: index("courseRequests_studentId_status_idx").on(t.studentId, t.status),
  tokenIdx: index("courseRequests_approvalToken_idx").on(t.approvalToken),
  courseIdIdx: index("courseRequests_courseId_idx").on(t.courseId),
}));

export type CourseRequest = typeof courseRequests.$inferSelect;
export type InsertCourseRequest = typeof courseRequests.$inferInsert;

// ─── Inactivity Notifications ─────────────────────────────────────────────────
/**
 * Records inactivity notification emails sent to students and parents.
 * Used to prevent duplicate notifications within the same tier window.
 */
export const inactivityNotifications = mysqlTable("inactivityNotifications", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),                       // FK → users.id (student)
  notificationType: mysqlEnum("notificationType", ["7day", "14day", "30day", "manual"]).notNull(),
  recipientType: mysqlEnum("recipientType", ["student", "parent"]).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  inactiveDays: int("inactiveDays").notNull(),                 // how many days inactive at time of send
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  studentTypeIdx: index("inactivityNotif_studentId_type_idx").on(t.studentId, t.notificationType),
}));

export type InactivityNotification = typeof inactivityNotifications.$inferSelect;
export type InsertInactivityNotification = typeof inactivityNotifications.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// Sprint 60 — Gamification Framework
// ═══════════════════════════════════════════════════════════════════════════════

// ─── XP Ledger ────────────────────────────────────────────────────────────────
/**
 * Immutable ledger of every XP transaction.
 * source: the event type that triggered the award.
 * sourceId: optional FK to the triggering record (quizAttemptId, lessonId, etc.)
 */
export const xpLedger = mysqlTable("xpLedger", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(),                                // XP awarded (always positive)
  source: varchar("source", { length: 64 }).notNull(),           // "lesson_complete" | "quiz_pass" | "mastery" | "streak" | "diagnostic" | "quest" | "badge"
  sourceId: varchar("sourceId", { length: 64 }),                 // optional reference id
  description: varchar("description", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("xpLedger_userId_idx").on(t.userId),
  userSourceIdx: index("xpLedger_userId_source_idx").on(t.userId, t.source),
  createdAtIdx: index("xpLedger_createdAt_idx").on(t.createdAt),
}));

export type XpLedgerEntry = typeof xpLedger.$inferSelect;
export type InsertXpLedgerEntry = typeof xpLedger.$inferInsert;

// ─── Student Levels ───────────────────────────────────────────────────────────
/**
 * Aggregated XP total and current level for each student.
 * Updated after every XP award via upsert.
 */
export const studentLevels = mysqlTable("studentLevels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  totalXp: int("totalXp").notNull().default(0),
  currentLevel: int("currentLevel").notNull().default(1),
  currentLevelName: varchar("currentLevelName", { length: 64 }).notNull().default("Rookie Learner"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentLevel = typeof studentLevels.$inferSelect;
export type InsertStudentLevel = typeof studentLevels.$inferInsert;

// ─── Badges ───────────────────────────────────────────────────────────────────
/**
 * Master badge catalogue. Seeded at startup; admins can add more.
 * category: "academic" | "achievement" | "behavioral" | "consistency" | "special" | "parent_engagement"
 */
export const badges = mysqlTable("badges", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),        // machine-readable slug e.g. "first_quiz_passed"
  name: varchar("name", { length: 128 }).notNull(),
  description: varchar("description", { length: 512 }).notNull(),
  category: varchar("category", { length: 64 }).notNull().default("achievement"),
  iconEmoji: varchar("iconEmoji", { length: 8 }).notNull().default("🏅"),
  xpReward: int("xpReward").notNull().default(50),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;

// ─── User Badges ──────────────────────────────────────────────────────────────
export const userBadges = mysqlTable("userBadges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badgeId: int("badgeId").notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  seenAt: timestamp("seenAt"),                                   // null = unseen (triggers celebration)
}, (t) => ({
  userIdx: index("userBadges_userId_idx").on(t.userId),
  userBadgeUniq: uniqueIndex("userBadges_userId_badgeId_idx").on(t.userId, t.badgeId),
}));

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;

// ─── Quests ───────────────────────────────────────────────────────────────────
/**
 * Quest template catalogue.
 * requirementType: "lessons_completed" | "quizzes_passed" | "xp_earned" | "mastery_achieved" | "streak_days" | "diagnostic_improved"
 */
export const quests = mysqlTable("quests", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 128 }).notNull(),
  description: varchar("description", { length: 512 }).notNull(),
  questType: mysqlEnum("questType", ["daily", "weekly", "monthly"]).notNull().default("daily"),
  xpReward: int("xpReward").notNull().default(100),
  badgeId: int("badgeId"),                                       // optional badge awarded on completion
  requirementType: varchar("requirementType", { length: 64 }).notNull(),
  requirementValue: int("requirementValue").notNull().default(1),
  isActive: boolean("isActive").notNull().default(true),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type Quest = typeof quests.$inferSelect;
export type InsertQuest = typeof quests.$inferInsert;

// ─── User Quests ──────────────────────────────────────────────────────────────
export const userQuests = mysqlTable("userQuests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questId: int("questId").notNull(),
  assignedDate: varchar("assignedDate", { length: 16 }).notNull(), // YYYY-MM-DD
  progress: int("progress").notNull().default(0),
  completedAt: timestamp("completedAt"),
  xpAwarded: boolean("xpAwarded").notNull().default(false),
}, (t) => ({
  userIdx: index("userQuests_userId_idx").on(t.userId),
  userDateIdx: index("userQuests_userId_date_idx").on(t.userId, t.assignedDate),
  userQuestDateUniq: uniqueIndex("userQuests_userId_questId_date_idx").on(t.userId, t.questId, t.assignedDate),
}));

export type UserQuest = typeof userQuests.$inferSelect;
export type InsertUserQuest = typeof userQuests.$inferInsert;

// ─── Streaks ──────────────────────────────────────────────────────────────────
export const streaks = mysqlTable("streaks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  currentStreak: int("currentStreak").notNull().default(0),
  longestStreak: int("longestStreak").notNull().default(0),
  lastActivityDate: varchar("lastActivityDate", { length: 16 }),  // YYYY-MM-DD
  streakFreezeCount: int("streakFreezeCount").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = typeof streaks.$inferInsert;

// ─── Houses ───────────────────────────────────────────────────────────────────
export const houses = mysqlTable("houses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(),       // "Titans" | "Eagles" | "Lions" | "Falcons"
  color: varchar("color", { length: 32 }).notNull().default("#4f46e5"),
  mascotEmoji: varchar("mascotEmoji", { length: 8 }).notNull().default("🦅"),
  totalPoints: int("totalPoints").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type House = typeof houses.$inferSelect;
export type InsertHouse = typeof houses.$inferInsert;

// ─── User Houses ──────────────────────────────────────────────────────────────
export const userHouses = mysqlTable("userHouses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  houseId: int("houseId").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  pointsContributed: int("pointsContributed").notNull().default(0),
}, (t) => ({
  houseIdx: index("userHouses_houseId_idx").on(t.houseId),
}));

export type UserHouse = typeof userHouses.$inferSelect;
export type InsertUserHouse = typeof userHouses.$inferInsert;

// ─── Seasonal Challenges ──────────────────────────────────────────────────────
export const seasonalChallenges = mysqlTable("seasonalChallenges", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 128 }).notNull(),
  description: text("description"),
  theme: varchar("theme", { length: 64 }),                       // "summer" | "back_to_school" | "sat_sprint" | "stem_month"
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  badgeId: int("badgeId"),
  xpBonus: int("xpBonus").notNull().default(0),
  isActive: boolean("isActive").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SeasonalChallenge = typeof seasonalChallenges.$inferSelect;
export type InsertSeasonalChallenge = typeof seasonalChallenges.$inferInsert;

// ─── User Seasonal Progress ───────────────────────────────────────────────────
export const userSeasonalProgress = mysqlTable("userSeasonalProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  challengeId: int("challengeId").notNull(),
  progress: int("progress").notNull().default(0),
  completedAt: timestamp("completedAt"),
}, (t) => ({
  userChallengeUniq: uniqueIndex("userSeasonal_userId_challengeId_idx").on(t.userId, t.challengeId),
}));

export type UserSeasonalProgress = typeof userSeasonalProgress.$inferSelect;

// ─── Rewards Marketplace ──────────────────────────────────────────────────────
/**
 * Parent-configurable real-world reward goals.
 * Parents create rewards; students redeem with XP.
 */
export const rewardsMarketplace = mysqlTable("rewardsMarketplace", {
  id: int("id").autoincrement().primaryKey(),
  parentUserId: int("parentUserId").notNull(),                   // parent who created this reward
  childUserId: int("childUserId").notNull(),                     // student it applies to
  rewardTitle: varchar("rewardTitle", { length: 256 }).notNull(),
  xpCost: int("xpCost").notNull(),
  category: varchar("category", { length: 64 }).default("custom"), // "screen_time" | "outing" | "treat" | "custom"
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  parentIdx: index("rewardsMarket_parentUserId_idx").on(t.parentUserId),
  childIdx: index("rewardsMarket_childUserId_idx").on(t.childUserId),
}));

export type RewardItem = typeof rewardsMarketplace.$inferSelect;
export type InsertRewardItem = typeof rewardsMarketplace.$inferInsert;

// ─── Reward Redemptions ───────────────────────────────────────────────────────
export const rewardRedemptions = mysqlTable("rewardRedemptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),                               // student who redeemed
  rewardId: int("rewardId").notNull(),
  redeemedAt: timestamp("redeemedAt").defaultNow().notNull(),
  xpSpent: int("xpSpent").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
}, (t) => ({
  userIdx: index("rewardRedemptions_userId_idx").on(t.userId),
}));

export type RewardRedemption = typeof rewardRedemptions.$inferSelect;

// ─── User Avatars ─────────────────────────────────────────────────────────────
export const userAvatars = mysqlTable("userAvatars", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  avatarStyle: varchar("avatarStyle", { length: 64 }).notNull().default("default"),
  accessories: text("accessories"),                              // JSON array of unlocked accessory keys
  backgroundColor: varchar("backgroundColor", { length: 32 }).notNull().default("#4f46e5"),
  petName: varchar("petName", { length: 64 }),
  unlockedItems: text("unlockedItems"),                         // JSON array of all unlocked cosmetic keys
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserAvatar = typeof userAvatars.$inferSelect;
export type InsertUserAvatar = typeof userAvatars.$inferInsert;

// ─── Question Flags ───────────────────────────────────────────────────────────
export const questionFlags = mysqlTable("questionFlags", {
  id: int("id").autoincrement().primaryKey(),
  questionType: mysqlEnum("questionType", ["quiz", "diagnostic"]).notNull(),
  questionId: int("questionId").notNull(),
  userId: int("userId").notNull(),
  reason: mysqlEnum("reason", [
    "incorrect_answer",
    "unclear_question",
    "wrong_difficulty",
    "out_of_scope",
    "duplicate",
    "other",
  ]).notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["open", "reviewed", "resolved", "dismissed"]).notNull().default("open"),
  reviewedBy: int("reviewedBy"),
  reviewNote: text("reviewNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  questionIdx: index("questionFlags_question_idx").on(t.questionType, t.questionId),
  userIdx: index("questionFlags_userId_idx").on(t.userId),
  statusIdx: index("questionFlags_status_idx").on(t.status),
}));
export type QuestionFlag = typeof questionFlags.$inferSelect;
export type InsertQuestionFlag = typeof questionFlags.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1A — Multi-District Data Layer
// All tables below are additive. No existing tables are modified.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Standard Frameworks ─────────────────────────────────────────────────────
export const standardFrameworks = mysqlTable("standardFrameworks", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),   // e.g. "TEKS", "NY_NGLS", "CCSS"
  name: varchar("name", { length: 256 }).notNull(),           // e.g. "Texas Essential Knowledge and Skills"
  stateCode: varchar("stateCode", { length: 8 }),             // e.g. "TX", "NY"
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type StandardFramework = typeof standardFrameworks.$inferSelect;

// ─── Standards ────────────────────────────────────────────────────────────────
export const standards = mysqlTable("standards", {
  id: int("id").autoincrement().primaryKey(),
  frameworkId: int("frameworkId").notNull(),
  code: varchar("code", { length: 64 }).notNull(),            // e.g. "A.5(A)" or "alg1_solving_linear_equations"
  description: text("description").notNull(),
  gradeLevel: varchar("gradeLevel", { length: 16 }),          // e.g. "9", "3", "K"
  subject: varchar("subject", { length: 64 }),                // e.g. "math", "english"
  strand: varchar("strand", { length: 128 }),                 // e.g. "Algebraic Reasoning"
  isCanonical: boolean("isCanonical").notNull().default(true),// false = extracted slug, needs human review
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  frameworkCodeIdx: index("standards_framework_code_idx").on(t.frameworkId, t.code),
  frameworkGradeIdx: index("standards_framework_grade_idx").on(t.frameworkId, t.gradeLevel),
}));
export type Standard = typeof standards.$inferSelect;

// ─── Standard Crosswalk ───────────────────────────────────────────────────────
export const standardCrosswalk = mysqlTable("standardCrosswalk", {
  id: int("id").autoincrement().primaryKey(),
  sourceStandardId: int("sourceStandardId").notNull(),
  targetStandardId: int("targetStandardId").notNull(),
  alignmentType: mysqlEnum("alignmentType", ["exact", "partial", "approximate", "none", "related"]).notNull().default("partial"),
  alignmentWeight: float("alignmentWeight"),                  // 1.0=exact, 0.75=partial, 0.50=approximate, 0.0=none
  alignmentScore: float("alignmentScore"),                    // 0.0–1.0 confidence
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  sourceIdx: index("crosswalk_source_idx").on(t.sourceStandardId),
  targetIdx: index("crosswalk_target_idx").on(t.targetStandardId),
}));
export type StandardCrosswalk = typeof standardCrosswalk.$inferSelect;

// ─── Countries ────────────────────────────────────────────────────────────────
export const countries = mysqlTable("countries", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(),    // e.g. "US"
  name: varchar("name", { length: 128 }).notNull(),
});
export type Country = typeof countries.$inferSelect;

// ─── States / Provinces ───────────────────────────────────────────────────────
export const states = mysqlTable("states", {
  id: int("id").autoincrement().primaryKey(),
  countryId: int("countryId").notNull(),
  code: varchar("code", { length: 8 }).notNull(),             // e.g. "TX", "NY"
  name: varchar("name", { length: 128 }).notNull(),
  defaultFrameworkId: int("defaultFrameworkId"),              // FK → standardFrameworks.id (nullable)
  assessmentRegime: varchar("assessmentRegime", { length: 64 }),// e.g. "staar_eoc", "ny_regents"
}, (t) => ({
  countryStateUnique: uniqueIndex("states_country_code_unique").on(t.countryId, t.code),
}));
export type State = typeof states.$inferSelect;

// ─── Districts ────────────────────────────────────────────────────────────────
export const districts = mysqlTable("districts", {
  id: int("id").autoincrement().primaryKey(),
  stateId: int("stateId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  shortName: varchar("shortName", { length: 64 }),            // e.g. "Katy ISD", "HISD"
  ncescode: varchar("ncescode", { length: 16 }),              // NCES district ID
  defaultFrameworkId: int("defaultFrameworkId"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  stateIdx: index("districts_state_idx").on(t.stateId),
}));
export type District = typeof districts.$inferSelect;

// ─── Schools ──────────────────────────────────────────────────────────────────
export const schools = mysqlTable("schools", {
  id: int("id").autoincrement().primaryKey(),
  districtId: int("districtId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  ncescode: varchar("ncescode", { length: 16 }),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  districtIdx: index("schools_district_idx").on(t.districtId),
}));
export type School = typeof schools.$inferSelect;

// ─── Tracks ───────────────────────────────────────────────────────────────────
export const tracks = mysqlTable("tracks", {
  id: int("id").autoincrement().primaryKey(),
  districtId: int("districtId").notNull(),
  courseId: int("courseId").notNull(),
  code: varchar("code", { length: 32 }).notNull(),            // e.g. "KAP", "ACA", "REGULAR"
  localLabel: varchar("localLabel", { length: 128 }).notNull(),// e.g. "KAP Math", "ACA", "Regular"
  trackType: mysqlEnum("trackType", ["advanced", "regular", "remedial", "honors", "ap"]).notNull().default("regular"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  districtCourseIdx: index("tracks_district_course_idx").on(t.districtId, t.courseId),
}));
export type Track = typeof tracks.$inferSelect;

// ─── Pacing Guides ────────────────────────────────────────────────────────────
export const pacingGuides = mysqlTable("pacingGuides", {
  id: int("id").autoincrement().primaryKey(),
  districtId: int("districtId").notNull(),
  courseId: int("courseId").notNull(),
  trackId: int("trackId"),                                    // NULL = applies to all tracks
  academicYear: varchar("academicYear", { length: 16 }).notNull(),// e.g. "2025-26"
  name: varchar("name", { length: 256 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  districtCourseYearIdx: index("pacing_district_course_year_idx").on(t.districtId, t.courseId, t.academicYear),
}));
export type PacingGuide = typeof pacingGuides.$inferSelect;

// ─── Pacing Windows ───────────────────────────────────────────────────────────
export const pacingWindows = mysqlTable("pacingWindows", {
  id: int("id").autoincrement().primaryKey(),
  pacingGuideId: int("pacingGuideId").notNull(),
  unitId: int("unitId").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  weekNumber: int("weekNumber"),
  notes: text("notes"),
}, (t) => ({
  guideUnitIdx: uniqueIndex("pacing_windows_guide_unit_unique").on(t.pacingGuideId, t.unitId),
  guideDateIdx: index("pacing_windows_guide_date_idx").on(t.pacingGuideId, t.endDate),
}));
export type PacingWindow = typeof pacingWindows.$inferSelect;

// ─── Resource Adoptions ───────────────────────────────────────────────────────
export const resourceAdoptions = mysqlTable("resourceAdoptions", {
  id: int("id").autoincrement().primaryKey(),
  districtId: int("districtId").notNull(),
  courseId: int("courseId").notNull(),
  resourceName: varchar("resourceName", { length: 256 }).notNull(),// e.g. "Algebra Nation", "Big Ideas Math"
  publisher: varchar("publisher", { length: 256 }),
  edition: varchar("edition", { length: 64 }),
  adoptionYear: int("adoptionYear"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  districtCourseIdx: index("resource_adoptions_district_course_idx").on(t.districtId, t.courseId),
}));
export type ResourceAdoption = typeof resourceAdoptions.$inferSelect;

// ─── Learning Objectives ──────────────────────────────────────────────────────
export const learningObjectives = mysqlTable("learningObjectives", {
  id: int("id").autoincrement().primaryKey(),
  standardId: int("standardId").notNull(),
  description: text("description").notNull(),
  masteryThreshold: int("masteryThreshold").notNull().default(75), // CONFIRMED: 75 globally; new objectives authored post-Phase 2 may set this to 80 on a per-objective basis
  bloomsLevel: mysqlEnum("bloomsLevel", ["remember", "understand", "apply", "analyze", "evaluate", "create"]),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  standardIdx: index("objectives_standard_idx").on(t.standardId),
}));
export type LearningObjective = typeof learningObjectives.$inferSelect;

// ─── Objective Prerequisites ──────────────────────────────────────────────────
export const objectivePrerequisites = mysqlTable("objectivePrerequisites", {
  id: int("id").autoincrement().primaryKey(),
  objectiveId: int("objectiveId").notNull(),
  prerequisiteObjectiveId: int("prerequisiteObjectiveId").notNull(),
}, (t) => ({
  objPrereqUnique: uniqueIndex("obj_prereq_unique").on(t.objectiveId, t.prerequisiteObjectiveId),
}));
export type ObjectivePrerequisite = typeof objectivePrerequisites.$inferSelect;

// ─── Assessment Templates ─────────────────────────────────────────────────────
export const assessmentTemplates = mysqlTable("assessmentTemplates", {
  id: int("id").autoincrement().primaryKey(),
  stateId: int("stateId"),                                    // NULL = generic
  courseId: int("courseId").notNull(),
  assessmentRegime: varchar("assessmentRegime", { length: 64 }).notNull(),// e.g. "staar_eoc", "ny_regents"
  name: varchar("name", { length: 256 }).notNull(),
  itemCount: int("itemCount").notNull().default(54),
  timeLimitMinutes: int("timeLimitMinutes"),
  difficultyDistribution: json("difficultyDistribution").$type<Record<string, number>>(),
  // e.g. { "easy": 0.3, "medium": 0.5, "hard": 0.2 }
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  stateRegimeCourseIdx: index("assessment_templates_state_regime_course_idx").on(t.stateId, t.assessmentRegime, t.courseId),
}));
export type AssessmentTemplate = typeof assessmentTemplates.$inferSelect;

// ─── Enrollment Contexts ──────────────────────────────────────────────────────
export const enrollmentContexts = mysqlTable("enrollmentContexts", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  courseId: int("courseId").notNull(),
  districtId: int("districtId"),                              // NULL = homeschool / no district
  stateId: int("stateId"),
  frameworkId: int("frameworkId").notNull(),
  trackId: int("trackId"),                                    // NULL = no specific track
  pacingGuideId: int("pacingGuideId"),                        // NULL = no pacing guide
  academicYear: varchar("academicYear", { length: 16 }).notNull().default("2025-26"),
  gradeLevel: varchar("gradeLevel", { length: 8 }),
  hasIep: boolean("hasIep").notNull().default(false),
  isEl: boolean("isEl").notNull().default(false),             // English Learner
  isGt: boolean("isGt").notNull().default(false),             // Gifted & Talented
  isActive: boolean("isActive").notNull().default(true),
  previousContextId: int("previousContextId"),                // chain for transfer history
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  studentCourseYearUnique: uniqueIndex("enrollment_ctx_student_course_year_unique").on(t.studentId, t.courseId, t.academicYear),
  studentActiveIdx: index("enrollment_ctx_student_active_idx").on(t.studentId, t.isActive),
}));
export type EnrollmentContext = typeof enrollmentContexts.$inferSelect;

// ─── Mastery Records ──────────────────────────────────────────────────────────
export const masteryRecords = mysqlTable("masteryRecords", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  objectiveId: int("objectiveId"),                            // NULL during Phase 1 backfill (standard-level only)
  standardId: int("standardId"),                              // NULL if objective-level only
  frameworkId: int("frameworkId").notNull(),
  enrollmentContextId: int("enrollmentContextId").notNull(),
  score: int("score").notNull().default(0),                   // 0–100
  isMastered: boolean("isMastered").notNull().default(false), // score >= 75 (CONFIRMED threshold; aligned with userMastery.score >= 75)
  attemptCount: int("attemptCount").notNull().default(0),
  lastAssessedAt: timestamp("lastAssessedAt").defaultNow(),
  sourceType: mysqlEnum("sourceType", ["quiz", "diagnostic", "manual", "backfill"]).notNull().default("backfill"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  studentObjUnique: uniqueIndex("mastery_student_obj_unique").on(t.studentId, t.objectiveId, t.enrollmentContextId),
  studentStdIdx: index("mastery_student_std_idx").on(t.studentId, t.standardId),
  studentObjIdx: index("mastery_student_obj_idx").on(t.studentId, t.objectiveId),
}));
export type MasteryRecord = typeof masteryRecords.$inferSelect;

// ─── Unit Standards (join table) ──────────────────────────────────────────────
export const unitStandards = mysqlTable("unitStandards", {
  id: int("id").autoincrement().primaryKey(),
  unitId: int("unitId").notNull(),
  standardId: int("standardId").notNull(),
  isPrimary: boolean("isPrimary").notNull().default(false),   // true = the main standard for this unit
}, (t) => ({
  unitStandardUnique: uniqueIndex("unit_standards_unique").on(t.unitId, t.standardId),
  unitIdx: index("unit_standards_unit_idx").on(t.unitId),
  standardIdx: index("unit_standards_standard_idx").on(t.standardId),
}));
export type UnitStandard = typeof unitStandards.$inferSelect;

// ─── Parental Consents (COPPA) ────────────────────────────────────────────────
export const parentalConsents = mysqlTable("parentalConsents", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  parentEmail: varchar("parentEmail", { length: 320 }).notNull(),
  parentName: varchar("parentName", { length: 256 }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "approved", "denied", "expired"]).notNull().default("pending"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
}, (t) => ({
  studentIdx: index("parental_consents_student_idx").on(t.studentId),
  tokenIdx: index("parental_consents_token_idx").on(t.token),
  statusIdx: index("parental_consents_status_idx").on(t.status),
}));
export type ParentalConsent = typeof parentalConsents.$inferSelect;

// ─── Admin Impersonation Sessions ─────────────────────────────────────────────
export const adminImpersonationSessions = mysqlTable("adminImpersonationSessions", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  impersonatedUserId: int("impersonatedUserId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  endedAt: timestamp("endedAt"),
}, (t) => ({
  adminIdx: index("imp_sessions_admin_idx").on(t.adminId),
  tokenIdx: index("imp_sessions_token_idx").on(t.token),
  expiresIdx: index("imp_sessions_expires_idx").on(t.expiresAt),
}));
export type AdminImpersonationSession = typeof adminImpersonationSessions.$inferSelect;

// ─── Email Settings (Provider Abstraction Layer) ──────────────────────────────
/**
 * Stores the active email provider configuration.
 * Only one row can have isActive = true at a time — enforced at application layer.
 * apiKey is stored encrypted (AES-256-GCM via encryptSecret/decryptSecret helpers).
 */
export const emailSettings = mysqlTable("emailSettings", {
  id: int("id").autoincrement().primaryKey(),
  provider: mysqlEnum("provider", ["resend", "smtp", "sendgrid"]).notNull(),
  fromAddress: varchar("fromAddress", { length: 256 }).notNull(),
  fromName: varchar("fromName", { length: 100 }).notNull(),
  replyTo: varchar("replyTo", { length: 256 }),
  /** Encrypted API key (Resend/SendGrid) or SMTP password */
  apiKey: varchar("apiKey", { length: 1024 }).notNull(),
  smtpHost: varchar("smtpHost", { length: 256 }),
  smtpPort: int("smtpPort"),
  smtpSecure: boolean("smtpSecure"),
  smtpUsername: varchar("smtpUsername", { length: 256 }),
  /** Webhook signing secret for delivery event verification */
  webhookSecret: varchar("webhookSecret", { length: 512 }),
  isActive: boolean("isActive").notNull().default(false),
  lastTestedAt: timestamp("lastTestedAt"),
  lastTestStatus: mysqlEnum("lastTestStatus", ["ok", "failed"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().onUpdateNow(),
  createdBy: int("createdBy").notNull().default(1),
}, (t) => ({
  activeIdx: index("emailSettings_isActive_idx").on(t.isActive),
  providerIdx: index("emailSettings_provider_idx").on(t.provider),
}));
export type EmailSettings = typeof emailSettings.$inferSelect;

// ─── Email Logs Archive (90-day auto-archive) ─────────────────────────────────
/**
 * Rows from emailLogs older than 90 days are moved here (not deleted).
 * Schema mirrors emailLogs exactly.
 */
export const emailLogsArchive = mysqlTable("emailLogsArchive", {
  id: int("id").primaryKey(), // original ID preserved
  toEmail: varchar("toEmail", { length: 512 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  templateName: varchar("templateName", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "skipped", "delivered", "bounced", "complained"]).notNull(),
  messageId: varchar("messageId", { length: 256 }),
  referenceId: varchar("referenceId", { length: 256 }),
  errorMessage: text("errorMessage"),
  deliveryStatus: mysqlEnum("deliveryStatus", ["sent", "delivered", "opened", "bounced", "complained", "failed"]),
  deliveryUpdatedAt: timestamp("deliveryUpdatedAt"),
  provider: varchar("provider", { length: 50 }).default("resend"),
  recipientId: int("recipientId"),
  createdAt: timestamp("createdAt").notNull(),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
}, (t) => ({
  createdAtIdx: index("emailLogsArchive_createdAt_idx").on(t.createdAt),
  statusIdx: index("emailLogsArchive_status_idx").on(t.status),
  toEmailIdx: index("emailLogsArchive_toEmail_idx").on(t.toEmail),
}));
export type EmailLogArchive = typeof emailLogsArchive.$inferSelect;
