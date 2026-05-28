/**
 * Central tooltip content registry.
 * All user-facing tooltip strings live here so they can be updated in one place
 * without hunting through component files.
 *
 * Shape: { title: string; description: string }
 *   - title:       Short label (used when sidebar is collapsed)
 *   - description: One-sentence explanation of what the item does / when to use it
 */

export interface TooltipEntry {
  title: string;
  description: string;
}

// ─── Sidebar Navigation ───────────────────────────────────────────────────────

export const NAV_TOOLTIPS: Record<string, TooltipEntry> = {
  dashboard: {
    title: "Dashboard",
    description: "Your learning home — see today's recommended tasks, recent progress, and quick links to where you left off.",
  },
  courses: {
    title: "Courses",
    description: "Browse and manage your enrolled learning programs. Switch between subjects and explore curriculum content unit by unit.",
  },
  curriculum: {
    title: "Curriculum",
    description: "Browse all 12 units and their lessons. Open any lesson to read explanations, work through examples, and practise problems.",
  },
  diagnostic: {
    title: "Diagnostic Test",
    description: "Take a placement assessment to identify which units you already understand and which need more attention. Retake anytime to track growth.",
  },
  aiTutor: {
    title: "AI Tutor",
    description: "Chat with EduBot, your personal AI tutor. Ask questions, request explanations, practise problems, or get an exam review — in any mode.",
  },
  progress: {
    title: "Progress",
    description: "View your mastery scores, quiz history, and skill-level charts across all units. Track improvement over time.",
  },
  skillIndex: {
    title: "Skill Index",
    description: "Browse every skill in the curriculum by ID (e.g. ALG1-U1-S2). See prerequisites, mastery level, and which unit each skill belongs to.",
  },
  parent: {
    title: "Parent Dashboard",
    description: "Manage enrolled children, view their progress reports, set learning goals, write private notes, and invite co-parents.",
  },
  referrals: {
    title: "Refer & Invite",
    description: "Share your unique referral link to invite friends and family. Track how many people have signed up using your code.",
  },
  billing: {
    title: "Billing",
    description: "Manage your subscription plan, payment methods, invoices, and billing history. Upgrade or cancel at any time.",
  },
  admin: {
    title: "Admin Console",
    description: "Platform administration — manage users, courses, subscriptions, email logs, suppression lists, and platform settings.",
  },
  settings: {
    title: "Settings",
    description: "Update your account preferences, notification settings, security options (2FA), and profile information.",
  },
  logout: {
    title: "Log Out",
    description: "Sign out of your EduChamp account. Your progress is saved automatically.",
  },
};

// ─── Header / Top Bar ─────────────────────────────────────────────────────────

export const HEADER_TOOLTIPS: Record<string, TooltipEntry> = {
  notifications: {
    title: "Notifications",
    description: "View recent activity alerts — quiz completions, mastery milestones, and system messages.",
  },
  themeToggle: {
    title: "Toggle Theme",
    description: "Switch between light and dark mode.",
  },
  userMenu: {
    title: "Account Menu",
    description: "Access your profile, settings, and sign-out options.",
  },
  sidebarToggle: {
    title: "Toggle Sidebar",
    description: "Collapse or expand the navigation sidebar to give yourself more screen space.",
  },
};

// ─── Admin Dashboard Tabs ─────────────────────────────────────────────────────

export const ADMIN_TAB_TOOLTIPS: Record<string, TooltipEntry> = {
  overview: {
    title: "Overview",
    description: "Platform-wide statistics — total users, active sessions, quiz attempts, and enrolled courses at a glance.",
  },
  users: {
    title: "Users",
    description: "Search, view, and manage all registered accounts. Update roles, account types, and course enrolments.",
  },
  subscriptions: {
    title: "Subscriptions",
    description: "View active, trialling, and lapsed subscriptions. See plan details and billing status for each user.",
  },
  emailLogs: {
    title: "Email Logs",
    description: "Audit all outbound emails — sent, failed, and skipped. Filter by delivery status (delivered, opened, bounced) to diagnose deliverability issues.",
  },
  suppression: {
    title: "Suppression Management",
    description: "View and manage blocked email addresses. Unsuppress addresses, manually suppress problematic ones, and export the full list for auditing.",
  },
  courses: {
    title: "Courses",
    description: "Manage available courses — edit titles, descriptions, TEKS alignment, and active status. View enrolled users per course.",
  },
  settings: {
    title: "Platform Settings",
    description: "Configure global platform behaviour — feature flags, default enrolments, and other system-level settings.",
  },
  auditLog: {
    title: "Audit Log",
    description: "Review a chronological record of all admin actions taken on this platform.",
  },
};

// ─── Admin Action Buttons ─────────────────────────────────────────────────────

export const ADMIN_ACTION_TOOLTIPS: Record<string, TooltipEntry> = {
  exportCsv: {
    title: "Export CSV",
    description: "Download the current filtered list as a UTF-8 CSV file for use in spreadsheets or external reporting tools.",
  },
  suppressAddress: {
    title: "Suppress Address",
    description: "Manually block an email address from receiving any further transactional emails from this platform.",
  },
  unsuppress: {
    title: "Unsuppress",
    description: "Re-enable email delivery to this address. Use after confirming the address is valid and the user has consented.",
  },
  refresh: {
    title: "Refresh",
    description: "Reload the latest data from the server.",
  },
  viewAuditHistory: {
    title: "Audit History",
    description: "Show the full history of suppression and unsuppression actions taken on this email address.",
  },
};

// ─── Billing Page ─────────────────────────────────────────────────────────────

export const BILLING_TOOLTIPS: Record<string, TooltipEntry> = {
  upgrade: {
    title: "Upgrade Plan",
    description: "Move to a higher-tier plan to unlock additional features, more courses, or extended access.",
  },
  manageSubscription: {
    title: "Manage Subscription",
    description: "Open the Stripe billing portal to update your payment method, view invoices, change your plan, or cancel.",
  },
  reactivate: {
    title: "Reactivate Plan",
    description: "Restore access to your account by restarting your subscription. You will be charged at the next billing cycle.",
  },
  cancelSubscription: {
    title: "Cancel Subscription",
    description: "Cancel your current plan. You will retain access until the end of the current billing period.",
  },
};

// ─── Curriculum / Courses ─────────────────────────────────────────────────────

export const CURRICULUM_TOOLTIPS: Record<string, TooltipEntry> = {
  masteryBadge: {
    title: "Mastery Level",
    description: "Your current mastery for this unit: Beginner, Developing, Approaching, Mastered, or Advanced. Based on quiz scores and practice performance.",
  },
  progressBar: {
    title: "Completion Progress",
    description: "Percentage of lessons in this unit you have completed at least once.",
  },
  startLesson: {
    title: "Start Lesson",
    description: "Begin this lesson — read the explanation, work through examples, and complete practice problems.",
  },
  continueLesson: {
    title: "Continue Lesson",
    description: "Pick up where you left off in this lesson.",
  },
  takeQuiz: {
    title: "Take Unit Quiz",
    description: "Test your understanding of this unit with 15 adaptive questions. Your mastery score updates automatically after submission.",
  },
  locked: {
    title: "Unit Locked",
    description: "Complete the prerequisite unit and reach at least 60% mastery to unlock this unit.",
  },
};

// ─── AI Tutor ─────────────────────────────────────────────────────────────────

export const TUTOR_TOOLTIPS: Record<string, TooltipEntry> = {
  sendMessage: {
    title: "Send Message",
    description: "Send your message to EduBot. You can also press Enter to send.",
  },
  clearChat: {
    title: "Clear Chat",
    description: "Erase the current conversation and start a fresh session with EduBot.",
  },
  modeTeach: {
    title: "Teach Mode",
    description: "EduBot explains concepts clearly with examples. Best for learning something new or revisiting a topic.",
  },
  modePractice: {
    title: "Practice Mode",
    description: "EduBot generates practice problems at your current mastery level and guides you through solutions.",
  },
  modeQuiz: {
    title: "Quiz Mode",
    description: "EduBot quizzes you with timed questions and gives immediate feedback. Good for self-testing before an exam.",
  },
  modeExamReview: {
    title: "Exam Review Mode",
    description: "EduBot focuses on high-priority topics and common exam question patterns to help you prepare efficiently.",
  },
  modeRemediation: {
    title: "Remediation Mode",
    description: "EduBot identifies and re-teaches skills where your mastery is below threshold, using a different explanation approach.",
  },
  modeParentSummary: {
    title: "Parent Summary Mode",
    description: "EduBot generates a plain-language progress summary for parents — covering mastery scores, strengths, gaps, and recommended next steps.",
  },
};

// ─── Diagnostic Test ─────────────────────────────────────────────────────────

export const DIAGNOSTIC_TOOLTIPS: Record<string, TooltipEntry> = {
  startTest: {
    title: "Start Diagnostic",
    description: "Begin the placement assessment. You will answer questions covering all 12 units. Results are used to personalise your learning path.",
  },
  retakeTest: {
    title: "Retake Diagnostic",
    description: "Take a new version of the diagnostic with a different set of questions to measure your growth since the last attempt.",
  },
  submitAnswer: {
    title: "Submit Answer",
    description: "Lock in your answer and move to the next question. You cannot change your answer after submitting.",
  },
  skipQuestion: {
    title: "Skip Question",
    description: "Move to the next question without answering. Skipped questions are marked as incorrect in your results.",
  },
};
