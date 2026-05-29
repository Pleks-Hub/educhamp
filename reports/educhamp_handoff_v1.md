# EduChamp — Comprehensive Project Handoff Document

**Version:** 1.0  
**Date:** 2026-05-29  
**Checkpoint:** `3c67408c` (Sprint 60 — Comprehensive Gamification Framework)  
**Author:** Manus AI  
**Live Domains:** educhamp.app · educhamp.co · educhamp.manus.space  
**Repository:** Connected via `user_github` remote (branch: `main`)

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [Backend — tRPC Routers & Server Modules](#5-backend--trpc-routers--server-modules)
6. [Frontend — Pages & Routes](#6-frontend--pages--routes)
7. [Feature Catalogue](#7-feature-catalogue)
8. [Gamification Framework](#8-gamification-framework)
9. [Email & Notification System](#9-email--notification-system)
10. [Payment & Subscription System](#10-payment--subscription-system)
11. [Authentication & Security](#11-authentication--security)
12. [Scheduled Jobs & Automation](#12-scheduled-jobs--automation)
13. [Content & Curriculum Structure](#13-content--curriculum-structure)
14. [Early Childhood Learning Layer (Pre-K–Grade 2)](#14-early-childhood-learning-layer-pre-kgrade-2)
15. [Admin Portal](#15-admin-portal)
16. [Parent Portal](#16-parent-portal)
17. [AI Tutor (EduBot)](#17-ai-tutor-edubot)
18. [Testing & Quality Assurance](#18-testing--quality-assurance)
19. [Environment Variables & Secrets](#19-environment-variables--secrets)
20. [Deployment & Infrastructure](#20-deployment--infrastructure)
21. [Known Issues & Limitations](#21-known-issues--limitations)
22. [Pending Work & Recommended Next Steps](#22-pending-work--recommended-next-steps)
23. [Sprint History Summary](#23-sprint-history-summary)

---

## 1. Platform Overview

EduChamp is an AI-powered adaptive learning platform aligned to Katy ISD (Texas) TEKS standards, supporting students from **Pre-K through Grade 12** (including AP courses and SAT/ACT prep). The platform provides personalised learning paths, an AI tutor (EduBot), adaptive quizzes, mastery tracking, gamification, and a parent engagement layer. It is built as a full-stack web application with a React 19 frontend and an Express/tRPC backend, hosted on the Manus platform.

The primary user roles are **Student**, **Parent/Guardian**, **Co-Parent**, and **Admin**. Students progress through curriculum units and lessons, take adaptive quizzes, and earn XP and badges. Parents monitor progress, approve course assignments, and receive weekly digest emails. Admins manage content, users, subscriptions, email campaigns, and the gamification economy.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend framework** | React 19 + Vite | Code-split with `React.lazy` |
| **Styling** | Tailwind CSS 4 + shadcn/ui | OKLCH colour tokens, Radix UI primitives |
| **Animations** | Framer Motion | Used in CelebrationOverlay, page transitions |
| **Routing** | Wouter 3 | Lightweight client-side router |
| **State / data** | TanStack Query + tRPC 11 | End-to-end type safety, Superjson serialisation |
| **Backend** | Express 4 + tRPC | Single Node.js process |
| **Database** | TiDB Cloud (MySQL-compatible) | Drizzle ORM, 30 migrations applied |
| **Auth** | Manus OAuth 2.0 + JWT cookies | `protectedProcedure` / `adminProcedure` guards |
| **Payments** | Stripe (Checkout + Webhooks) | Sandbox provisioned; live keys via Settings → Payment |
| **Email** | Resend | Bounce/complaint suppression via webhook |
| **File storage** | Manus S3 proxy (`/manus-storage/`) | `storagePut` / `storageGet` helpers |
| **AI / LLM** | Manus Forge API (`invokeLLM`) | Streaming via `tutorStream.ts` |
| **Math rendering** | KaTeX (lazy-loaded) | Prevents bundle bloat |
| **Charts** | Recharts | Admin analytics, progress dashboards |
| **PWA** | Vite PWA plugin + Workbox | Offline shell, installable |
| **Testing** | Vitest | 14 test files, 299 tests |
| **CI / Deploy** | Manus WebDev platform | Publish button → Cloud Run |

---

## 3. Architecture

The application runs as a **single Node.js process** on Cloud Run (1 vCPU, 512 MiB RAM, 180 s request timeout, min-instances = 0). Vite serves the React SPA in development; in production the Express server serves the built static assets and handles all `/api/*` traffic.

```
Browser
  │
  ├── /                  → React SPA (Vite build)
  ├── /api/trpc/*        → tRPC router (Express middleware)
  ├── /api/oauth/*       → Manus OAuth callback
  ├── /api/stripe/webhook → Stripe webhook (raw body)
  ├── /api/resend/webhook → Resend bounce/complaint webhook
  ├── /api/scheduled/*   → Manus Heartbeat cron endpoints
  └── /manus-storage/*   → S3 proxy (signed redirects)
```

**Key architectural decisions:**

The `server/_core/` directory contains all framework plumbing (OAuth, context, tRPC setup, LLM helpers, storage, voice transcription, image generation) and should not be modified except to extend infrastructure. All business logic lives in `server/routers/`, `server/gamification/`, `server/scheduled/`, and `server/emailTemplates/`. The frontend calls the backend exclusively through tRPC hooks — no raw `fetch` or Axios calls exist in application code.

---

## 4. Database Schema

The database contains **63 tables** across 30 applied migrations. The schema file is at `drizzle/schema.ts`. All timestamps are stored as UTC-based Unix milliseconds.

### Core User Tables

| Table | Purpose |
|---|---|
| `users` | Primary user record: id, email, name, role (user/admin), accountType (student/parent/school), subscriptionStatus, trialEndsAt |
| `userProfiles` | Extended profile: grade, school, parentLedMode, disableAnimations, disableSound, youngLearnerMode, onboardingComplete |
| `twoFactorAuth` | TOTP secret, backup codes, enabled flag |
| `passwordResetTokens` | Secure reset tokens with expiry |

### Curriculum Tables

| Table | Purpose |
|---|---|
| `courses` | Course records: title, subject, gradeLevel, description, isActive |
| `units` | Units within a course: title, unitNumber, overview, xpReward |
| `lessons` | Individual lessons: title, content (rich text), lessonType, order |
| `skills` | Skill/standard records linked to lessons |
| `quizQuestions` | Question bank: questionText, options (JSON), correctAnswer, explanation, difficulty |
| `diagnosticQuestions` | Placement diagnostic questions per course/grade |

### Progress & Mastery Tables

| Table | Purpose |
|---|---|
| `userCourseEnrollments` | Active course enrolments per student |
| `unitProgress` | Per-unit completion status and score |
| `lessonProgress` | Per-lesson completion with timestamp |
| `quizAttempts` | Quiz attempt records: score, passed, answers (JSON) |
| `userMastery` | Skill mastery scores (0–100) per student |
| `diagnosticAttempts` | Placement diagnostic results |
| `tutorSessions` | EduBot chat session metadata |
| `chatMessages` | Individual tutor chat messages |

### Parent & Family Tables

| Table | Purpose |
|---|---|
| `parentChildren` | Parent–student links |
| `parentInviteTokens` | Tokens for student-to-parent invitation emails |
| `studentInviteTokens` | Tokens for parent-to-student invitation emails |
| `coParentInvitations` | Co-parent invitation records |
| `coParentAccess` | Active co-parent access grants |
| `parentGoals` | Parent-set learning goals for children |
| `parentNotes` | Parent notes attached to children |
| `enrolmentInvitations` | School/ISD bulk enrolment invitations |

### Payment & Subscription Tables

| Table | Purpose |
|---|---|
| `subscriptions` | Active subscription: planKey, billingPeriod, stripeCustomerId, stripeSubscriptionId, status |
| `coupons` | Discount codes: discountType, discountValue, maxUses, expiresAt |
| `couponRedemptions` | Coupon usage audit |
| `paymentAuditLog` | Stripe event log |
| `courseRequests` | Student course-request workflow records |

### Email & Notification Tables

| Table | Purpose |
|---|---|
| `emailLogs` | All outbound emails: to, subject, templateName, deliveryStatus |
| `emailSuppression` | Bounce/complaint suppression list |
| `suppressionAuditLog` | Manual suppression/unsuppression audit |
| `userNotifications` | In-app notification records |
| `inactivityNotifications` | Inactivity monitor send records |
| `newsletterSubscriptions` | Newsletter opt-in list |
| `newsletterCampaigns` | Campaign records with AI-drafted content |

### Admin & CMS Tables

| Table | Purpose |
|---|---|
| `cmsContent` | CMS blocks: key, content (JSON), version |
| `cmsContentHistory` | CMS version history |
| `adminRoles` | Custom admin role definitions |
| `adminRoleAssignments` | User–role assignments |
| `rolePermissions` | Permission grants per role |
| `adminAuditLog` | Admin action audit trail |
| `platformSettings` | Key-value store for platform configuration |
| `demoRequests` | Demo request form submissions |

### Referral Tables

| Table | Purpose |
|---|---|
| `referrals` | Referral link records per user |
| `referralSignups` | Signups attributed to a referral |

### Gamification Tables (Sprint 60)

| Table | Purpose |
|---|---|
| `xpLedger` | Immutable XP award log: userId, amount, source, sourceId, description |
| `studentLevels` | Cached level state: totalXp, currentLevel, currentLevelName |
| `badges` | Badge definitions: key, name, category, iconEmoji, xpReward |
| `userBadges` | Earned badge records with earnedAt and seenAt |
| `quests` | Quest templates: questType (daily/weekly/monthly), requirementType, xpReward |
| `userQuests` | Assigned quest instances with progress and completedAt |
| `streaks` | Streak state: currentStreak, longestStreak, lastActivityDate, streakFreezeCount |
| `houses` | House definitions: name, color, mascotEmoji, totalPoints |
| `userHouses` | House membership with pointsContributed |
| `seasonalChallenges` | Seasonal challenge definitions with startDate/endDate |
| `userSeasonalProgress` | Per-user seasonal challenge progress |
| `rewardsMarketplace` | Parent-created real-world reward goals |
| `rewardRedemptions` | Student redemption requests with approval status |
| `userAvatars` | Student avatar customisation (style, accessories JSON, petName) |

---

## 5. Backend — tRPC Routers & Server Modules

All procedures are defined in `server/routers.ts` (inline routers) and `server/routers/` (sub-router files). The `appRouter` merges all routers and is the single source of truth for the API contract.

### Inline Routers in `server/routers.ts`

| Router namespace | Key procedures |
|---|---|
| `auth` | `me`, `logout` |
| `curriculum` | `getCourses`, `getUnits`, `getLessons`, `getLesson`, `getQuizQuestions`, `getSkills` |
| `progress` | `getDashboard`, `markLessonComplete`, `getUnitProgress`, `getLessonProgress` |
| `quiz` | `submitQuiz`, `getQuizHistory`, `getQuizAttempt` |
| `diagnostic` | `getQuestions`, `submitDiagnostic`, `getDiagnosticHistory`, `getEarlyDiagnosticQuestions`, `submitEarlyDiagnostic` |
| `tutor` | `streamMessage` (SSE), `getHistory`, `clearHistory`, `getSessions` |
| `courses` | `requestCourse`, `getCourseRequests`, `approveCourseRequest`, `denyCourseRequest` |
| `student` | `getProfile`, `updateProfile`, `switchCourse`, `getEnrollments` |
| `notifications` | `getAll`, `markRead`, `markAllRead` |

### Sub-Routers in `server/routers/`

| File | Router namespace | Key procedures |
|---|---|---|
| `parent.ts` | `parent`, `courseRequestToken` | `getChildren`, `getChildProgress`, `inviteChild`, `approveRequest`, `denyRequest`, `getGoals`, `setGoal`, `addNote` |
| `coParent.ts` | `coParent` | `invite`, `acceptInvite`, `getCoParents`, `revokeAccess` |
| `authEnhancements.ts` | `authEnhancements` | `setup2FA`, `verify2FA`, `disable2FA`, `forgotPassword`, `resetPassword`, `changePassword` |
| `parentTools.ts` | `parentTools` | `getChildActivityFeed`, `getChildMasteryMap`, `exportProgressReport` |
| `referral.ts` | `referral` | `getReferralLink`, `getReferralStats`, `getLeaderboard` |
| `onboarding.ts` | `onboarding` | `completeStudentOnboarding`, `completeParentOnboarding`, `getPersonalization`, `savePersonalization` |
| `landing.ts` | `landing` | `submitDemoRequest`, `chatWithBot`, `subscribeNewsletter` |
| `admin.ts` | `admin` | `getStats`, `getUsers`, `updateUserRole`, `getCmsContent`, `updateCmsContent`, `getEmailLogs`, `getSuppressionList`, `unsuppressEmail`, `getCoupons`, `createCoupon`, `deactivateCoupon`, `scheduleGradePromotion`, `scheduleWeeklyParentDigest`, `seedGamification`, `getGamificationStats` |
| `newsletter.ts` | `newsletter` | `getCampaigns`, `createCampaign`, `draftWithAI`, `sendCampaign` |
| `payment.ts` | `payment` | `createCheckoutSession`, `getSubscription`, `cancelSubscription`, `changePlan`, `getBillingHistory` |
| `gamification.ts` | `gamification` | `getProfile`, `getLeaderboard`, `getQuests`, `getBadges`, `getStreak`, `useStreakFreeze`, `getHouseLeaderboard`, `redeemReward`, `getChildGamificationSummary` |

### Server Modules

| File | Purpose |
|---|---|
| `server/educhamp-helpers.ts` | `buildTutorSystemPrompt`, grade-to-number mapping, GRADE_PROGRESSION, curriculum helpers |
| `server/tutorStream.ts` | SSE streaming for EduBot, gamification context injection |
| `server/emailService.ts` | `sendEmail` wrapper with suppression guard, `SendEmailOptions` interface |
| `server/gamification/xp.ts` | `awardXp`, `XP_AMOUNTS`, `DAILY_CAPS`, `getStudentXpSummary` |
| `server/gamification/levels.ts` | `LEVEL_THRESHOLDS` (50 levels), `getLevelName`, `getLevelProgress` |
| `server/gamification/badges.ts` | `DEFAULT_BADGES` (37 badges), `checkAndAwardBadges`, `getBadgesForUser` |
| `server/gamification/streaks.ts` | `recordActivity`, `getStreak`, `addStreakFreeze`, `computeStreakStatus` |
| `server/gamification/quests.ts` | `DEFAULT_QUESTS`, `assignDailyQuests`, `updateQuestProgress`, `getQuestsForUser` |
| `server/gamification/houses.ts` | `DEFAULT_HOUSES` (4 houses), `assignHouse`, `awardHousePoints`, `getHouseLeaderboard` |
| `server/stripeWebhook.ts` | Stripe webhook handler: `checkout.session.completed`, `invoice.paid`, `customer.subscription.*` |
| `server/resendWebhook.ts` | Resend webhook handler: bounce/complaint → suppression list |
| `server/storage.ts` | `storagePut`, `storageGet` S3 helpers |
| `server/stripe.ts` | Stripe client, `PLANS` map, `calculateDiscount`, coupon validation |

---

## 6. Frontend — Pages & Routes

All pages are lazy-loaded via `React.lazy`. The app uses a `DashboardLayout` sidebar for authenticated student/parent views and a custom top-nav for public-facing pages.

| Route | Component | Access |
|---|---|---|
| `/` | `Home.tsx` | Authenticated (redirects to `/landing` if not logged in) |
| `/landing` | `LandingPage.tsx` | Public |
| `/courses` | `CourseCatalog.tsx` | Public |
| `/curriculum` | `Curriculum.tsx` | Authenticated |
| `/curriculum/unit/:n` | `UnitDetail.tsx` | Authenticated |
| `/curriculum/unit/:n/lesson/:id` | `LessonDetail.tsx` | Authenticated |
| `/curriculum/unit/:n/quiz` | `Quiz.tsx` | Authenticated |
| `/tutor` | `Tutor.tsx` | Authenticated |
| `/diagnostic` | `Diagnostic.tsx` | Authenticated |
| `/diagnostic/early` | `EarlyDiagnostic.tsx` | Authenticated (Pre-K–Grade 2 auto-redirect) |
| `/progress` | `Progress.tsx` | Authenticated |
| `/skills` | `Skills.tsx` | Authenticated |
| `/parent` | `ParentDashboard.tsx` | Authenticated (parent role) |
| `/profile` | `Profile.tsx` | Authenticated |
| `/referrals` | `Referrals.tsx` | Authenticated |
| `/billing` | `Billing.tsx` | Authenticated |
| `/gamification` | `GamificationHub.tsx` | Authenticated |
| `/adventure-map` | `AdventureMap.tsx` | Authenticated |
| `/course-welcome` | `CourseWelcome.tsx` | Authenticated |
| `/onboarding/student` | `StudentOnboarding.tsx` | Authenticated |
| `/onboarding/parent` | `ParentOnboarding.tsx` | Authenticated |
| `/accept-invite` | `AcceptInvite.tsx` | Public (token-gated) |
| `/join` | `JoinPage.tsx` | Public |
| `/forgot-password` | `ForgotPassword.tsx` | Public |
| `/reset-password` | `ResetPassword.tsx` | Public (token-gated) |
| `/verify-2fa` | `Verify2FA.tsx` | Public (post-login) |
| `/checkout/success` | `CheckoutSuccess.tsx` | Authenticated |
| `/course-request/result` | `CourseRequestResult.tsx` | Authenticated |
| `/admin` | `AdminDashboard.tsx` | Admin role |
| `/admin/newsletter` | `NewsletterConsole.tsx` | Admin role |
| `/admin/chat` | `ChatManagement.tsx` | Admin role |

### Key Reusable Components

| Component | Purpose |
|---|---|
| `DashboardLayout.tsx` | Sidebar nav, user avatar, XP progress bar, mobile drawer |
| `XpProgressBar.tsx` | Persistent XP/level display in sidebar |
| `AIChatBox.tsx` | Full-featured chat UI with streaming and markdown rendering |
| `CelebrationOverlay.tsx` | Confetti/star/badge-pop animations; `useCelebration()` hook |
| `YoungLearnerRewards.tsx` | Star/sticker/treasure chest reward UI for Pre-K–Grade 2 |
| `ReadAloudButton.tsx` | Web Speech API narration with word highlighting |
| `CourseSwitcher.tsx` | Inline course switcher with grade-ordered labels |
| `EduChampDemoWidget.tsx` | Public landing page interactive demo widget |
| `RequestDemoModal.tsx` | Demo request form modal |

---

## 7. Feature Catalogue

### Curriculum & Learning

EduChamp offers **70+ courses** spanning Pre-K through Grade 12, including AP courses (AP Calculus, AP Chemistry, AP Biology, AP US History, AP English) and SAT/ACT Exam Prep. Each course contains multiple units, and each unit contains lessons and a quiz. Lessons support rich text content with embedded KaTeX math rendering. The curriculum is aligned to Katy ISD TEKS standards.

Grade coverage includes dedicated Math, ELA, Science, and Social Studies courses for every grade from Pre-K through Grade 8, with subject-specialised courses for Grades 9–12. The course catalogue at `/courses` displays courses filtered by grade level (Pre-K through Grade 12 in academic order) with no secondary subject filter.

### Adaptive Placement Diagnostic

The placement diagnostic at `/diagnostic` assesses a student's current knowledge level and recommends an appropriate starting point within their enrolled course. For Pre-K through Grade 2 students, the Early Diagnostic at `/diagnostic/early` provides a visual, touch-friendly assessment with picture-tap questions, counting exercises, and shape matching, narrated via Web Speech API. Students in early grades are automatically redirected to the Early Diagnostic.

### AI Tutor (EduBot)

EduBot is a subject-aware AI tutor powered by the Manus Forge LLM API. It streams responses via SSE and renders markdown with the `streamdown` library. The system prompt is dynamically built from the student's enrolled course, current unit, grade level, mastery data, and gamification context (level, XP, streak, recent badge). For Pre-K–Grade 2 students, EduBot automatically adopts a child-safe persona with short sentences, emoji-rich responses, and age-appropriate vocabulary. For older students, it provides step-by-step explanations, hints, and exam preparation guidance.

### Quiz Engine

The quiz engine at `/curriculum/unit/:n/quiz` presents adaptive questions from the question bank, records attempts with full answer JSON, calculates scores, and awards XP on pass (≥75%) and perfect score (100%). The `CelebrationOverlay` fires on quiz completion. The `ReadAloudButton` narrates question text for young learners.

### Progress & Mastery Tracking

The Progress page (`/progress`) displays lesson completion counts, quiz scores, and skill mastery levels. Mastery is tracked per skill with a score from 0–100, with named tiers: Beginner → Explorer → Skilled → Proficient → Master → Grand Master. The Adventure Map (`/adventure-map`) provides a visual path view of unit progression.

### Course Request & Approval Workflow

Students can request additional courses through the course catalogue. Requests are routed to the linked parent for approval. Parents receive an email notification and can approve or deny from the Parent Dashboard. Approved requests automatically enrol the student. The admin can also approve/deny requests from the Admin Console.

---

## 8. Gamification Framework

The gamification system was introduced in Sprint 60 and is built across 14 database tables, 6 server modules, and 1 tRPC router.

### XP Economy

Students earn XP for the following events:

| Event | XP Award | Daily Cap |
|---|---|---|
| Lesson complete | 25 XP | 5 per day |
| Quiz pass (≥75%) | 75 XP | 3 per day |
| Quiz perfect (100%) | 150 XP | 1 per day |
| Mastery achieved | 200 XP | 20 per day (one per skill) |
| Grand Master mastery | 500 XP | 20 per day |
| Diagnostic complete | 50 XP | Uncapped |
| Diagnostic improved | 100 XP | Uncapped |
| Streak bonus | 10 × min(streak, 10) XP | Per-day |

Anti-farming guards enforce daily caps per source type. An additional duplicate guard prevents awarding XP for the same `sourceId` twice within a 24-hour window.

### Level System

There are 50 levels with named tiers. Level 1 starts at 0 XP; Level 2 requires 200 XP; thresholds increase progressively. Level names progress through tiers such as Rookie Learner, Curious Starter, Eager Learner, and so on up to Grand Master Scholar at Level 50.

### Badge System

37 default badges are defined across categories including First Steps, Learning Milestones, Quiz Mastery, Streak Achievements, Subject Mastery, and Special Events. Badges are automatically checked and awarded after every lesson completion and quiz submission via `checkAndAwardBadges`.

### Quest System

Quests are assigned daily and refreshed automatically. The system includes daily quests (e.g., "Complete 1 lesson", "Pass 1 quiz"), weekly quests (e.g., "Complete 10 lessons this week", "Maintain a 5-day streak"), and monthly quests (e.g., "Complete 40 lessons this month"). Quest progress is updated in real time as students complete activities.

### Streak System

Daily learning streaks are tracked via the `streaks` table. Students can use streak freezes (earned via quests or purchased) to protect streaks when they miss a day. The `recordActivity` function is called on every lesson completion and quiz submission.

### House System

Four houses are defined: **Titans** (⚡ red), **Eagles** (🦅 blue), **Lions** (🦁 amber), and **Falcons** (🦆 green). Students are assigned to a house on first login. House points are awarded alongside XP. A house leaderboard is visible in the Gamification Hub.

### Gamification Hub UI

The Gamification Hub at `/gamification` displays:
- XP hero card with level name, total XP, and progress to next level
- Daily/weekly/monthly quest panel with progress bars
- Badge collection grid with earned/locked states and category tabs
- Streak counter with freeze button
- House affiliation card with leaderboard

The `XpProgressBar` component in the sidebar shows the student's current level and XP progress on every page.

### Young Learner Rewards

For Pre-K–Grade 2 students, the `YoungLearnerRewards` component presents rewards as stars ⭐, stickers 🏅, and treasure chests 🎁 instead of raw XP numbers, providing an age-appropriate reward experience.

---

## 9. Email & Notification System

All outbound email is sent via **Resend**. The `sendEmail` function in `server/emailService.ts` checks the suppression list before sending and logs every attempt to `emailLogs`.

### Email Templates

| Template file | Trigger | Description |
|---|---|---|
| `trialWelcome.ts` | New trial signup | Welcome email with onboarding CTA |
| `trialReminder.ts` | 3 days before trial expiry | Reminder to upgrade |
| `trialExpiry.ts` | Trial expired | Upgrade prompt |
| `parentInvite.ts` | Student sends parent invite | Invitation with accept link |
| `passwordReset.ts` | Forgot password request | Secure reset link |
| `courseRequestNotification.ts` | Student requests a course | Notification to parent and admin |
| `inactivityNotification.ts` | 7-day inactivity | Re-engagement email to student/parent |
| `weeklyParentDigest.ts` | Weekly cron (Monday 08:00 UTC) | Per-child progress summary for Pre-K–Grade 2 parents |

### Bounce & Complaint Suppression

The Resend webhook at `/api/resend/webhook` processes `email.bounced` and `email.complained` events, adding the email address to the `emailSuppression` table. All subsequent `sendEmail` calls silently skip suppressed addresses. Admins can view and manually unsuppress addresses from the Admin Console → Email Logs tab.

### In-App Notifications

The `userNotifications` table stores in-app notifications. The `notifications.getAll` procedure returns unread notifications, and `notifications.markAllRead` clears the badge count.

---

## 10. Payment & Subscription System

Payments are processed via **Stripe Checkout**. The platform is in sandbox mode; live keys must be entered via Settings → Payment after Stripe KYC verification.

### Subscription Plans

| Plan | Monthly | Annual | Students | Features |
|---|---|---|---|---|
| **Family Plan** | $19.99/mo | $15.99/mo (billed annually) | 1 | All 70+ courses, AI Tutor, Parent Dashboard |
| **Premium Family Plan** | $29.99/mo | $23.99/mo (billed annually) | Up to 3 | All Family features + AP/STAAR/SAT-ACT prep, Co-parent access, Advanced analytics |

### Stripe Integration

The `payment.createCheckoutSession` procedure creates a Stripe Checkout session with `client_reference_id` and `metadata` (userId, email, name) for webhook correlation. The Stripe webhook handler at `/api/stripe/webhook` processes `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, and `customer.subscription.deleted` events. Subscription status is stored in the `subscriptions` table (Stripe IDs only — no redundant data).

### Coupon System

Admins can create percentage or fixed-amount discount coupons with optional max-use limits and expiry dates. Students enter coupon codes at checkout. The `calculateDiscount` function in `server/stripe.ts` validates and applies discounts.

### Billing Portal

Students can view their subscription status, billing history, and change plans from `/billing`. The `payment.changePlan` procedure handles plan upgrades and downgrades via Stripe subscription updates.

---

## 11. Authentication & Security

### Manus OAuth

Authentication is handled by Manus OAuth 2.0. The callback at `/api/oauth/callback` exchanges the code for a user record and sets a signed JWT session cookie. The `protectedProcedure` tRPC middleware injects `ctx.user` on every authenticated request.

### Two-Factor Authentication

TOTP-based 2FA is available via `authEnhancements.setup2FA` (returns QR code), `authEnhancements.verify2FA`, and `authEnhancements.disable2FA`. Backup codes are generated at setup. The `/verify-2fa` page handles the post-login 2FA challenge.

### Password Management

The `authEnhancements.forgotPassword` procedure generates a secure reset token (stored in `passwordResetTokens`) and sends a reset email. The `authEnhancements.resetPassword` procedure validates the token and updates the password hash.

### Rate Limiting

Express `express-rate-limit` is applied to all `/api/trpc` routes. The Helmet middleware sets security headers including CSP, HSTS, and X-Frame-Options.

### Role-Based Access Control

The `users.role` field distinguishes `user` and `admin`. The `adminProcedure` middleware in `server/_core/trpc.ts` enforces admin-only access. The `adminRoles`, `adminRoleAssignments`, and `rolePermissions` tables support fine-grained custom role definitions managed from the Admin Console.

---

## 12. Scheduled Jobs & Automation

Scheduled jobs run via the **Manus Heartbeat** system. Each job is a POST endpoint registered at `/api/scheduled/:jobName`. The heartbeat cron triggers the endpoint on the configured schedule.

| Job | Endpoint | Schedule | Purpose |
|---|---|---|---|
| Inactivity Monitor | `/api/scheduled/inactivity-monitor` | Daily | Sends re-engagement emails to students inactive for 7+ days |
| Invite Expiry | `/api/scheduled/invite-expiry` | Daily | Marks expired parent/student invite tokens as expired |
| Weekly Parent Digest | `/api/scheduled/weekly-parent-digest` | Monday 08:00 UTC | Sends weekly progress digest to parents of Pre-K–Grade 2 children |

To register the weekly digest cron after deployment, call `admin.scheduleWeeklyParentDigest` from the Admin Console. The heartbeat task UID is stored in `platformSettings` to prevent duplicate registration.

---

## 13. Content & Curriculum Structure

### Grade Coverage

EduChamp covers **Pre-K through Grade 12** with 70+ courses. Each grade from Pre-K through Grade 8 has dedicated Math, ELA, Science, and Social Studies courses. Grades 9–12 have subject-specialised courses (Algebra I/II, Geometry, Pre-Calculus, AP Calculus, Biology, Chemistry, AP Chemistry, AP Biology, English I–IV, AP English, US History, AP US History, World History, and more). SAT/ACT Prep and STAAR Exam Prep are available as standalone courses.

### Curriculum Alignment

All content is aligned to **Katy ISD TEKS** (Texas Essential Knowledge and Skills) standards. The `skills` table stores individual TEKS standards linked to lessons. The `userMastery` table tracks per-skill mastery scores.

### Diagnostic Question Banks

Each course has a diagnostic question bank in `diagnosticQuestions`. The Early Diagnostic has a separate bank of visual/interactive questions for Pre-K–Grade 2. Question banks are seeded via admin SQL or the Admin Console.

### Quiz Question Banks

The `quizQuestions` table stores multiple-choice questions with four options, a correct answer index, an explanation, and a difficulty level (1–5). Questions are linked to units and skills.

---

## 14. Early Childhood Learning Layer (Pre-K–Grade 2)

Sprint 56 and 57 introduced a dedicated early childhood learning experience. The system automatically detects young learners (grade ≤ 2) and activates the following behaviours:

**EduBot Young Learner Mode:** EduBot adopts a child-safe persona with short sentences (≤15 words), emoji-rich responses, simple vocabulary, and encouraging tone. It avoids complex mathematical notation and uses concrete examples.

**Early Diagnostic:** The `/diagnostic/early` page provides a visual, touch-friendly placement assessment with picture-tap questions, counting exercises, and shape matching. All instructions are narrated via the Web Speech API.

**Read-Aloud:** The `ReadAloudButton` component (Sprint 57) uses the Web Speech API to narrate lesson text, quiz questions, and instructions. It supports play/pause/replay, speed control (0.5×–2×), and real-time word highlighting. A fallback message is shown when the browser does not support speech synthesis.

**Parent-Led Mode:** A toggle in Profile → Accessibility enables Parent-Led Mode, which activates the Read-Aloud button on all content pages and adjusts pacing for parent-assisted learning sessions.

**Young Learner Rewards:** The `YoungLearnerRewards` component presents rewards as stars, stickers, and treasure chests instead of XP numbers.

**Celebration Animations:** The `CelebrationOverlay` component (Sprint 58) fires confetti bursts, star explosions, and badge-pop animations on lesson completion, quiz pass, and perfect scores. Parents can disable animations and sound from Profile → Accessibility (`disableAnimations` and `disableSound` flags in `userProfiles`).

---

## 15. Admin Portal

The Admin Dashboard at `/admin` is accessible only to users with `role = 'admin'`. It contains the following tabs:

| Tab | Features |
|---|---|
| **Overview** | Platform stats: total users, active subscriptions, revenue, course completions |
| **Users** | User list with search, role management, subscription status, impersonation |
| **Courses** | Course request management: approve/deny student course requests |
| **Analytics** | Funnel analytics, cohort retention, revenue charts |
| **Email Logs** | Outbound email log with delivery status, suppression management, unsuppress modal |
| **Coupons** | Create/deactivate discount coupons, view redemption history |
| **CMS** | Edit landing page hero, features, FAQ, and other CMS blocks |
| **Inactivity** | Configure and trigger inactivity monitor, view notification history |
| **Gamification** | XP economy stats, badge distribution, house standings, top earners, quest completion rates |

The Newsletter Console at `/admin/newsletter` allows admins to create, AI-draft, and send email campaigns to the newsletter subscriber list. The Chat Management page at `/admin/chat` provides visibility into EduBot chat sessions.

---

## 16. Parent Portal

The Parent Dashboard at `/parent` is the primary interface for parents and co-parents. It contains per-child tabs with the following sections:

| Tab | Content |
|---|---|
| **Overview** | Child's current course, recent activity, lesson/quiz counts |
| **Progress** | Unit-by-unit progress, mastery scores, skill map |
| **Quizzes** | Quiz attempt history with scores and dates |
| **Goals** | Parent-set learning goals with progress tracking |
| **Notes** | Parent notes attached to the child's profile |
| **Achievements** | Child's XP, level, streak, badges, quests, and house (Sprint 60) |
| **Report** | Exportable progress report |

Parents can invite additional children via email or invite token, invite co-parents, approve/deny course requests, and configure reward goals in the Rewards Marketplace.

---

## 17. AI Tutor (EduBot)

EduBot is the primary AI tutor, accessible at `/tutor`. It is powered by the Manus Forge LLM API with streaming SSE responses.

### System Prompt Construction

The system prompt is built dynamically in `server/educhamp-helpers.ts` (`buildTutorSystemPrompt`) and enriched in `server/tutorStream.ts` with:

- Student name, grade, enrolled course, current unit
- Recent mastery scores and skill gaps
- Gamification context: current level, total XP, streak, most recently earned badge
- Young Learner Mode flag (activates child-safe persona)
- Parent-Led Mode flag (adjusts pacing and vocabulary)
- Motivational coaching layer: references XP to next level, badge progress, and streak status

### Chat History

Chat messages are stored in `chatMessages` linked to `tutorSessions`. The `tutor.getHistory` procedure returns the last 50 messages for context. Sessions are scoped per course.

### Streaming

The `tutor.streamMessage` procedure returns an SSE stream. The `AIChatBox` component handles the stream with the `streamdown` library for markdown rendering.

---

## 18. Testing & Quality Assurance

The test suite uses **Vitest** and contains **14 test files** with **299 tests** (as of Sprint 60 checkpoint). All tests pass with 0 TypeScript errors.

| Test file | Coverage area |
|---|---|
| `auth.logout.test.ts` | Auth logout procedure |
| `educhamp.test.ts` | Core curriculum, progress, quiz, diagnostic procedures (25 tests) |
| `emailService.test.ts` | Email sending, suppression guard, template rendering |
| `authEnhancements.test.ts` | 2FA setup/verify, password reset |
| `parent.test.ts` | Parent–child linking, course approval workflow |
| `payment.test.ts` | Stripe checkout session creation, coupon validation |
| `demoRequest.test.ts` | Demo request form submission |
| `stripeWebhook.test.ts` | Stripe webhook event handling |
| `sprint39.test.ts` | Course request workflow enhancements |
| `sprint40.test.ts` | Admin console, inactivity monitoring |
| `sprint41.test.ts` | Cross-browser compatibility, performance |
| `sprint42.test.ts` | Re-engagement, bulk actions, PWA |
| `sprint58.test.ts` | ReadAloud, CelebrationOverlay, Profile settings, weekly digest |
| `sprint60.test.ts` | XP engine, badge award logic, streak tracking, quest completion (36 tests) |

---

## 19. Environment Variables & Secrets

All secrets are injected by the Manus platform and must not be committed to the repository. They are managed via Settings → Secrets in the Management UI or via `webdev_request_secrets`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | TiDB Cloud MySQL connection string |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL (frontend) |
| `BUILT_IN_FORGE_API_URL` | Manus Forge API base URL (server) |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge API bearer token (server) |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus Forge API bearer token (frontend) |
| `VITE_FRONTEND_FORGE_API_URL` | Manus Forge API URL (frontend) |
| `RESEND_API_KEY` | Resend email API key |
| `STRIPE_SECRET_KEY` | Stripe secret key (sandbox) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (sandbox) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `OWNER_OPEN_ID` | Platform owner's Manus Open ID |
| `OWNER_NAME` | Platform owner's display name |
| `VITE_APP_TITLE` | App title displayed in browser tab |
| `VITE_APP_LOGO` | App logo URL |
| `VITE_GTM_ID` | Google Tag Manager container ID |
| `VITE_ANALYTICS_ENDPOINT` | Analytics endpoint URL |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID |

---

## 20. Deployment & Infrastructure

The platform is deployed on the **Manus WebDev** hosting platform. Deployment is triggered by clicking the **Publish** button in the Management UI after creating a checkpoint.

**Live domains:**
- `educhamp.app` (primary)
- `www.educhamp.app`
- `educhamp.co`
- `www.educhamp.co`
- `educhamp.manus.space` (Manus subdomain)
- `educhamp-ai-bggbz5qk.manus.space` (internal)

**Runtime constraints:** Single Node.js process, Cloud Run, 1 vCPU, 512 MiB RAM, 180 s request timeout, cold starts possible (min-instances = 0). No Python, Go, or native binaries beyond npm packages.

**Database:** TiDB Cloud (MySQL-compatible), hosted on AWS us-east-1. Connection via `DATABASE_URL` environment variable. All schema changes must be applied via `webdev_execute_sql` after generating migrations with `pnpm drizzle-kit generate`.

**Static assets:** All images, videos, and large files must be stored in `/home/ubuntu/webdev-static-assets/` and uploaded via `manus-upload-file --webdev`. The returned `/manus-storage/` URL is used in code. Files in `client/public/` are limited to small configuration files (favicon, robots.txt, manifest).

---

## 21. Known Issues & Limitations

The following issues are documented as of Sprint 60:

**Gamification tables require seeding.** The `badges`, `quests`, and `houses` tables are populated by `DEFAULT_BADGES`, `DEFAULT_QUESTS`, and `DEFAULT_HOUSES` constants in the server modules, but these seed records are not automatically inserted into the database on first deployment. The admin must call `admin.seedGamification` from the Admin Console to populate these tables. Until seeded, the Gamification Hub will display empty states.

**Rewards Marketplace UI is not yet built.** The `rewardsMarketplace` and `rewardRedemptions` tables and the `gamification.redeemReward` tRPC procedure exist, but the parent-facing `/rewards` page has not been implemented. This is the highest-priority pending UI feature.

**Seasonal Challenge banner is not yet implemented.** The `seasonalChallenges` and `userSeasonalProgress` tables exist, but there is no Dashboard banner or UI to surface active seasonal challenges to students.

**GTM container ID is a placeholder.** The `VITE_GTM_ID` environment variable must be set to a real Google Tag Manager container ID. The current value `GTM-XXXXXXX` in `client/index.html` is a placeholder.

**Stripe is in sandbox mode.** All Stripe transactions are simulated. To accept real payments, the owner must complete Stripe KYC verification and enter live keys via Settings → Payment.

**Weekly parent digest cron requires manual registration.** After each deployment, the admin must call `admin.scheduleWeeklyParentDigest` to re-register the Monday heartbeat job. The task UID is stored in `platformSettings` to prevent duplicate registration, but this step is not automated on startup.

**Safari Private Browsing / Firefox Strict ETP incompatibility.** Manus OAuth session cookies are blocked by Safari Private Browsing, Firefox Strict Enhanced Tracking Protection, and Brave Aggressive Shields. Users on these configurations cannot log in.

**Cold start latency.** With min-instances = 0, the first request after a period of inactivity may experience a 2–5 second cold start delay on Cloud Run.

---

## 22. Pending Work & Recommended Next Steps

The following items are prioritised for the next development sprint:

**Immediate (Sprint 61):**

1. **Auto-seed gamification on server startup.** Add a safe idempotent seed function that runs on server startup and inserts `DEFAULT_BADGES`, `DEFAULT_QUESTS`, and `DEFAULT_HOUSES` if the tables are empty. This ensures the Gamification Hub always shows real data without requiring a manual admin action.

2. **Build the Rewards Marketplace UI.** Create a `/rewards` page with two views: a parent view for creating and managing reward goals (title, XP cost, description, category), and a student view for browsing available rewards and submitting redemption requests. Wire the approval workflow so parents receive a notification when a student redeems a reward.

3. **Add Seasonal Challenge Dashboard banner.** Add a dismissible banner on the Home Dashboard that surfaces the currently active seasonal challenge (title, description, progress bar, XP/badge reward, deadline, CTA). The banner should update dynamically and be dismissible per-user per-challenge.

**Short-term (Sprint 62–63):**

4. **Full end-to-end QA pass.** Test every workflow from the perspective of each user type (student, parent, admin) including onboarding, course assignment, quiz flow, payment, gamification, and email notifications. Fix any broken states, empty data views, or confusing UX.

5. **Academic content validation.** Audit every course, unit, quiz, and diagnostic question bank for completeness, accuracy, and curriculum alignment. Identify grades or subjects with insufficient question coverage and expand the question banks.

6. **Mobile responsiveness audit.** Test all pages on iOS Safari and Android Chrome at 375px and 768px viewports. Fix any layout overflow, touch target size, or font scaling issues.

7. **Register GTM container ID.** Replace the `GTM-XXXXXXX` placeholder with a real Google Tag Manager container ID and configure GA4 goals for signup, trial start, subscription, and lesson completion events.

8. **Activate Stripe live mode.** Complete Stripe KYC, enter live keys via Settings → Payment, and test the full checkout flow with a real card.

**Medium-term (Sprint 64–66):**

9. **Avatar customisation UI.** The `userAvatars` table exists but there is no UI for students to customise their avatar. Build an avatar editor page accessible from the Profile page.

10. **School/ISD bulk enrolment flow.** The `enrolmentInvitations` table exists. Build an admin workflow for uploading a CSV of student emails and sending bulk enrolment invitations for school district deployments.

11. **Referral programme UI enhancements.** The referral system is functional but the `/referrals` page could be enhanced with a visual leaderboard, share buttons (WhatsApp, email, copy link), and referral milestone rewards.

12. **Push notifications (PWA).** The PWA manifest and service worker are configured. Implement push notification support for streak reminders, new badge awards, and weekly digest summaries.

---

## 23. Sprint History Summary

The following table summarises the major feature milestones delivered across 60 sprints:

| Sprint(s) | Major deliverables |
|---|---|
| Phases 2–9 | Initial platform: DB schema, dashboard, curriculum browser, AI tutor, diagnostic, quiz engine, mastery tracking, notifications |
| Sprint 8–11 | Course-aware diagnostic, inline course switcher, personalisation, course welcome gate |
| Sprint 12–14 | Enhanced UX, role-based tutor, landing page, onboarding, newsletter console, EduBot personality, course guardrails, Katy ISD Grade 4–8 catalogue |
| Sprint 15–17 | AP diagnostic, auto-enrolment, expanded question banks, KAP Grade 6–8 Science/SS, mobile responsiveness, logo/favicon |
| Sprint 18–19 | Course-specific diagnostic cooldown, enhanced admin portal, CMS, RBAC, student-to-parent invitation workflow |
| Sprint 20–22 | Transactional email (Resend), invite status banner, invite expiry heartbeat, email logs admin tab, pagination, quiz bank expansion |
| Sprint 23–26 | DNS verification, schools hero section, annual billing flow, Stripe integration, coupon management, payment analytics, Stripe products, webhook, PayPal/ACH |
| Sprint 27–32 | Free trial system, trial reminder webhook, branding/favicon/SEO, trial labels, robots.txt/sitemap, grace period screen, welcome email, GTM analytics |
| Sprint 33–37 | Bounce suppression, billing portal, GA4 funnel, suppression admin, user badge/skill, CSV export, trial reminder email, email delivery status, contextual tooltips |
| Sprint 38–42 | Parent-approval course assignment workflow, course request enhancements, admin console enhancements, inactivity monitoring, cross-browser compatibility, performance, student re-engagement, admin bulk actions, PWA |
| Sprint 43–46 | Cross-browser diagnostic, KaTeX lazy loading, PWA enhancements, CSP blank page fix, bundle size fix, production readiness |
| Sprint 49–55 | Change Plan button, GA4 funnel, vendor-charts TDZ crash fix, various audit fixes |
| Sprint 56 | Pre-K through Grade 2 curriculum expansion (Math, ELA, Science, Social Studies per grade), grade assumption updates platform-wide, course count updated to 70+ |
| Sprint 57 | EduBot Young Learner Mode, Early Diagnostic (`/diagnostic/early`), Parent-Led Mode toggle, parent coaching banner, ReadAloudButton with Web Speech API |
| Sprint 58 | ReadAloud integration into Quiz.tsx, CelebrationOverlay (confetti/star/badge-pop), disableAnimations/disableSound profile toggles, weekly parent digest email |
| Sprint 59 | Course Catalogue subject filter removal, academic grade order enforcement, platform-wide Pre-K–12 messaging audit |
| Sprint 60 | Comprehensive Gamification Framework: 14 DB tables, XP engine, 37 badges, streak tracking, quest system, house system, GamificationHub page, XP progress bar, Adventure Map, YoungLearnerRewards, parent Achievements tab, admin Gamification tab, AI motivation coach in EduBot |

---

*This document was generated on 2026-05-29 from the Sprint 60 checkpoint (`3c67408c`). It should be updated after each major sprint or milestone. The next planned update is after Sprint 61 (Rewards Marketplace, auto-seed gamification, Seasonal Challenge banner).*
