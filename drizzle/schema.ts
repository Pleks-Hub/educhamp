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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

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
  courseId: int("courseId").notNull().default(1),
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
});

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
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).notNull().default("pending"),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
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
