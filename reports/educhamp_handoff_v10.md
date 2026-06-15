# EduChamp — Comprehensive AI Agent Handoff Document (v10)

**Date:** June 15, 2026  
**Version:** 10.0  
**Checkpoint:** `9cdf64cb`  
**Repository:** [github.com/Pleks-Hub/educhamp](https://github.com/Pleks-Hub/educhamp)  
**Live Domains:** educhamp.app, educhamp.co, educhamp.manus.space  
**Author:** Manus AI

---

## 1. Project Overview

EduChamp is a full-stack adaptive learning platform targeting K-12 students (Pre-K through Grade 12) with a focus on Texas TEKS-aligned curriculum. The platform provides personalized learning paths, AI tutoring, gamification, parent oversight, and subscription billing. It is designed as a parent-first enrollment model where parents/guardians create accounts and add students, with COPPA compliance for children under 13.

**Primary Objectives:**
- Deliver adaptive, standards-aligned curriculum with mastery-based progression
- Provide AI-powered tutoring with Socratic method pedagogy
- Enable parent/guardian oversight with progress tracking and reward guidance
- Implement gamification (XP, badges, streaks, leaderboards, rewards marketplace)
- Support subscription billing via Stripe with parent delegation
- Maintain COPPA/FERPA compliance for student data

**Tech Stack:**
- Frontend: React 19 + Tailwind CSS 4 + shadcn/ui + Wouter (routing)
- Backend: Express 4 + tRPC 11 + Drizzle ORM
- Database: TiDB (MySQL-compatible, cloud-hosted)
- Auth: Manus OAuth + JWT sessions + optional 2FA
- Email: Resend (from noreply@educhamp.co)
- Payments: Stripe (checkout sessions, subscriptions, webhooks)
- AI: OpenAI via Manus Forge API (GPT-4o-mini for tutoring/content generation)
- Hosting: Manus Cloud Run (Node.js, 1 vCPU, 512 MiB RAM)

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React 19)                        │
│  Tailwind 4 · shadcn/ui · Wouter · tRPC React Query hooks      │
│  Pages: 57 · Components: DashboardLayout, XpProgressBar, etc.  │
└──────────────────────────────┬──────────────────────────────────┘
                               │ tRPC over HTTP (/api/trpc)
┌──────────────────────────────▼──────────────────────────────────┐
│                     SERVER (Express 4 + tRPC 11)                │
│  Routers: 23 feature routers + main routers.ts                  │
│  Scheduled: 13 POST handlers (heartbeat crons)                  │
│  Stripe webhook: /api/stripe/webhook                            │
│  OAuth: /api/oauth/callback                                     │
└────────┬──────────────────┬─────────────────────┬───────────────┘
         │                  │                     │
    ┌────▼────┐      ┌─────▼─────┐        ┌─────▼─────┐
    │  TiDB   │      │  Resend   │        │  Stripe   │
    │ 103 tbl │      │  21 tmpl  │        │  Billing  │
    └─────────┘      └───────────┘        └───────────┘
```

**Key Architectural Decisions:**
- Single Node.js process (no worker threads) — all scheduled jobs are HTTP POST endpoints triggered by external heartbeat crons
- tRPC for end-to-end type safety — no REST endpoints except OAuth, Stripe webhook, and scheduled handlers
- Drizzle ORM with explicit migrations (63 migration files) — schema-first workflow
- All XP flows through a single `awardXp()` function that writes to both `xpLedger` and `studentLevels.totalXp`
- Email de-duplication via `emailLogs.referenceId` pattern
- S3 storage for file uploads (storagePut/storageGet helpers)
- Mastery decay runs daily to encourage consistent engagement

---

## 3. Database Schema (103 Tables)

### Core User Tables

| Table | Purpose |
|-------|---------|
| `users` | All accounts (id, openId, name, email, role, accountType, lastSignedIn) |
| `userProfiles` | Extended profile (grade, dob, state, school, parentLedMode, leaderboardOptOut, notification prefs) |
| `userSessions` | Active sessions with device/browser info |
| `twoFactorAuth` | TOTP 2FA secrets and backup codes |
| `passwordResetTokens` | Password reset flow tokens |

### Enrollment & Relationships

| Table | Purpose |
|-------|---------|
| `parentChildren` | Parent-child linkage (parentId → childId) |
| `coParentAccess` | Co-parent/guardian read access |
| `coParentInvitations` | Pending co-parent invites |
| `studentInviteTokens` | Parent → student invite tokens (with expiry, status, timeline) |
| `parentInviteTokens` | Student → parent invite tokens |
| `enrolmentInvitations` | Generic enrollment invitations |
| `userCourseEnrollments` | Student course enrollment records |
| `enrollmentContexts` | Why parent enrolled student (goals, context) |
| `parentalConsents` | COPPA consent records |

### Curriculum & Content

| Table | Purpose |
|-------|---------|
| `courses` | 75+ courses (courseCode, title, subject, gradeLevel, teksCode) |
| `units` | Course units (12 per course for Algebra I) |
| `lessons` | Individual lessons within units |
| `lessonProgress` | Student lesson completion tracking |
| `unitProgress` | Unit-level progress aggregation |
| `quizQuestions` | Quiz question bank |
| `quizAttempts` | Student quiz attempt records |
| `diagnosticQuestions` | Placement test questions (mapped to units) |
| `diagnosticAttempts` | Diagnostic test results with unit scores |
| `skills` | Granular skill definitions |
| `skillReviewSchedule` | Spaced repetition review scheduling |
| `learningObjectives` | Curriculum learning objectives |
| `objectivePrerequisites` | Prerequisite chains between objectives |

### Standards & Alignment

| Table | Purpose |
|-------|---------|
| `standards` | Educational standards (TEKS, Common Core) |
| `standardFrameworks` | Framework metadata |
| `standardCrosswalk` | Cross-framework alignment mapping |
| `unitStandards` | Unit-to-standard mapping |

### Gamification & Engagement

| Table | Purpose |
|-------|---------|
| `studentLevels` | Level, totalXp, currentLevelXp (single source of truth for XP) |
| `xpLedger` | Every XP transaction (source, amount, timestamp) |
| `badges` | Badge definitions |
| `userBadges` | Earned badges per student |
| `streaks` | Daily activity streaks (currentStreak, longestStreak, freezesAvailable) |
| `streakStats` | Aggregate streak statistics |
| `learningStreaks` | Detailed streak history |
| `rewardsMarketplace` | Parent-created rewards (name, xpCost, category) |
| `rewardRedemptions` | Student redemption requests (pending/approved/rejected) |
| `houses` | House system (Hogwarts-style) |
| `userHouses` | Student house assignments |
| `quests` | Quest definitions |
| `userQuests` | Quest progress tracking |
| `seasonalChallenges` | Time-limited challenges |
| `userSeasonalProgress` | Seasonal challenge progress |
| `weeklyChallenges` | Weekly challenge definitions |
| `focusSessions` | Focus mode timer sessions |

### Parent Tools

| Table | Purpose |
|-------|---------|
| `parentTasks` | Custom tasks created by parents |
| `parentTaskCompletions` | Task completion records |
| `parentTaskTemplates` | Reusable task templates |
| `sharedTasks` | Sibling-shared tasks |
| `sharedTaskClaims` | Which child claimed a shared task |
| `taskCategories` | Task categorization |
| `parentGoals` | Parent-set goals for children |
| `parentNotes` | Parent notes on child progress |
| `parentPlanSuggestions` | AI-generated plan suggestions |
| `familyActivityFeed` | Cross-sibling activity timeline |

### Billing & Subscriptions

| Table | Purpose |
|-------|---------|
| `subscriptions` | Stripe subscription records |
| `billingDelegations` | Parent billing delegation to another parent |
| `billingExemptions` | Admin-granted billing exemptions |
| `coupons` | Promotional coupon definitions |
| `couponRedemptions` | Coupon usage tracking |
| `paymentAuditLog` | Payment event audit trail |

### Communication

| Table | Purpose |
|-------|---------|
| `emailLogs` | Sent email tracking (referenceId for de-dup) |
| `emailLogsArchive` | Archived email logs |
| `emailSettings` | Per-user email preferences |
| `emailSuppression` | Bounced/complained email addresses |
| `suppressionAuditLog` | Suppression change audit |
| `chatMessages` | AI tutor chat messages |
| `chatSessions` | Tutor session metadata |
| `userNotifications` | In-app notification queue |
| `newsletterSubscriptions` | Newsletter opt-ins |
| `newsletterCampaigns` | Newsletter campaign records |
| `inactivityNotifications` | Inactivity alert tracking |

### Admin & Platform

| Table | Purpose |
|-------|---------|
| `adminRoles` | Custom admin role definitions |
| `adminRoleAssignments` | Role-to-user assignments |
| `rolePermissions` | Granular permission flags |
| `adminAuditLog` | Admin action audit trail |
| `adminImpersonationSessions` | Admin impersonation tracking |
| `platformSettings` | Global platform configuration |
| `questionFlags` | Student-flagged question reports |
| `courseRequests` | Student course access requests |
| `demoRequests` | Landing page demo requests |
| `referrals` | Referral program tracking |
| `referralSignups` | Referral conversion tracking |

### Geography

| Table | Purpose |
|-------|---------|
| `countries` | Country list |
| `states` | State/province list |
| `districts` | School district list |
| `schools` | School list |

### Content Management

| Table | Purpose |
|-------|---------|
| `cmsContent` | CMS content blocks |
| `cmsContentHistory` | Content revision history |
| `assessmentTemplates` | Assessment template definitions |
| `tracks` | Learning track definitions |
| `pacingGuides` | Pacing guide metadata |
| `pacingWindows` | Pacing window definitions |
| `resourceAdoptions` | Resource adoption tracking |
| `masteryRecords` | Historical mastery snapshots |
| `userMastery` | Current mastery scores per skill |
| `courseCertificates` | Course completion certificates |
| `userAvatars` | Student avatar customization |

---

## 4. Authentication & Onboarding Flows

### Authentication Methods
1. **Manus OAuth** — Primary login for parents (redirects to Manus login portal)
2. **Student email/password** — Students set password via invite link, then login at `/student-login`
3. **Optional 2FA** — TOTP-based two-factor authentication
4. **Password reset** — Email-based reset flow for both parents and students

### Onboarding Flow (Parent-First Model)

```
Parent signs up via Manus OAuth
  → /onboarding/parent (collect demographics, goals, school info)
  → Parent Dashboard (add children via email invite)
    → Student receives invite email
    → /student-setup (set password, accept invite)
    → /student-welcome (choose course, take diagnostic)
    → /diagnostic (placement test)
    → Home (personalized learning path)
```

### COPPA Compliance
- Students under 13 require verifiable parental consent
- Consent request email sent to parent with approve/deny links
- `/consent/approve` and `/consent/deny` endpoints
- Students wait at `/consent/waiting` until parent responds
- Age calculated from DOB with state-aware age-of-majority rules

### Account Types
- `accountType: "parent"` — Can manage children, view progress, create tasks/rewards
- `accountType: "student"` — Can learn, take quizzes, earn XP, redeem rewards
- `role: "admin" | "user"` — Admin role grants access to admin console

---

## 5. Curriculum, Course & Learning System

### Course Structure
- **75+ courses** across math, English, science, social studies
- Each course has **12 units** (for Algebra I)
- Each unit has **9 lessons** (expanded via AI generation)
- Each unit has a **quiz** (multiple choice, graded)
- Courses are TEKS-aligned with standard codes

### Diagnostic Placement Test
- **57 questions** for Algebra I (9 prerequisite + 4 per unit)
- Adaptive difficulty (easy/medium/hard)
- Results map to unit mastery scores
- Determines starting point in curriculum
- Follow-up email sent 24-48h after if student hasn't started weak units

### Mastery System
- Per-skill mastery scores (0-100)
- Mastery levels: Novice (0-25), Developing (26-50), Proficient (51-75), Master (76-100)
- **Engagement decay**: Skills not practiced in 7+ days lose points (graduated: -2/-3/-5 per day based on inactivity duration, floor at 10)
- Spaced repetition review scheduling for skill retention

### AI Tutor
- Socratic method pedagogy (asks guiding questions, doesn't give answers directly)
- Course-aware system prompt (adjusts language for early childhood vs. advanced)
- Parent-led mode for Pre-K/K courses (simplified language, parent guidance)
- Chat history persistence per session
- Streaming responses with markdown rendering

### Learning Plans
- AI-generated personalized study schedules
- Parent-initiated plan suggestions
- Hourly reminder emails based on student preferences
- Pacing guides and windows for structured progression

---

## 6. Gamification System

### XP Economy
All XP flows through `awardXp()` → writes to `xpLedger` + updates `studentLevels.totalXp`.

| Source | XP Amount | Trigger |
|--------|-----------|---------|
| `lesson_complete` | 10-50 | Completing a lesson |
| `quiz_pass` | 20-100 | Passing a quiz |
| `task_completion` | Variable | Completing parent-assigned task |
| `parent_bonus` | Variable | Parent bonus XP award |
| `streak_bonus` | 5-25 | Maintaining daily streak |
| `quest_complete` | 50-200 | Completing a quest |
| `badge_earned` | 25-100 | Earning a badge |
| `exam_prep_session` | 15-30 | Completing exam prep |
| `focus_mode` | 10-40 | Completing focus session |
| `mastery_decay` | Negative | Daily decay for inactive skills |

### Leaderboards
- **Main XP Leaderboard** — Sorted by `studentLevels.totalXp` (all sources)
- **Family XP Leaderboard** — Same total XP with task XP breakdown
- **Streak Leaderboard** — Sorted by current streak length
- **Leaderboard opt-out** — Students can hide from leaderboards via settings toggle (still tracks XP privately)

### XP Visibility (Sprint 37-39)
- Sidebar footer: XpProgressBar widget showing level + progress to next
- Home page: XpBalanceCard stat showing total XP
- GamificationHub: "XP Sources" tab with donut chart breakdown by source
- Rewards Marketplace: Available XP balance for spending
- Parent view: Weekly XP trend bar chart with engagement indicator

### Rewards Marketplace
- Parents create rewards (name, description, XP cost, category, child assignment)
- Students browse and redeem rewards (confirmation dialog before spending)
- "My Redemptions" tab shows pending/approved/rejected history
- Parents approve/reject from dedicated `/parent-rewards` page
- Reward categories: screen_time, activity, treat, privilege, other

### Badges, Streaks, Quests
- Badge system with automatic award checking after XP events
- Daily streaks with freeze mechanic (earned via XP/badges)
- Quests: multi-step objectives with progress tracking
- Seasonal challenges: time-limited events with leaderboards
- Weekly challenges: rotating weekly objectives
- Houses: team-based competition (Hogwarts-style)

---

## 7. Parent Module

### Parent Dashboard (`/parent`)
- **Overview tab**: Children cards with quick stats, recent activity
- **Child detail view**: Tabbed interface (Progress, Tasks, Rewards, Achievements, Settings)
- **Rewards tab**: Approval queue, reward creation, XP trend chart
- **Tasks tab**: Create/manage custom tasks, templates, shared tasks
- **Achievements tab**: XP summary, weekly trend chart, badges, streak info

### Parent Tools
- `/parent-rewards` — Dedicated rewards management page with guidance tips
- `/parent-insights` — Analytics and insights across all children
- `/family-feed` — Cross-sibling activity timeline
- `/task-calendar` — Calendar view of tasks and deadlines
- `/billing` — Subscription management, payment history
- `/billing/setup` — Initial billing setup flow

### Co-Parent System
- Invite co-parents/guardians via email
- Co-parents get read access to child progress
- Separate from primary parent (cannot modify settings)

### Notification Preferences
- `inviteRemindersEnabled` — Receive reminders about pending invites
- `weeklyDigestEnabled` — Monday progress summary email
- `leaderboardOptOut` — Hide child from leaderboards (student-facing)

---

## 8. Admin Console

### Admin Dashboard (`/admin`)
Tabbed interface with the following sections:

| Tab | Capabilities |
|-----|-------------|
| Users | List/search/filter users, view details, impersonate, force password reset |
| Courses | Manage courses, units, lessons, quiz questions |
| Invites | Invite status badges, conversion chart, bulk actions |
| Billing | Subscription overview, exemptions, payment audit |
| Email | Email logs, suppression list, service health |
| System | Health check panel, platform settings |
| Newsletter | Campaign management, subscriber lists |
| Chat | AI tutor session management |
| Flags | Student-reported question flags, resolution workflow |
| Roles | Custom role definitions, permission management |

### Admin Features
- **Impersonation**: Admin can impersonate any user (tracked in audit log)
- **Audit logging**: All admin actions recorded with timestamp, actor, details
- **Role-based access**: Custom roles with granular permissions
- **User detail views**: Full profile, enrollment, billing, activity history
- **Bulk operations**: Bulk invite resend, bulk user actions

---

## 9. Email System

### Email Service
- Provider: **Resend** (from `noreply@educhamp.co`)
- De-duplication: `emailLogs.referenceId` prevents duplicate sends
- Suppression: Bounce/complaint handling with `emailSuppression` table
- Templates: 21 branded HTML email templates

### Email Templates

| Template | Trigger |
|----------|---------|
| `billingActivatedStudent` | Student's billing activated |
| `cardExpiry` | Payment card expiring within 30 days |
| `coppaConsentRequest` | COPPA consent needed from parent |
| `courseRequestNotification` | Student requests course access |
| `diagnosticFollowUp` | 24-48h after diagnostic, student hasn't started weak units |
| `flagResolutionNotification` | Question flag resolved by admin |
| `inactivityNotification` | Student inactive for 3+ days |
| `inviteAccepted` | Student accepted parent's invite |
| `learningPlanReminder` | Upcoming study block reminder |
| `parentBillingNotification` | Billing action needed |
| `parentInvite` | Parent invite to join platform |
| `passwordReset` | Password reset link |
| `pendingCourseRequestDigest` | Admin digest of pending requests |
| `studentActivated` | Student account activated |
| `studentSetup` | Student invite to set up account |
| `trialExpiry` | Trial period ending |
| `trialReminder` | Trial reminder nudge |
| `trialWelcome` | Welcome to trial |
| `weeklyParentDigest` | Monday progress summary for parents |
| `weeklyStudentReviewSummary` | Monday review summary for students |

---

## 10. Scheduled Jobs (Heartbeat Crons)

All scheduled jobs are HTTP POST endpoints triggered by the Manus heartbeat system. They run as part of the same Node.js process.

| Name | Endpoint | Schedule | Description |
|------|----------|----------|-------------|
| `engagement-decay` | `/api/scheduled/engagement-decay` | Daily 07:00 UTC (2am Houston) | Graduated mastery decay for inactive skills (-2/-3/-5 pts/day), streak reset if no freeze |
| `diagnostic-follow-up` | `/api/scheduled/diagnostic-follow-up` | Daily 09:00 UTC (4am Houston) | Emails students who completed diagnostic 24-48h ago but haven't started weak units |
| `student-invite-auto-expire` | `/api/scheduled/student-invite-auto-expire` | Daily 08:00 UTC | Marks expired student invite tokens as "expired" in DB |
| `invite-expiry-reminder` | `/api/scheduled/invite-expiry-reminder` | Daily 09:00 UTC | Emails parents 24h before their student invite expires |
| `invite-expiry` | `/api/scheduled/invite-expiry` | Daily 02:00 UTC | Expires pending parent invite tokens older than 7 days |
| `inactivity-monitor` | `/api/scheduled/inactivity-monitor` | Daily 04:00 UTC | Detects inactive students, sends re-engagement notifications |
| `card-expiry-reminder` | `/api/scheduled/card-expiry-reminder` | Daily 09:00 UTC | Checks for cards expiring within 30 days, sends reminders |
| `weekly-parent-digest` | `/api/scheduled/weekly-parent-digest` | Monday 08:00 UTC | Sends parent digest with tasks completed, XP earned, badges, mastery changes |
| `weekly-student-review-summary` | `/api/scheduled/weekly-student-review-summary` | Monday 08:00 UTC | Sends student review summary with due reviews and streak status |
| `learning-plan-reminder` | `/api/scheduled/learning-plan-reminder` | Hourly | Checks for upcoming study blocks, sends email reminders |
| `parent-billing-reminder` | `/api/scheduled/parent-billing-reminder` | Every 12 hours | Re-sends billing notification to parents who haven't completed setup within 48h |
| `pending-course-request-digest` | `/api/scheduled/pending-course-request-digest` | Daily | Admin digest of pending course requests |
| `grade-promotion` | `/api/scheduled/grade-promotion` | Monthly 1st at 03:00 UTC | Auto-promotes students who completed all units in their grade |

### Heartbeat Task UIDs

| Job | task_uid |
|-----|----------|
| engagement-decay | `L4DwFH6Hr3jazLVJBqABoY` |
| diagnostic-follow-up | `7Xn4JsLrfsWxKZNqcKXZ9u` |
| student-invite-auto-expire | (see heartbeat list) |
| invite-expiry-reminder | (see heartbeat list) |
| weekly-parent-digest | `VFmmq38gEHsTkdTr75taLa` |
| inactivity-monitor | `TfBbAhvkcJhoKnDYpySBqq` |
| grade-promotion | `HynncMVRZiuZqiRAVZ3qSw` |
| card-expiry-reminder | `8J437kBMWD8nYKGV9ksDni` |
| parent-billing-reminder | `BM98LA2wm59KjkAj4FUvNh` |
| learning-plan-reminder | `6yJLdjdyiYbgUtrEKDLQKP` |

---

## 11. Billing & Subscription System

### Stripe Integration
- **Mode**: Both test and live keys configured
- **Webhook**: `POST /api/stripe/webhook` at `https://educhamp-ai-bggbz5qk.manus.space/api/stripe/webhook`
- **Checkout**: Server-side session creation with `allow_promotion_codes: true`
- **Test card**: 4242 4242 4242 4242

### Billing Flow
1. Student requests course access → parent notified
2. Parent navigates to `/billing/setup` → selects plan
3. Stripe Checkout session created → redirect to Stripe
4. Payment completes → webhook fires → subscription activated
5. Student gains full access to enrolled courses

### Billing Features
- Subscription management (upgrade/downgrade/cancel)
- Payment history with filtering and sorting
- Invoice/receipt download
- Card expiry reminders (30 days before)
- Billing delegation (one parent pays for another's children)
- Admin billing exemptions (free access grants)
- Coupon/promo code support
- Payment audit logging

---

## 12. API & Router Architecture

### Main Router (`server/routers.ts` — 1,962 lines)
Contains inline procedures for: `auth`, `curriculum`, `progress`, `quiz`, `diagnostic`, `tutor`, `courses`, `student`, `notifications`, `examPrep`, `streak`, `learningPlan`, `planSuggestion`

### Feature Routers (`server/routers/*.ts` — 23 files)

| Router | Purpose |
|--------|---------|
| `admin.ts` | Admin console operations, health check, impersonation |
| `adminUserDetail.ts` | Detailed user view for admins |
| `authEnhancements.ts` | 2FA, password reset, session management |
| `certificate.ts` | Course completion certificates |
| `coParent.ts` | Co-parent invitation and access |
| `coppa.ts` | COPPA consent workflow |
| `familyFeed.ts` | Family activity feed CRUD |
| `focusMode.ts` | Focus timer sessions |
| `gamification.ts` | XP, badges, leaderboards, rewards, redemptions |
| `landing.ts` | Landing page demo requests |
| `newsletter.ts` | Newsletter campaigns and subscriptions |
| `onboarding.ts` | Parent/student onboarding, invite acceptance |
| `parent.ts` | Parent dashboard data, child management |
| `parentTasks.ts` | Custom task CRUD, templates, completion |
| `parentTools.ts` | Parent insights, analytics |
| `payment.ts` | Stripe checkout, subscription management |
| `questionFlags.ts` | Question flagging and resolution |
| `referral.ts` | Referral program |
| `sharedTasks.ts` | Sibling-shared task system |
| `skillPractice.ts` | Practice weak skills mode |
| `studentAuth.ts` | Student login, password setup |
| `weeklyChallenges.ts` | Weekly challenge system |
| `weeklyReport.ts` | Weekly PDF report generation |

### Key Middleware & Procedures
- `publicProcedure` — No auth required
- `protectedProcedure` — Requires valid session (injects `ctx.user`)
- `studentProcedure` — Requires student account type
- `adminProcedure` — Requires `role === 'admin'`

---

## 13. Frontend Architecture

### Route Inventory (57 pages)

**Public Routes (no auth):**
- `/landing` — Marketing landing page
- `/sign-in`, `/student-login` — Login pages
- `/forgot-password`, `/student-forgot-password`, `/reset-password` — Password reset
- `/accept-invite`, `/join` — Invite acceptance
- `/onboarding/parent`, `/onboarding/student` — Onboarding flows
- `/consent/approve`, `/consent/deny`, `/consent/waiting` — COPPA consent
- `/student-setup`, `/student-welcome` — Student first-time setup
- `/checkout/success`, `/course-request/result` — Post-action pages
- `/verify-2fa` — Two-factor verification
- `/certificate/:token` — Public certificate view

**Admin Routes:**
- `/admin` — Admin dashboard (tabbed)
- `/admin/newsletter` — Newsletter console
- `/admin/chat` — Chat session management

**Authenticated Routes (DashboardLayout):**
- `/` — Student home (stats, courses, quick actions)
- `/courses` — Course catalog
- `/curriculum` — Current course curriculum
- `/curriculum/unit/:unitNumber` — Unit detail with lessons
- `/curriculum/unit/:unitNumber/lesson/:lessonId` — Lesson viewer
- `/curriculum/unit/:unitNumber/quiz` — Unit quiz
- `/tutor` — AI tutor chat
- `/exam-prep` — Exam preparation mode
- `/diagnostic`, `/diagnostic/early` — Placement tests
- `/course-welcome` — Course introduction
- `/progress` — Progress overview
- `/skills` — Skills mastery view
- `/practice` — Practice weak skills
- `/parent` — Parent dashboard
- `/profile` — User profile
- `/settings/notifications` — Notification preferences
- `/referrals` — Referral program
- `/billing`, `/billing/setup` — Billing management
- `/learning-plan` — Personalized learning plan
- `/gamification` — Achievements hub (badges, XP sources, leaderboard)
- `/rewards` — Rewards marketplace
- `/adventure-map` — Visual learning path
- `/my-tasks` — Student task list
- `/task-calendar` — Task calendar view
- `/streak-leaderboard` — Streak rankings
- `/focus-mode` — Focus timer
- `/task-leaderboard` — Family XP leaderboard
- `/shared-tasks` — Sibling shared tasks
- `/parent-rewards` — Parent reward management
- `/parent-insights` — Parent analytics
- `/family-feed` — Family activity timeline
- `/certificates` — My certificates

### Navigation Structure
- **Student sidebar**: Home, Courses, Curriculum, Progress, Achievements, XP & Rewards, Tasks, Tutor, Focus Mode, Learning Plan
- **Parent sidebar**: Dashboard, Rewards, Insights, Family Feed, Billing, Settings
- **Admin**: Separate tabbed layout (not DashboardLayout)

---

## 14. Integrations & Third-Party Services

| Service | Purpose | Config |
|---------|---------|--------|
| Manus OAuth | Primary authentication | `VITE_APP_ID`, `OAUTH_SERVER_URL` |
| Manus Forge API | LLM (GPT-4o-mini), image generation, voice transcription | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` |
| Stripe | Payments, subscriptions, webhooks | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Resend | Transactional email delivery | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| TiDB Cloud | MySQL-compatible database | `DATABASE_URL` |
| S3 Storage | File uploads (avatars, certificates) | Built-in via `storagePut`/`storageGet` |
| Manus Heartbeat | Scheduled job execution | Built-in via `manus-heartbeat` CLI |
| Google Maps | Map integration (proxy-authenticated) | Built-in via Map component |

---

## 15. Testing & QA Status

### Test Suite
- **Framework**: Vitest
- **Total tests**: 1,264 passing
- **Test files**: 51 files in `server/*.test.ts`
- **Coverage areas**: Auth, billing, email, admin, gamification, scheduled jobs, security

### Test File Inventory

| File | Focus |
|------|-------|
| `auth.logout.test.ts` | Auth logout flow |
| `admin-portal.test.ts` | Admin operations |
| `ageValidation.test.ts` | Age/DOB validation |
| `authEnhancements.test.ts` | 2FA, password reset |
| `billing.test.ts` | Billing flows |
| `billingExemptions.test.ts` | Admin exemptions |
| `billingFlow.test.ts` | E2E billing |
| `card-transactions.test.ts` | Card management |
| `certificate.test.ts` | Certificate generation |
| `course-management.test.ts` | Course CRUD |
| `demoRequest.test.ts` | Demo request flow |
| `email.test.ts` / `emailService.test.ts` | Email delivery |
| `payment.test.ts` | Payment processing |
| `security.test.ts` | Security checks |
| `sprint36-41.test.ts` | Recent sprint features |
| `stripeWebhook.test.ts` | Webhook handling |
| `studentAuth.test.ts` | Student auth flows |
| `weeklyDigest.test.ts` | Digest email logic |

### Known Testing Gaps
- No E2E browser tests (only unit/integration via Vitest)
- No load/performance testing
- Frontend components not unit tested (relies on TypeScript + manual QA)

---

## 16. Known Issues & Technical Debt

### Active Issues
1. **Unit 1 title mismatch** — Algebra I Unit 1 is titled "Reading Foundations & Comprehension" instead of an algebra topic (likely a seed data error)
2. **No E2E tests** — Only server-side Vitest tests exist; no Playwright/Cypress browser tests
3. **Large file sizes** — `ParentDashboard.tsx` (3,852 lines), `AdminDashboard.tsx` (3,650 lines), `db.ts` (4,956 lines) should be split
4. **Stripe sandbox not claimed** — User needs to claim at the provided URL
5. **No rate limiting** — API endpoints lack rate limiting (relies on Cloud Run scaling)
6. **No image optimization** — User-uploaded images served as-is without resizing/compression

### Technical Debt
- `routers.ts` main file is 1,962 lines — should split remaining inline routers into separate files
- Some test files use shared mock state that can leak between tests
- No database connection pooling configuration (relies on TiDB defaults)
- Email templates use inline styles (no CSS framework for emails)
- No i18n/localization support (English only)

---

## 17. Environment Variables

### Server-Side (Required)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | TiDB MySQL connection string (with SSL) |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL |
| `OWNER_OPEN_ID` | Platform owner's Manus ID |
| `OWNER_NAME` | Platform owner's display name |
| `BUILT_IN_FORGE_API_URL` | Manus Forge API endpoint |
| `BUILT_IN_FORGE_API_KEY` | Forge API bearer token |
| `RESEND_API_KEY` | Resend email service key |
| `RESEND_FROM_EMAIL` | Sender address (noreply@educhamp.co) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Client-Side (VITE_ prefix)

| Variable | Purpose |
|----------|---------|
| `VITE_APP_ID` | OAuth app ID for login URL |
| `VITE_APP_TITLE` | Application title |
| `VITE_APP_LOGO` | Application logo URL |
| `VITE_OAUTH_PORTAL_URL` | Login portal URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend Forge API token |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend Forge API URL |
| `VITE_ANALYTICS_ENDPOINT` | Analytics endpoint |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics site ID |
| `VITE_GTM_ID` | Google Tag Manager ID |

---

## 18. Deployment & Infrastructure

### Hosting
- **Platform**: Manus Cloud Run (managed)
- **Runtime**: Node.js single process
- **Resources**: 1 vCPU, 512 MiB RAM, 180s request timeout
- **Min instances**: 0 (cold starts possible)
- **Build**: `pnpm run build` (Vite frontend + TypeScript server)

### Domains
- `educhamp.app` (primary)
- `educhamp.co` (secondary)
- `educhamp.manus.space` (Manus subdomain)
- `educhamp-ai-bggbz5qk.manus.space` (internal)

### Database
- **Provider**: TiDB Cloud (MySQL-compatible)
- **Region**: US East (AWS)
- **SSL**: Required (`rejectUnauthorized: true`)
- **Migrations**: 63 Drizzle migration files in `drizzle/0*` directories
- **Schema management**: `pnpm drizzle-kit generate` → read SQL → `webdev_execute_sql`

### GitHub Integration
- **Repository**: `Pleks-Hub/educhamp`
- **Remote**: `user_github` (auto-synced on checkpoint)
- **Branch**: `main`

---

## 19. File Structure Reference

```
educhamp/
├── client/
│   ├── index.html                    # Entry HTML with Google Fonts
│   ├── public/                       # favicon.ico, robots.txt only
│   └── src/
│       ├── App.tsx                    # Route definitions (185 lines)
│       ├── main.tsx                   # Providers (tRPC, Theme, Toaster)
│       ├── index.css                  # Global theme (OKLCH colors, Tailwind)
│       ├── const.ts                   # getLoginUrl(), app constants
│       ├── pages/                     # 57 page components
│       │   ├── Home.tsx              # Student home (1,284 lines)
│       │   ├── ParentDashboard.tsx   # Parent portal (3,852 lines)
│       │   ├── AdminDashboard.tsx    # Admin console (3,650 lines)
│       │   ├── GamificationHub.tsx   # Achievements + XP Sources
│       │   ├── RewardsMarketplace.tsx # Student rewards + My Redemptions
│       │   ├── ParentRewards.tsx     # Parent reward management
│       │   ├── TaskLeaderboard.tsx   # Family XP leaderboard
│       │   └── ... (50+ more)
│       ├── components/
│       │   ├── DashboardLayout.tsx   # Sidebar nav (782 lines)
│       │   ├── XpProgressBar.tsx     # XP level widget
│       │   ├── AIChatBox.tsx         # AI tutor chat UI
│       │   ├── Map.tsx               # Google Maps integration
│       │   └── ui/                   # shadcn/ui components (50+)
│       ├── contexts/
│       │   └── ThemeContext.tsx       # Dark/light theme
│       ├── hooks/                    # Custom hooks
│       └── lib/
│           ├── trpc.ts               # tRPC client binding
│           └── utils.ts              # Utility functions
├── server/
│   ├── _core/                        # Framework plumbing (DO NOT EDIT)
│   │   ├── index.ts                  # Express app, route mounting
│   │   ├── context.ts               # tRPC context builder
│   │   ├── trpc.ts                   # Procedure definitions
│   │   ├── oauth.ts                  # Manus OAuth handler
│   │   ├── llm.ts                    # invokeLLM helper
│   │   ├── imageGeneration.ts        # generateImage helper
│   │   ├── voiceTranscription.ts     # transcribeAudio helper
│   │   ├── notification.ts           # notifyOwner helper
│   │   ├── heartbeat.ts             # Heartbeat auth middleware
│   │   ├── env.ts                    # Environment variable access
│   │   └── systemRouter.ts          # System health procedures
│   ├── routers.ts                    # Main tRPC router (1,962 lines)
│   ├── routers/                      # 23 feature router files
│   ├── db.ts                         # Database helpers (4,956 lines)
│   ├── emailService.ts              # sendEmail wrapper
│   ├── emailTemplates/              # 21 email template files
│   ├── scheduled/                   # 13 scheduled job handlers
│   ├── gamification/                # XP, badges, streaks, quests, houses
│   ├── educhamp-helpers.ts          # Mastery level helpers, tutor prompts
│   ├── storage.ts                   # S3 storagePut/storageGet
│   └── *.test.ts                    # 51 test files (1,264 tests)
├── drizzle/
│   ├── schema.ts                    # 103 tables (2,248 lines)
│   ├── relations.ts                 # Drizzle relation definitions
│   ├── meta/_journal.json           # Migration journal
│   └── 0000-0062/                   # 63 migration directories
├── shared/
│   ├── const.ts                     # Shared constants
│   └── types.ts                     # Shared TypeScript types
├── scripts/                         # Seed/utility scripts
├── reports/                         # Handoff docs, QA reports
├── references/
│   └── periodic-updates.md          # Heartbeat cron documentation
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── vite.config.ts                   # Vite build config
├── vitest.config.ts                 # Test config
├── drizzle.config.ts               # Drizzle ORM config
└── todo.md                          # Feature tracking (3,100+ lines)
```

---

## 20. Development Workflow

### Adding a New Feature
1. Add `[ ]` items to `todo.md`
2. Update `drizzle/schema.ts` if new tables needed
3. Run `pnpm drizzle-kit generate` → read generated SQL → apply via `webdev_execute_sql`
4. Add query helpers to `server/db.ts`
5. Add tRPC procedures to `server/routers.ts` or `server/routers/<feature>.ts`
6. Build UI in `client/src/pages/<Feature>.tsx`
7. Register route in `client/src/App.tsx`
8. Write tests in `server/<feature>.test.ts`
9. Run `npx vitest run` to verify
10. Mark items as `[x]` in `todo.md`
11. Save checkpoint via `webdev_save_checkpoint`

### Adding a Scheduled Job
1. Create handler in `server/scheduled/<name>.ts`
2. Import and mount in `server/_core/index.ts` as `app.post("/api/scheduled/<name>", handler)`
3. Register cron: `manus-heartbeat create --project-path /home/ubuntu/educhamp --name "<name>" --endpoint "POST /api/scheduled/<name>" --cron "<cron expression>"`
4. Write tests
5. Verify with `manus-heartbeat list`

### Adding an Email Template
1. Create template in `server/emailTemplates/<name>.ts`
2. Export a function returning `{ subject: string, html: string }`
3. Use `emailBase` wrapper for consistent branding
4. Call via `sendEmail({ to, subject, html, referenceId })` from `server/emailService.ts`
5. Use `referenceId` pattern for de-duplication (e.g., `"diag-followup-{attemptId}"`)

### Database Migrations
- **NEVER** use `pnpm drizzle-kit push` (experiment `no_db_push` is enabled)
- Always: edit schema → `pnpm drizzle-kit generate` → read SQL file → `webdev_execute_sql`
- Destructive changes: drop constraints before tables, handle dependencies leaf-to-root

---

## 21. Sprint History (Condensed)

| Sprint | Focus |
|--------|-------|
| 1-5 | Initial scaffold, auth, curriculum, quiz engine, diagnostic test |
| 6-10 | Parent dashboard, child management, co-parent system, COPPA compliance |
| 11-15 | Gamification (XP, badges, streaks, leaderboards), rewards marketplace |
| 16-20 | Admin console, billing/Stripe, email system, newsletter |
| 21-25 | AI tutor, exam prep, focus mode, learning plans, adventure map |
| 26-30 | Parent tasks, shared tasks, family feed, weekly challenges, certificates |
| 31-35 | Invite lifecycle (timeline, reminders, auto-expire, bulk actions), parent notifications |
| 36 | Invite acceptance email, weekly progress digest preference toggle |
| 37 | XP & Rewards visibility (sidebar, home, marketplace "My Redemptions", parent rewards page) |
| 38 | XP leaderboard consistency — unified studentLevels.totalXp across all displays |
| 39 | XP breakdown donut chart, parent weekly XP trend, leaderboard opt-out |
| 40 | Diagnostic follow-up scheduled job (daily 09:00 UTC) |
| 41 | Engagement decay scheduled job (daily 07:00 UTC, graduated mastery decay) |

---

## 22. Pending Enhancements & Roadmap

### High Priority
- [ ] Diagnostic re-test reminder (2 weeks after initial diagnostic)
- [ ] Admin diagnostic completion dashboard (scores by unit, follow-up rates)
- [ ] Smart unit sequencing (auto-unlock weakest unit after diagnostic)
- [ ] Decay notification email (nudge when mastery drops below 50)
- [ ] Rate limiting on API endpoints

### Medium Priority
- [ ] XP source drill-down (click donut chart segment → event list)
- [ ] Family activity feed real-time updates (SSE instead of polling)
- [ ] Exportable weekly PDF report for parents
- [ ] Admin invite filtering and CSV export
- [ ] Co-parent digest forwarding
- [ ] Task difficulty auto-adjustment
- [ ] Invite acceptance in-app notification (bell icon)

### Low Priority / Nice-to-Have
- [ ] XP spending animation (confetti on redemption)
- [ ] Reward streak bonuses (1.5x/2x multipliers)
- [ ] Decay immunity for recent certificate earners
- [ ] E2E browser tests (Playwright)
- [ ] i18n/localization support
- [ ] Mobile app (React Native)
- [ ] Video content pipeline (Mux/Cloudflare Stream)
- [ ] Real-time notifications via SSE

---

## 23. Security Considerations

### Implemented
- JWT session cookies with secure/httpOnly flags
- COPPA consent verification for under-13 accounts
- Admin impersonation audit logging
- Email suppression (bounce/complaint handling)
- Stripe webhook signature verification
- Test event detection (`evt_test_` prefix)
- Password hashing (bcrypt)
- CSRF protection via SameSite cookies
- Role-based access control (admin/user/student)
- Input validation via Zod schemas on all tRPC procedures

### Not Implemented (Recommended)
- Rate limiting (API-level)
- IP-based brute force protection
- Content Security Policy headers
- Database query parameterization audit
- Dependency vulnerability scanning (Snyk/Dependabot)
- Secrets rotation policy

---

## 24. Key Design Patterns

### XP Consistency Pattern
All XP changes flow through `awardXp()` in `server/gamification/xp.ts`:
```
awardXp(userId, amount, source, metadata)
  → INSERT into xpLedger
  → UPDATE studentLevels.totalXp += amount
  → Check level-up threshold
  → Return { newTotal, leveledUp, newLevel }
```

### Email De-duplication Pattern
```
sendEmail({ to, subject, html, referenceId: "prefix-{uniqueId}" })
  → Check emailLogs for existing referenceId
  → If found, skip (return false)
  → If not found, send via Resend → log to emailLogs
```

### Scheduled Job Pattern
```typescript
export async function handler(req: Request, res: Response) {
  // 1. Query for eligible records
  // 2. Process each (with error isolation per record)
  // 3. Log results
  // 4. Return { processed, skipped, errors }
}
```

### Parent-Child Data Access Pattern
```typescript
// Always verify parent owns the child before returning data
const children = await getChildrenForParent(ctx.user.id);
const childIds = children.map(c => c.id);
if (!childIds.includes(input.childId)) {
  throw new TRPCError({ code: 'FORBIDDEN' });
}
```

---

## 25. Logs & Monitoring

### Dev Server Logs
- Location: `.manus-logs/devserver.log`
- Contains: Server startup, Vite HMR, Express warnings
- Format: `[ISO timestamp] message`

### Browser Console Logs
- Location: `.manus-logs/browserConsole.log`
- Contains: Client-side console.log/warn/error with stack traces

### Network Request Logs
- Location: `.manus-logs/networkRequests.log`
- Contains: HTTP requests (fetch/XHR) with URL, status, duration

### Session Replay Logs
- Location: `.manus-logs/sessionReplay.log`
- Contains: User interaction events (clicks, focus, navigation)

### Accessing Logs
```bash
# Recent server errors
grep -i "error" .manus-logs/devserver.log | tail -20

# Failed network requests
grep "status.*[45][0-9][0-9]" .manus-logs/networkRequests.log | tail -20

# Client-side errors
grep "error\|Error" .manus-logs/browserConsole.log | tail -20
```

### Heartbeat Job Monitoring
```bash
# List all crons with status
manus-heartbeat list --project-path /home/ubuntu/educhamp

# Check specific job history
manus-heartbeat history --project-path /home/ubuntu/educhamp --task-uid <uid>
```

---

## 26. Quick Start for New AI Agents

### First Steps
1. Read this document for full context
2. Read `todo.md` for current feature status and pending items
3. Read `references/periodic-updates.md` for heartbeat cron setup
4. Check `.manus-logs/devserver.log` for any current errors
5. Run `npx vitest run` to verify all tests pass (expect 1,264+)

### Common Commands
```bash
cd /home/ubuntu/educhamp

# Check server status
webdev_check_status

# Run tests
npx vitest run

# Type check
npx tsc --noEmit --pretty

# List heartbeat crons
manus-heartbeat list --project-path .

# Generate migration after schema change
pnpm drizzle-kit generate

# Apply migration (use webdev_execute_sql tool with the SQL content)
```

### Important Rules
- **NEVER** use `pnpm drizzle-kit push` — always generate + apply SQL manually
- **NEVER** store images in `client/public/` — use `manus-upload-file --webdev`
- **NEVER** hardcode port numbers in server code
- **ALWAYS** flow XP through `awardXp()` — never update `studentLevels` directly
- **ALWAYS** use `referenceId` for email de-duplication in scheduled jobs
- **ALWAYS** verify parent-child relationship before returning child data
- **ALWAYS** add todo items before starting implementation
- **ALWAYS** mark todo items as `[x]` before saving checkpoints

### Architecture Constraints
- Single Node.js process (no workers, no child processes)
- 512 MiB RAM limit — avoid loading large datasets into memory
- 180s request timeout — long operations should be async
- Cold starts possible (min-instances=0) — keep startup fast
- No Python/Go/native binaries — Node.js only in production

---

*End of handoff document. For questions, refer to the sprint history in `todo.md` or the test files for behavioral specifications.*
