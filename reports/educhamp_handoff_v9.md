# EduChamp — Comprehensive Project Handoff Document

**Version:** 9.0
**Date:** June 11, 2026
**Checkpoint:** `7b05ac80` (current stable)
**Previous Handoff:** `educhamp_handoff_v8.md` (checkpoint `563a5c07` — June 1, 2026)
**Author:** Manus AI
**Repository:** [github.com/Pleks-Hub/educhamp](https://github.com/Pleks-Hub/educhamp) · branch `main`
**Deployed Domains:** `educhamp.app` · `educhamp.co` · `educhamp.manus.space`
**Test Suite:** 1,208 tests passing (47 files) · TypeScript: 0 errors · DB Migrations: 62 applied

> **How to use this document:** This is a cumulative handoff covering the full platform state as of checkpoint `7b05ac80`. It is designed for another AI agent, engineer, or development team to immediately understand the architecture, feature set, integrations, and recommended next steps without reading prior handoff versions. All pending tasks from the backlog are now marked complete — there are zero unchecked items in `todo.md`.

---

## Table of Contents

1. [Platform Overview & Objectives](#1-platform-overview--objectives)
2. [Technology Stack](#2-technology-stack)
3. [Architecture & File Structure](#3-architecture--file-structure)
4. [Database Schema (103 Tables)](#4-database-schema-103-tables)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Onboarding Flows](#6-onboarding-flows)
7. [Core Learning Features](#7-core-learning-features)
8. [Parent & Guardian Module](#8-parent--guardian-module)
9. [Admin Console](#9-admin-console)
10. [Billing & Subscription System](#10-billing--subscription-system)
11. [Gamification Engine](#11-gamification-engine)
12. [Email & Notification System](#12-email--notification-system)
13. [Scheduled Jobs (Heartbeat Crons)](#13-scheduled-jobs-heartbeat-crons)
14. [Landing Page & UI/UX Design System](#14-landing-page--uiux-design-system)
15. [Content & Curriculum Structure](#15-content--curriculum-structure)
16. [Compliance & Age Verification](#16-compliance--age-verification)
17. [API Integrations & Third-Party Services](#17-api-integrations--third-party-services)
18. [Testing & QA Status](#18-testing--qa-status)
19. [Known Issues & Limitations](#19-known-issues--limitations)
20. [Pending Enhancements & Roadmap](#20-pending-enhancements--roadmap)
21. [Environment Variables & Secrets](#21-environment-variables--secrets)
22. [Deployment & Infrastructure](#22-deployment--infrastructure)
23. [Sprint History (Condensed)](#23-sprint-history-condensed)
24. [Quick Reference Commands](#24-quick-reference-commands)

---

## 1. Platform Overview & Objectives

EduChamp is an AI-powered adaptive learning platform serving Pre-K through Grade 12+ students, with 75+ courses aligned to Texas Essential Knowledge and Skills (TEKS) standards. The platform delivers personalized learning paths through diagnostic placement tests, mastery-based progression, a multi-mode AI tutor (EduBot), comprehensive parent/guardian dashboards, and a full gamification engine.

**Core objectives:**

- Provide individualized, standards-aligned instruction that adapts to each student's demonstrated mastery level.
- Empower parents and guardians with real-time visibility into child progress, goal-setting tools, and actionable weekly digest emails.
- Maintain strict role separation (student, parent, admin) with COPPA compliance for children under 13.
- Support multi-course enrollment, cross-subject learning, and AP-level content for advanced students.
- Monetize through tiered subscription plans (Free, Family, Premium Family) via Stripe.

The platform supports three account types — **student**, **parent**, and **admin** — with strict role separation enforced at both the server and client layers. Parents manage one or more student accounts, track progress, set goals, and receive weekly digest emails. Students cannot self-register; they must use a parent-issued invite token. Administrators manage users, courses, content, billing, and platform settings through a dedicated admin console with 28 sections across 7 categories.

---

## 2. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 19.2.1 |
| Routing | Wouter | 3.7.1 (patched) |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix primitives) | Latest |
| State/Data | TanStack React Query + tRPC | 5.90 / 11.6 |
| Backend | Express.js | 4.21.2 |
| RPC Layer | tRPC | 11.6.0 |
| Database ORM | Drizzle ORM | 0.44.5 |
| Database | MySQL (TiDB — managed) | — |
| Authentication | Manus OAuth + JWT sessions | — |
| Payments | Stripe (Checkout + Subscriptions) | 22.1.1 |
| Email | Resend (primary) + SMTP + SendGrid | 6.12.4 |
| AI/LLM | Manus Forge API (GPT-4 class) | Built-in |
| Image Generation | Manus Forge ImageService | Built-in |
| Voice Transcription | Whisper API via Forge | Built-in |
| Build Tool | Vite | Latest |
| Testing | Vitest | 2.1.9 |
| Validation | Zod | 4.1.12 |
| Runtime | Node.js | 22.13.0 |
| Package Manager | pnpm | Latest |
| PDF Generation | PDFKit + QRCode | — |
| 2FA | Speakeasy (TOTP) | — |
| Markdown Rendering | Streamdown | — |
| PWA | vite-plugin-pwa | — |

---

## 3. Architecture & File Structure

The project follows a monorepo structure with a shared type system between client and server, connected via tRPC for end-to-end type safety. The entire application runs as a single Node.js process on Cloud Run.

```
educhamp/
├── client/                          # React 19 SPA
│   ├── src/
│   │   ├── pages/                   # 56 page components
│   │   ├── components/              # Reusable UI (shadcn/ui + custom)
│   │   │   └── ui/                  # 50+ shadcn/ui primitives
│   │   ├── contexts/                # ThemeContext, PaletteContext, CelebrationProvider
│   │   ├── hooks/                   # Custom hooks (useAuth, useMobile, useComposition, usePersistFn)
│   │   ├── lib/                     # tRPC client, utilities
│   │   ├── App.tsx                  # Route definitions (wouter) — 56 routes
│   │   ├── main.tsx                 # Providers wrapper
│   │   └── index.css                # Global theme (OKLCH tokens, Tailwind 4)
│   └── index.html                   # Entry point (Google Fonts CDN, PWA manifest)
├── server/
│   ├── _core/                       # Framework plumbing (DO NOT EDIT)
│   │   ├── index.ts                 # Express app + route registration + middleware
│   │   ├── context.ts               # tRPC context builder
│   │   ├── trpc.ts                  # Procedure definitions (public, protected, admin, student)
│   │   ├── llm.ts                   # LLM invocation helper
│   │   ├── oauth.ts                 # Manus OAuth handler
│   │   ├── heartbeat.ts             # Scheduled job registration
│   │   ├── notification.ts          # Owner notification helper
│   │   ├── imageGeneration.ts       # Image generation helper
│   │   ├── voiceTranscription.ts    # Whisper transcription helper
│   │   ├── storageProxy.ts          # S3 storage proxy
│   │   ├── env.ts                   # Environment variable definitions
│   │   └── sdk.ts                   # Manus SDK client
│   ├── routers/                     # 23 tRPC router modules
│   ├── scheduled/                   # 10 heartbeat handlers
│   ├── emailTemplates/              # 20 HTML email templates
│   ├── emailService.ts              # Provider abstraction (Resend/SMTP/SendGrid)
│   ├── stripe.ts                    # Stripe helpers, PLANS, coupon logic
│   ├── db.ts                        # 250+ query helper functions
│   ├── routers.ts                   # AppRouter composition (merges all 23 routers)
│   ├── storage.ts                   # S3 storage helpers (storagePut, storageGet)
│   └── *.test.ts                    # 47 test files (1,208 tests)
├── drizzle/
│   ├── schema.ts                    # 103 tables (2,246 lines)
│   ├── relations.ts                 # Table relationships
│   └── 0000–0061/                   # 62 migration SQL files
├── shared/                          # Shared types & constants
│   ├── const.ts                     # Shared constants
│   └── types.ts                     # Shared TypeScript types
├── reports/                         # Handoff docs, QA reports, feature docs
├── references/                      # periodic-updates.md
├── todo.md                          # Master task tracker (3,057 lines, all complete)
└── package.json                     # Scripts, dependencies
```

**Key architectural decisions:**

- All backend logic is exposed exclusively through tRPC procedures — no raw REST endpoints except OAuth callback, Stripe webhook, Resend/email webhooks, and scheduled job handlers.
- The `protectedProcedure` middleware injects `ctx.user` from the JWT session cookie. A `studentProcedure` variant additionally blocks parent-typed accounts from student-only routes. An `adminProcedure` checks `ctx.user.role === 'admin'`.
- Superjson serialization means Drizzle rows (with `Date` objects) can be returned directly from procedures without manual transformation.
- The single Express process serves both the Vite dev server (in development) and the built SPA + API (in production via Cloud Run).
- Rate limiting is applied to 2FA challenges (10 per 15 min), general API (via `apiLimiter`), AI tutor streaming, and landing page chat.
- Helmet security headers are enabled with CSP disabled and `crossOriginEmbedderPolicy: false` for compatibility.
- Raw body parsing for Stripe and Resend webhooks is registered before `express.json()` to preserve signature verification.

---

## 4. Database Schema (103 Tables)

The database is organized into logical domains across 103 MySQL tables managed via Drizzle ORM with 62 applied migrations. Below is a categorized summary:

### Core Learning (12 tables)

| Table | Purpose |
|-------|---------|
| `users` | All accounts (student, parent, admin) with role, accountType, grade, status, DOB |
| `courses` | 75+ courses with subject, gradeLevel, teksCode, minAgeRequirement, timedExam settings |
| `units` | Course units (12 per course) with courseId FK, unitNumber, title, description |
| `lessons` | Lesson content with explanations, worked examples, problems, misconceptions, videoUrl |
| `skills` | Skill tags per unit (ALG1-U1-S1 format) with prerequisites |
| `quizQuestions` | Quiz bank per unit (easy/medium/hard/challenge difficulty) |
| `diagnosticQuestions` | Diagnostic assessment bank (57+ questions, Bank A + Bank B) |
| `userMastery` | Per-user per-unit mastery scores (0–100) |
| `unitProgress` | Unit completion tracking (started, completed, timestamps) |
| `lessonProgress` | Lesson completion tracking |
| `quizAttempts` | Quiz submission history with scores |
| `diagnosticAttempts` | Diagnostic placement test results |

### AI Tutor (2 tables)

| Table | Purpose |
|-------|---------|
| `tutorSessions` | AI Tutor chat session history (mode, unit context, timestamps) |
| `chatSessions` / `chatMessages` | Admin live chat system |

### Parent & Guardian (9 tables)

| Table | Purpose |
|-------|---------|
| `parentChildren` | Parent-child relationships (nickname, gradeLevel, relationship) |
| `coParentInvitations` | Co-parent invite tokens (7-day expiry) |
| `coParentAccess` | Active co-parent view access grants |
| `parentGoals` | Parent-set learning goals per child |
| `parentNotes` | Private parent notes per child |
| `parentInviteTokens` | Student-to-parent invitation tokens (reverse direction) |
| `studentInviteTokens` | Parent-issued student registration tokens (with tracking: lastResentAt, reminderSentAt, acceptedAt) |
| `parentalConsents` | COPPA parental consent records |
| `billingDelegations` | Billing responsibility delegation tokens |

### Authentication & Security (4 tables)

| Table | Purpose |
|-------|---------|
| `passwordResetTokens` | Password reset flow tokens |
| `twoFactorAuth` | TOTP 2FA secrets + backup codes |
| `userSessions` | Active session tracking for admin impersonation |
| `adminImpersonationSessions` | Impersonation audit trail |

### Admin & Platform (11 tables)

| Table | Purpose |
|-------|---------|
| `userCourseEnrollments` | Student course enrollment records (userId + courseId unique) |
| `platformSettings` | Key-value platform configuration (JSON values, categorized) |
| `adminAuditLog` | All admin actions with IP, timestamp, details JSON |
| `adminRoles` | Custom admin role definitions |
| `rolePermissions` | Permission grants per role |
| `adminRoleAssignments` | Role-to-user assignments |
| `cmsContent` | CMS content blocks (landing page, FAQ, etc.) |
| `cmsContentHistory` | CMS version history |
| `demoRequests` | School/district demo request submissions |
| `courseRequests` | User-submitted course requests |
| `questionFlags` | Student-flagged quiz questions for review |

### Billing & Payments (4 tables)

| Table | Purpose |
|-------|---------|
| `subscriptions` | Active subscriptions (stripeSubscriptionId, plan, status, card details) |
| `coupons` | Discount codes (percentage/fixed, duration, limits) |
| `couponRedemptions` | Coupon usage tracking |
| `paymentAuditLog` | All payment events (webhook-driven) |

### Email & Notifications (9 tables)

| Table | Purpose |
|-------|---------|
| `emailLogs` | Sent email history with status |
| `emailLogsArchive` | Archived email logs |
| `emailSettings` | Provider configuration (AES-256-GCM encrypted) |
| `emailSuppression` | Bounced/complained addresses |
| `suppressionAuditLog` | Suppression list changes |
| `userNotifications` | In-app notification queue |
| `newsletterSubscriptions` | Newsletter subscriber list |
| `newsletterCampaigns` | Newsletter campaign history |
| `inactivityNotifications` | Inactivity reminder tracking |

### Gamification (14 tables)

| Table | Purpose |
|-------|---------|
| `xpLedger` | XP transaction log (source, amount, timestamp) |
| `studentLevels` | Current level + total XP per student |
| `badges` | Badge definitions (criteria, icon, tier) |
| `userBadges` | Earned badges per student |
| `quests` | Quest/challenge definitions |
| `userQuests` | Quest progress tracking |
| `streaks` | Daily login/activity streaks |
| `houses` | House system (4 houses) |
| `userHouses` | House membership |
| `seasonalChallenges` | Time-limited seasonal events |
| `userSeasonalProgress` | Seasonal challenge progress |
| `rewardsMarketplace` | Redeemable rewards catalog |
| `rewardRedemptions` | Reward redemption history |
| `userAvatars` | Avatar customization |

### Standards & Curriculum Mapping (7 tables)

| Table | Purpose |
|-------|---------|
| `standardFrameworks` | Standard framework definitions (TEKS, Common Core, etc.) |
| `standards` | Individual standard entries |
| `standardCrosswalk` | Cross-framework standard mappings |
| `unitStandards` | Unit-to-standard alignments |
| `learningObjectives` | Granular learning objectives |
| `objectivePrerequisites` | Prerequisite chains |
| `assessmentTemplates` | Assessment generation templates |

### Geography & Schools (8 tables)

| Table | Purpose |
|-------|---------|
| `countries` | Country reference data |
| `states` | State/province reference data |
| `districts` | School district data |
| `schools` | Individual school records |
| `tracks` | Academic track definitions |
| `pacingGuides` | Pacing guide configurations |
| `pacingWindows` | Pacing window time ranges |
| `resourceAdoptions` | District resource adoption records |

### Task Management (5 tables)

| Table | Purpose |
|-------|---------|
| `parentTasks` | Parent-assigned tasks with recurrence, due dates, proof requirements, reward XP |
| `taskCompletions` | Student task completion records with proof URLs |
| `taskTemplates` | Custom parent task templates |
| `sharedTasks` | Sibling-shared task assignments |
| `familyActivityFeed` | Shared family activity feed events (fan-out per parent) |

### Other (18 tables)

| Table | Purpose |
|-------|---------|
| `userProfiles` | Extended demographics, onboarding state, notification preferences, activityPreference, languageLevel |
| `referrals` | Referral codes with click/signup counts |
| `referralSignups` | Referral attribution records |
| `courseCertificates` | Issued completion certificates |
| `masteryRecords` | Historical mastery snapshots |
| `enrollmentContexts` | Enrollment context metadata |
| `weeklyChallenges` | Weekly challenge definitions |
| `weeklyChallengeParts` | Weekly challenge part progress |
| `learningPlans` | Student learning plan configurations |
| `learningPlanBlocks` | Study block schedules within plans |
| `focusSessions` | Focus mode timer sessions |
| `newsletterSubscriptions` | Newsletter subscriber list |

---

## 5. Authentication & Authorization

The platform uses **Manus OAuth** for authentication with JWT session cookies for state management.

**Account types and roles:**

| Account Type | Role | Access |
|-------------|------|--------|
| `student` | `user` | Curriculum, quizzes, diagnostic, AI tutor, progress, gamification, tasks, focus mode |
| `parent` | `parent` | Parent dashboard, child management, co-parent invites, billing, reports, tasks, insights |
| `admin` | `admin` | Full admin console (28 sections), user management, content, settings, impersonation |

**Key enforcement rules:**

- Parent accounts are **hard-blocked** from quiz, diagnostic, and mastery accumulation routes (server-side `studentProcedure`).
- Student accounts cannot access parent dashboard or co-parent features.
- Admin routes use `adminProcedure` which checks `ctx.user.role === 'admin'`.
- Students cannot self-register; they must use a parent-issued invite token.
- 2FA (TOTP) is optional for all account types with rate-limited challenge endpoint (10 attempts per 15 min).
- Admin impersonation creates an audit trail and uses a separate session token with visible banner.
- Password reset uses time-limited tokens sent via email.

**OAuth flow:**

1. Frontend calls `getLoginUrl(returnPath)` which encodes `window.location.origin` + return path in OAuth state.
2. Manus OAuth redirects to `/api/oauth/callback` which extracts origin from state for the final redirect.
3. Session cookie is set with JWT containing user ID and role.
4. `useAuth()` hook provides current user state; `trpc.auth.me.useQuery()` validates session.

---

## 6. Onboarding Flows

### Parent Onboarding (`/onboarding/parent`)

A multi-step wizard that collects:
1. Account type confirmation (parent/guardian)
2. Signup reason (grade improvement, test prep, enrichment, remediation, homeschool supplement)
3. Goal category selection with AI-generated personalized goal statement
4. Child information (name, email, grade level)
5. Activity preference selection (general, reading, math games, hands-on, outdoor, creative)
6. Color palette personalization

Upon completion, a student invite token is generated and emailed to the child.

### Student Onboarding (`/onboarding/student`)

Triggered when a student accepts a parent invite token:
1. Account creation via invite token validation
2. Preferred name and display name collection
3. Grade level confirmation (pre-filled from parent's invite)
4. Course enrollment (auto-populated by grade, customizable)
5. Diagnostic placement test recommendation
6. AI welcome message generation

### Student Setup (`/student-setup`)

A simplified flow for students who already have accounts but need to complete profile setup (password creation, course selection).

### Referral Flow (`/join`)

Users arriving via referral links are routed through a role-selection modal, then into the appropriate onboarding wizard. Referral attribution is tracked in `referrals` and `referralSignups` tables.

---

## 7. Core Learning Features

### Curriculum Browser (`/curriculum`, `/curriculum/unit/:unitNumber`, `/curriculum/unit/:unitNumber/lesson/:lessonId`)

Each course contains 12 units with 9 lessons per unit. Lessons include structured content: explanations, TEKS alignment, worked examples, guided practice problems (with progressive hints), independent practice problems (with solution reveal), and common misconceptions. A `videoUrl` field supports embedded video lessons (YouTube/MP4/iframe). The curriculum page shows unit cards with mastery progress bars and lock/unlock states based on adaptive path logic.

### AI Tutor — EduBot (`/tutor`)

Six modes: **Teach**, **Practice**, **Quiz**, **Exam Review**, **Remediation**, **Parent Summary**. The tutor uses streaming SSE responses via `/api/tutor/stream`. System prompts are context-aware, injecting the student's mastery scores, current unit/lesson, diagnostic placement, parent goals, demographics, language level, and parent-led mode status. The tutor adapts difficulty based on per-skill mastery levels and respects the `isEarlyChildhoodCourse` check to adjust vocabulary complexity.

### Diagnostic Assessment (`/diagnostic`, `/diagnostic/early`)

A 30-question adaptive placement test (6 prerequisite + 24 unit questions) drawn from a 57-question bank using seeded Fisher-Yates shuffle. Each retest draws different questions. Results determine unit-by-unit placement recommendations with per-course cooldown periods (`diagnosticCooldownDays`). An early-learner variant exists for Pre-K/Kindergarten students with simplified UI and parent-led mode support.

### Quiz Engine (`/curriculum/unit/:unitNumber/quiz`)

15 questions per unit quiz (5 easy, 5 medium, 3 hard, 2 challenge). Automatic mastery score updates after completion. Adaptive path unlock logic: below 60% triggers reteach, 60–74% guided practice, 75–89% unlocks next quiz, 90%+ unlocks challenge content. Timed exam mode available for courses with `isTimedExam: true`.

### Progress & Mastery (`/progress`, `/skills`)

Skill-level mastery charts (bar charts per unit), unit completion timeline, mastery level labels (Beginner → Advanced), and a full skill index page showing all skill IDs with prerequisites. Historical mastery snapshots stored in `masteryRecords` for trend analysis.

### Practice Weak Skills (`/practice`)

Pulls questions from skills below a student's mastery threshold to help students focus on areas needing improvement. Integrates with XP awards and streak tracking.

### Course Completion Certificates (`/certificates`, `/certificate/:token`)

Students who achieve 90%+ mastery across all units of a course earn a completion certificate. Certificates are generated as PDFs (via PDFKit + QRCode) with a public shareable URL and stored in S3.

### Exam Prep (`/exam-prep`)

Timed exam practice mode with the AI tutor focused on test-taking strategies and time management.

### Learning Plan (`/learning-plan`)

Personalized study schedules with configurable study blocks. Students set preferred study times and the system sends reminders via the hourly `learning-plan-reminder` heartbeat job.

### Focus Mode (`/focus-mode`)

A distraction-free timer interface for focused study sessions. Sessions are tracked in `focusSessions` for analytics and XP awards.

### Course Catalog (`/courses`)

Browse all 75+ courses organized by subject and grade level. Courses display TEKS alignment, age requirements, and enrollment status. Auto-populated by grade with parent customization.

---

## 8. Parent & Guardian Module

### Parent Dashboard (`/parent`)

Multi-child management with tab-based child switcher. Per-child views include:

- **Progress Overview** — mastery by unit, quiz scores, placement results, adaptive path status
- **Skill Gap Analysis** — skills below 75% with priority ranking
- **Study Goals** — set/track goals per child with AI-generated goal alignment
- **Parent Notes** — private notes per child
- **Learning Insights** — time trends, improvement rate, quiz score history
- **Export Report** — CSV download + print-to-PDF
- **Certificates** — view/download child's earned certificates with public share links
- **Tasks Panel** — assign, track, confirm/reject task completions with XP rewards
- **Sent Invites** — timeline view showing sent/resent/accepted/expires status for each invite

### Parent Insights (`/parent-insights`)

Dedicated analytics page with deeper engagement metrics, mastery trend charts, and AI-generated recommendations per child.

### Family Feed (`/family-feed`)

Shared activity feed displaying recent task completions, badges earned, challenges won, and milestones across all siblings. Events are fanned out per parent via `familyActivityFeed` table.

### Co-Parent System

Primary parents can invite co-parents/guardians via email. Co-parents get read-only access to the same progress dashboard. Invitations expire after 7 days and can be revoked. Managed via `coParentInvitations` and `coParentAccess` tables.

### Student Invite Lifecycle

The full invite lifecycle is tracked with timestamps:
1. **Created** — parent creates invite, token generated, email sent to child
2. **Resent** — parent can resend (revokes old token, issues new 7-day token)
3. **Reminder** — automated email 24h before expiry (if `inviteRemindersEnabled`)
4. **Accepted** — student uses token to create account; parent receives acceptance email
5. **Expired** — auto-marked by daily `student-invite-auto-expire` job

### Weekly Digest Emails

Every Monday at 8 AM UTC, parents receive a digest email summarizing each child's weekly activity: lessons completed, quiz scores, mastery progress, tasks completed, XP earned, badges unlocked, streak status, on-track status, and a tailored at-home activity suggestion. Features include:

- **Celebration badges** — golden trophy badge when a child achieves a perfect 100% quiz score or masters new skills
- **Activity preference customization** — parents choose from 6 focus areas and the digest tailors suggestions accordingly
- **Preview Digest** — parents can preview the next digest email from their Profile page
- **Opt-out** — toggle in Email Notifications settings page (`weeklyDigestEnabled`)

### Notification Preferences (`/settings/notifications`)

Parents can manage email notification preferences including:
- Weekly Progress Summary (digest) opt-in/out
- Invite expiry reminder emails opt-in/out
- Activity preference selection (general, reading, math games, hands-on, outdoor, creative)

### Task Management

Parents can assign tasks to children with:
- Due dates and recurrence patterns
- Proof requirements (photo/text)
- XP rewards and bonus XP for early completion
- Task templates for reuse
- Sibling task delegation (shared tasks)
- Difficulty auto-adjustment suggestions based on completion patterns

### Exportable Weekly PDF Reports (`/parent` → Export)

Downloadable PDF reports summarizing each child's weekly progress for sharing with teachers or co-parents.


---

## 9. Admin Console

The admin console (`/admin`) uses a standalone layout (no student sidebar) with a left sidebar navigation organized into 7 categories and 28 sections:

### Admin Navigation Structure

| Category | Sections |
|----------|----------|
| **Dashboard** | Overview (stats: users, sessions, diagnostics, quizzes, courses, revenue) |
| **Users & Access** | Users, Invites, Grade Management, Roles & Permissions (RBAC), Inactivity Monitor |
| **Content** | Courses, CMS, Gamification, Flagged Questions, Course Requests |
| **Finance** | Subscriptions, Cards & Transactions, Payment Analytics, Coupons, Billing Exemptions |
| **Email** | Email Settings, Email Logs, Suppression List |
| **Compliance & Safety** | Audit Log, District Transfer, Demo Requests |
| **System** | Platform Settings, System Health, Alert Webhooks |

### Key Admin Features

- **User Management** — search, filter, role/account-type edit, user detail view with full history
- **Impersonation** — admins can impersonate any user with full audit trail and a visible banner; session revocation supported
- **Invite Management** — stats cards, filterable table, bulk resend/revoke actions, weekly conversion chart (AreaChart)
- **Grade Management** — bulk grade promotion, manual grade adjustments
- **RBAC** — custom role definitions with granular permissions, role assignments
- **Email Service Management** — provider switching (Resend/SMTP/SendGrid), health dashboard, AES-256-GCM encrypted credentials
- **Email Logs** — filterable log viewer with status, recipient, template, timestamp
- **Newsletter Console** (`/admin/newsletter`) — compose, schedule, send campaigns to subscriber segments (all, students, parents, landing_page)
- **Chat Management** (`/admin/chat`) — admin live chat system
- **Question Flag Review** — review student-flagged quiz questions, mark resolved, send resolution notification email
- **Course Management** — CRUD courses, unit management, content editing
- **CMS** — content blocks for landing page, FAQ, and other static content with version history
- **Payment Analytics** — revenue charts, subscription metrics, churn analysis
- **Billing Exemptions** — exempt specific users from billing requirements
- **Badge Counters** — live sidebar counts for flagged questions, demo requests, suppression list (auto-refresh 60s)
- **System Health** — server metrics, database status, API health checks, sparkline charts
- **Alert Webhooks** — configurable webhook endpoints for system alerts
- **District Transfer** — manage student transfers between school districts
- **Platform Settings** — key-value configuration with categories (general, features, notifications, ai, enrollment)
- **Audit Log** — complete admin action history with IP, timestamp, details, filterable by action type

---

## 10. Billing & Subscription System

### Pricing Plans

| Plan | Monthly | Annual | Max Students | Key Features |
|------|---------|--------|-------------|--------------|
| **Free** | $0 | $0 | 1 | All courses, limited AI Tutor, basic progress |
| **Family** | $19.99 | $15.99/mo | 3 | Unlimited AI Tutor, adaptive quizzes, parent dashboard |
| **Premium Family** | $29.99 | $23.99/mo | 5 | All Family + AP courses, exam prep, priority AI, co-parent |

### Implementation

- **Stripe Checkout** for subscription creation with promotion code support (`allow_promotion_codes: true`)
- **Card-on-file** requirement (even for free plan) via Stripe Setup Intents
- **Billing delegation** — parents can delegate billing to another email address
- **Billing Setup Flow** (`/billing/setup`) — guided flow for parents and age-appropriate students
- **Admin subscription management** — suspend, resume, status update, manual creation
- **Payment audit log** — all Stripe webhook events logged with type, amount, timestamp
- **Invoice/receipt download** — Stripe-hosted PDF invoices accessible from billing page
- **Payment history** — filterable by date range, sortable by date/amount
- **Card expiry reminders** — daily heartbeat checks for cards expiring within 30 days
- **Parent billing reminders** — re-sends billing notification to parents who haven't completed setup within 48h
- **Coupon system** — percentage/fixed discounts, duration (once/repeating/forever), usage limits, admin CRUD
- **Billing exemptions** — admin can exempt specific users from billing requirements
- **Escalation path** — `billingEscalatedAt` field tracks when billing reminders exceed 7 days without parent action

### Stripe Webhook (`/api/stripe/webhook`)

Handles: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `payment_intent.succeeded`. Test events (ID starting with `evt_test_`) return `{ verified: true }`.

### Checkout Flow

1. Server creates Stripe Checkout Session with `client_reference_id`, `metadata.user_id`, `customer_email`
2. Frontend opens checkout URL in new tab via `window.open(checkoutUrl, '_blank')`
3. Toast notification indicates redirect
4. On success, webhook processes `checkout.session.completed` and links subscription to user
5. Success page (`/checkout/success`) confirms activation

---

## 11. Gamification Engine

The gamification system provides comprehensive engagement mechanics for students:

- **XP & Levels** — XP earned from lessons, quizzes, streaks, task completions; level-up thresholds with celebrations
- **Badges** — achievement badges (auto-seeded defaults + admin-created custom); criteria-based auto-award
- **Quests** — multi-step challenges with progress tracking and XP rewards
- **Streaks** — daily activity streaks with freeze tokens; at-risk banner when streak is about to break
- **Houses** — 4-house system with collective point competition
- **Seasonal Challenges** — time-limited events with unique rewards and progress tracking
- **Rewards Marketplace** (`/rewards`) — redeem XP for avatar items, themes, etc.
- **Adventure Map** (`/adventure-map`) — visual progression through curriculum
- **Gamification Hub** (`/gamification`) — central dashboard for all gamification features
- **Weekly Challenges** — recurring weekly challenges with multi-part structure
- **Streak Leaderboard** (`/streak-leaderboard`) — competitive streak rankings
- **Task Leaderboard** (`/task-leaderboard`) — XP leaderboard from task completions
- **Streak Milestone Rewards** — bonus rewards at streak milestones (7, 30, 100 days)
- **Celebration Overlay** — confetti/animation when achievements are unlocked (respects `disableAnimations` preference)

---

## 12. Email & Notification System

### Email Service Architecture

The email system uses a provider abstraction layer supporting three backends:

| Provider | Status | Configuration |
|----------|--------|---------------|
| **Resend** | Active (primary) | API key via `RESEND_API_KEY`, from address via `RESEND_FROM_EMAIL` |
| **SMTP** | Available | Host/port/auth via admin settings (AES-256-GCM encrypted) |
| **SendGrid** | Available | API key via admin settings (AES-256-GCM encrypted) |

Provider credentials are stored AES-256-GCM encrypted in the `emailSettings` table. The admin can switch providers from the Email Service Health dashboard.

### Email Templates (20)

| Template | Trigger |
|----------|---------|
| `weeklyParentDigest` | Monday 8 AM UTC heartbeat (tasks, XP, badges, mastery, streaks, activity suggestions) |
| `weeklyStudentReviewSummary` | Monday 9 AM UTC heartbeat (due reviews, streak status) |
| `cardExpiry` | Daily heartbeat (cards expiring in 30 days) |
| `coppaConsentRequest` | Parent enrolls child under 13 |
| `courseRequestNotification` | User submits course request |
| `flagResolutionNotification` | Admin resolves flagged question |
| `inactivityNotification` | 7-day inactivity heartbeat |
| `inviteAccepted` | Student accepts parent's invite token (new in Sprint 36) |
| `learningPlanReminder` | Hourly heartbeat (upcoming study blocks) |
| `parentBillingNotification` | Child requests billing setup from parent |
| `parentInvite` | Parent invites co-parent |
| `passwordReset` | Password reset request |
| `pendingCourseRequestDigest` | Admin digest of pending course requests |
| `studentActivated` | Student account activated |
| `studentSetup` | Student setup link email |
| `trialExpiry` | Trial period ending |
| `trialReminder` | Trial reminder (3 days before) |
| `trialWelcome` | New user signup |
| `billingActivatedStudent` | Billing activated notification for students |
| `emailBase` | Shared HTML wrapper (brand header/footer) |

### Email Suppression

Bounce/complaint handling via Resend webhooks (`/api/webhooks/resend`). Suppressed addresses are blocked from future sends. Admin can view, manage, and audit the suppression list with breakdown tooltip. Suppression audit log tracks all changes.

### In-App Notifications

`userNotifications` table provides an in-app notification queue. Parent dashboard polls every 60 seconds for new notifications via the notification bell icon.

### Student Email Preferences (`/settings/notifications`)

Students can independently control:
- Progress digest emails (`emailDigestEnabled`)
- Achievement/badge emails (`emailAchievementsEnabled`)
- Inactivity/reminder emails (`emailRemindersEnabled`)

---

## 13. Scheduled Jobs (Heartbeat Crons)

All scheduled jobs use the Manus Heartbeat system (cron-based HTTP POST to registered endpoints). Currently 10 active crons:

| Job | Schedule | Endpoint | Purpose |
|-----|----------|----------|---------|
| Weekly Parent Digest | Monday 8 AM UTC | `/api/scheduled/weekly-parent-digest` | Send digest emails to all opted-in parents (tasks, XP, badges, mastery, streaks) |
| Weekly Student Review Summary | Monday 9 AM UTC | `/api/scheduled/weekly-student-review-summary` | Email students with due reviews and streak status |
| Card Expiry Reminder | Daily 9 AM UTC | `/api/scheduled/card-expiry-reminder` | Email parents/students whose card expires within 30 days |
| Inactivity Monitor | Daily 4 AM UTC | `/api/scheduled/inactivity-monitor` | Flag students inactive 7+ days, notify parents |
| Invite Expiry | Daily 2 AM UTC | `/api/scheduled/invite-expiry` | Expire pending parent invite tokens older than 7 days |
| Student Invite Auto-Expire | Daily 8 AM UTC | `/api/scheduled/student-invite-auto-expire` | Mark expired student invite tokens as "expired" in DB |
| Invite Expiry Reminder | Daily 9 AM UTC | `/api/scheduled/inviteExpiryReminder` | Email parents 24h before student invite expires |
| Grade Promotion | Monthly 1st 3 AM UTC | `/api/scheduled/grade-promotion` | Auto-promote students who completed all units |
| Parent Billing Reminder | Every 12 hours | `/api/scheduled/parent-billing-reminder` | Re-send billing notification after 48h without setup |
| Learning Plan Reminder | Hourly | `/api/scheduled/learning-plan-reminder` | Check upcoming study blocks, send email reminders |
| Pending Course Request Digest | (Configured) | `/api/scheduled/pending-course-request-digest` | Admin digest of unresolved course requests |

All handlers authenticate the heartbeat request before processing and return structured JSON responses with processed/sent/skipped counters for monitoring.

---

## 14. Landing Page & UI/UX Design System

### Landing Page (`/landing`)

The public marketing page includes:
- **Hero section** with animated headline, CTA buttons, and live platform stats
- **Features showcase** — adaptive learning, AI tutor, parent dashboard, gamification
- **How it works** — 3-step visual guide
- **Testimonials** — social proof carousel
- **Pricing section** — plan comparison with checkout integration
- **Newsletter signup** — email capture with `newsletterSubscriptions` table
- **AI Chatbot** — embedded landing-page chat with session creation, follow-up lead capture, and quick prompts
- **Role-selection modal** — routes to parent or student onboarding
- **Demo request modal** — school/district demo submissions

### Theme & Design System

- **Color system:** OKLCH tokens in CSS variables (light theme default with dark mode support)
- **Typography:** Inter (body) + Lora (headings) via Google Fonts CDN
- **Component library:** shadcn/ui (50+ Radix primitives) with Tailwind CSS 4
- **Animations:** Snappy ease-out transitions (180ms dropdowns, 100–160ms buttons), `prefers-reduced-motion` respected
- **Color palette personalization:** Students can choose from multiple color palettes (stored in `userProfiles.colorPalette`)
- **Celebration overlay:** Confetti/animation provider with opt-out (`disableAnimations`, `disableSound`)

### Layout Patterns

- **Student views:** DashboardLayout with left sidebar (Dashboard, Curriculum, AI Tutor, Diagnostic, Progress, Skills, Practice, Gamification, Tasks, Focus Mode, Leaderboards, etc.)
- **Parent views:** Same DashboardLayout with parent-specific nav items (Parent Dashboard, Insights, Family Feed, Billing, Notifications)
- **Admin console:** Standalone layout with categorized left sidebar (28 sections in 7 groups)
- **Public pages:** Custom top navigation (Landing, Courses, Pricing, FAQ, Schools)

### Responsive Design & Mobile Optimization

Mobile-first with Tailwind breakpoints. Key mobile optimizations:
- Touch targets: min-height 44px on touch devices via `@media (pointer: coarse)`
- TabsTrigger: min-h-[40px] on mobile
- SelectTrigger: h-10 on mobile
- Action buttons: min-h-[40px/44px] on mobile
- iOS Safari fixes applied
- PWA support via `vite-plugin-pwa`

### Page Inventory (56 pages)

The frontend contains 56 page components covering: AcceptInvite, AdminDashboard, AdventureMap, Billing, BillingSetup, CertificatePage, Certificates, ChatManagement, CheckoutSuccess, ComponentShowcase, ConsentApproval, CoppaConsentWaiting, CourseCatalog, CourseRequestResult, CourseWelcome, Curriculum, Diagnostic, EarlyDiagnostic, ExamPrep, FamilyFeed, FocusMode, ForgotPassword, GamificationHub, Home, JoinPage, LandingPage, LearningPlan, LessonDetail, MyTasks, NewsletterConsole, NotFound, ParentDashboard, ParentInsights, ParentOnboarding, PracticeWeakSkills, Profile, Progress, Quiz, Referrals, ResetPassword, RewardsMarketplace, SharedTasks, SignIn, Skills, StreakLeaderboard, StudentForgotPassword, StudentLogin, StudentNotifications, StudentOnboarding, StudentSetup, StudentWelcome, TaskCalendar, TaskLeaderboard, Tutor, UnitDetail, Verify2FA.

---

## 15. Content & Curriculum Structure

### Course Catalog

The platform hosts **75+ courses** spanning Pre-K through Grade 12+ including AP courses. Each course contains 12 units with 9 lessons per unit, totaling approximately **8,100 lessons** across **900+ units**.

### Subject Coverage

| Grade Band | Subjects |
|-----------|----------|
| Pre-K – Grade 2 | Math, ELA, Science, Social Studies |
| Grade 3 – Grade 5 | Math, ELA, Science, Social Studies |
| Grade 6 – Grade 8 | Math, English, Science, Social Studies |
| Grade 9 – Grade 12 | Algebra I/II, Geometry, English I–IV, Biology, Chemistry, Physics, World History, US History, Spanish 1–4, and more |
| AP | Human Geography, Calculus AB/BC, Chemistry, Biology, US History, English Language, English Literature, and more |

### Content Structure Per Lesson

Each lesson contains structured JSON content:
- **Explanation** — core concept teaching
- **TEKS Alignment** — Texas standard reference code
- **Worked Examples** — step-by-step solutions (2–3 per lesson)
- **Guided Practice** — problems with progressive hints (3–5 per lesson)
- **Independent Practice** — problems with solution reveal (3–5 per lesson)
- **Common Misconceptions** — typical errors and corrections
- **Video URL** (optional) — embedded video lesson (stubs for most courses)

### Diagnostic Question Bank

57 questions organized as Bank A (original 30) + Bank B (27 additional) ensuring unique retests via seeded Fisher-Yates shuffle. Per-course `diagnosticCooldownDays` prevents excessive retesting.

### Quiz Question Bank

15 questions per unit quiz distributed by difficulty: 5 easy, 5 medium, 3 hard, 2 challenge. Lower-grade courses (Pre-K through Grade 2) have increased question density for more variety.

---

## 16. Compliance & Age Verification

### COPPA Compliance

- **Compulsory DOB** collection for all sign-ups
- **Age-based hard block** — children under 13 require verified parental consent before accessing the platform
- **Consent flow** — parent receives email with approve/deny links; child sees waiting screen (`/consent/waiting`) until approved
- **State-aware age-of-majority** — guardian age verification uses state-specific thresholds (18 or 19 depending on state)
- **Consent records** — stored in `parentalConsents` table with approval/denial timestamps

### Course Age Gating

- `minAgeRequirement` column on courses table (used for AP/advanced courses)
- Server-side enforcement in `enrollUserInCourse` — throws `AGE_GATE:N` error
- Client-side amber badge "Age X+ required" with disabled enrol button for underage students

### Data Privacy

- No storage of full card numbers, CVV, or card expiration dates (Stripe handles PCI compliance)
- Email provider credentials encrypted with AES-256-GCM
- Admin audit log tracks all sensitive operations
- Suppression list prevents emails to bounced/complained addresses


---

## 17. API Integrations & Third-Party Services

| Integration | Purpose | Configuration | Notes |
|------------|---------|---------------|-------|
| **Manus OAuth** | Authentication | `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | JWT session cookies, origin-aware redirects |
| **Manus Forge API** | LLM (AI Tutor), Image Generation, Voice Transcription | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` | Server-side only; GPT-4 class model |
| **Manus Forge (Frontend)** | Client-side AI features | `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` | Landing page chatbot |
| **Stripe** | Payments, Subscriptions, Invoices, Coupons | `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Both test and live keys configured |
| **Resend** | Transactional Email (primary) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Webhook for bounce/complaint handling |
| **SMTP** | Transactional Email (backup) | Admin settings (encrypted) | Configurable via admin console |
| **SendGrid** | Transactional Email (backup) | Admin settings (encrypted) | Configurable via admin console |
| **TiDB (MySQL)** | Database | `DATABASE_URL` | Managed MySQL-compatible, auto-scaling |
| **S3 Storage** | File uploads, certificates, proofs | Built-in via `storagePut`/`storageGet` | Served via `/manus-storage/` proxy |
| **Manus Heartbeat** | Scheduled jobs (10 crons) | Registered via `server/_core/heartbeat.ts` | Cron expressions, HTTP POST callbacks |
| **Google Analytics** | Usage analytics | `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID` | Privacy-respecting |
| **Google Tag Manager** | Tag management | `VITE_GTM_ID` | Event tracking |

### Webhook Endpoints

| Endpoint | Provider | Purpose |
|----------|----------|---------|
| `/api/stripe/webhook` | Stripe | Payment events, subscription lifecycle |
| `/api/webhooks/resend` | Resend | Bounce/complaint notifications |
| `/api/webhooks/email` | Resend + SendGrid | Unified multi-provider email events |

---

## 18. Testing & QA Status

### Test Coverage

- **47 test files** with **1,208 tests** all passing
- **Framework:** Vitest 2.1.9
- **Pattern:** Unit tests for tRPC procedures using `appRouter.createCaller(ctx)` with mocked context
- **TypeScript:** 0 errors (`npx tsc --noEmit`)

### Test Categories

| Category | Approximate Tests |
|----------|-------------------|
| Core learning (mastery, adaptive path, skills, quizzes) | ~220 |
| Parent module (enrollment, co-parent, digest, tasks, insights) | ~180 |
| Admin (users, courses, settings, impersonation, RBAC) | ~170 |
| Billing (subscriptions, coupons, cards, exemptions) | ~120 |
| Gamification (XP, badges, quests, streaks, challenges) | ~150 |
| Email (templates, service, suppression, notifications) | ~100 |
| Auth (logout, 2FA, password reset, student auth) | ~70 |
| Onboarding (parent, student, referrals, invites) | ~100 |
| Other (certificates, flags, newsletter, focus mode, tasks) | ~98 |

### Running Tests

```bash
cd /home/ubuntu/educhamp
pnpm test                              # Run all 1,208 tests
pnpm test -- server/sprint36.test.ts   # Run specific file
pnpm test -- --watch                   # Watch mode
```

### QA Status

- All automated tests passing as of checkpoint `7b05ac80`
- TypeScript compilation: 0 errors
- No known runtime crashes or critical bugs
- Mobile responsiveness validated for key flows (Quiz, Diagnostic, ParentOnboarding, Skills, Billing)
- Cross-browser compatibility: Chrome, Firefox, Edge confirmed; Safari Private Browsing has OAuth cookie limitations

---

## 19. Known Issues & Limitations

| Issue | Severity | Details |
|-------|----------|---------|
| Video lessons are stubs | Medium | `videoUrl` column exists but most lessons have no video content yet |
| Safari Private Browsing | Low | OAuth cookies blocked in Safari Private/Firefox Strict ETP/Brave Aggressive Shields |
| Cold start latency | Low | Cloud Run min-instances=0 means first request after idle has ~2s cold start |
| Single-region deployment | Medium | Currently US-only; no CDN or multi-region setup |
| Content gap | Medium | Some newer courses may have less question variety than Algebra I (the original course) |
| Large bundle size | Low | 56 pages with lazy loading mitigates impact, but initial bundle could be further optimized |
| No real-time notifications | Low | In-app notifications use polling (60s interval) rather than WebSocket/SSE |

---

## 20. Pending Enhancements & Roadmap

All items in `todo.md` are currently marked complete (0 pending items across 3,057 lines). The following are recommended future enhancements based on platform maturity:

### High Priority

1. **Video content pipeline** — populate `videoUrl` for high-traffic courses; consider integration with a video hosting service (Mux, Cloudflare Stream)
2. **Performance optimization** — add database indexes for frequently queried columns (especially `userMastery`, `unitProgress` by userId+courseId); consider query caching
3. **CDN/Edge caching** — deploy static assets to a CDN for global performance
4. **Real-time notifications** — WebSocket or SSE for in-app notifications instead of 60s polling

### Medium Priority

5. **Mobile app wrapper** — consider React Native or PWA enhancements for native mobile experience
6. **Analytics dashboard** — student engagement metrics, course completion rates, revenue analytics (beyond current admin overview)
7. **Multi-language support** — i18n framework for Spanish (high demand in Texas market)
8. **Accessibility audit** — WCAG 2.1 AA compliance review and remediation
9. **Admin invite filtering and CSV export** — status filter dropdowns and download button for reporting
10. **Co-parent digest forwarding** — CC co-parents on weekly progress digest

### Low Priority

11. **Multi-region deployment** — EU/Asia regions for international expansion
12. **API rate limiting refinement** — per-user rate limits on AI Tutor to manage LLM costs
13. **Content versioning** — track lesson content changes over time (beyond CMS)
14. **Parent mobile push notifications** — push notifications for real-time alerts
15. **Invite acceptance in-app notification** — bell notification alongside the email
16. **Teacher/school accounts** — dedicated teacher role with classroom management

---

## 21. Environment Variables & Secrets

All environment variables are managed through the Manus platform secrets system. The following are configured:

| Variable | Purpose | Layer |
|----------|---------|-------|
| `DATABASE_URL` | MySQL/TiDB connection string | Server |
| `JWT_SECRET` | Session cookie signing | Server |
| `VITE_APP_ID` | Manus OAuth app ID | Client |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL | Server |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL | Client |
| `OWNER_OPEN_ID` / `OWNER_NAME` | Platform owner info | Server |
| `BUILT_IN_FORGE_API_URL` | Manus built-in APIs (LLM, storage, data_api, notification) | Server |
| `BUILT_IN_FORGE_API_KEY` | Bearer token for Manus built-in APIs | Server |
| `VITE_FRONTEND_FORGE_API_URL` | Manus built-in APIs URL for frontend | Client |
| `VITE_FRONTEND_FORGE_API_KEY` | Bearer token for frontend AI access | Client |
| `STRIPE_SECRET_KEY` | Stripe API (server) | Server |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client) | Client |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | Server |
| `RESEND_API_KEY` | Email sending via Resend | Server |
| `RESEND_FROM_EMAIL` | Sender email address | Server |
| `VITE_APP_TITLE` | Application title branding | Client |
| `VITE_APP_LOGO` | Application logo URL | Client |
| `VITE_ANALYTICS_ENDPOINT` | Analytics endpoint URL | Client |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website identifier | Client |
| `VITE_GTM_ID` | Google Tag Manager container ID | Client |

**Important:** Do not edit these directly in code or commit `.env` files. All secrets are injected at runtime by the Manus platform.

---

## 22. Deployment & Infrastructure

### Production Environment

| Component | Details |
|-----------|---------|
| **Runtime** | Google Cloud Run (Node.js 22) |
| **Resources** | 1 vCPU, 512 MiB RAM |
| **Request timeout** | 180 seconds |
| **Min instances** | 0 (cold starts possible) |
| **Database** | TiDB (MySQL-compatible, managed, auto-scaling) |
| **File storage** | S3-compatible object storage (served via `/manus-storage/` proxy) |
| **Domains** | `educhamp.app`, `educhamp.co`, `educhamp.manus.space` |
| **SSL** | Automatic (managed by platform) |
| **Stripe Webhook** | `https://educhamp-ai-bggbz5qk.manus.space/api/stripe/webhook` |

### Build Process

```bash
# Development
pnpm dev                    # tsx watch server/_core/index.ts

# Production build
pnpm build                  # vite build (client) + esbuild (server → dist/index.js)

# Production start
pnpm start                  # node dist/index.js
```

### Deployment Process

1. Make changes and verify with `pnpm test` (all 1,208 tests must pass)
2. Verify TypeScript: `npx tsc --noEmit` (0 errors required)
3. Save checkpoint via `webdev_save_checkpoint`
4. Click **Publish** in the Manus Management UI
5. Deployment is automatic (build + deploy to Cloud Run)

### Database Migrations

Migrations are managed via Drizzle Kit (62 migrations applied):
```bash
pnpm drizzle-kit generate   # Generate SQL from schema changes
# Then apply via webdev_execute_sql tool
```

**Critical:** Database data is NOT recoverable. Exercise extreme caution with destructive SQL commands. Always back up data before schema changes that drop columns or tables.

### Startup Bootstrap

On server start, the following are automatically initialized:
- Default RBAC roles seeded
- Email service bootstrapped (provider detection)
- Default gamification data seeded (badges, houses, quests)

---

## 23. Sprint History (Condensed)

The project has been developed across 36+ named sprints plus numerous feature phases. Below is a condensed timeline of major milestones:

| Phase/Sprint | Key Deliverables |
|-------------|-----------------|
| Phase 2–9 | Core platform: schema, curriculum (12 units × 9 lessons), AI tutor (6 modes), diagnostic (57 questions), quiz engine, progress tracking, notifications |
| Tutor UX Round 2 | Context-aware prompts, mastery-based difficulty, parent summary mode, language level adaptation |
| Parent Module | Multi-child management, co-parent invitations, progress dashboards, goals, notes, skill gap analysis |
| Auth Enhancements | 2FA (TOTP), password reset, student auth flow, admin impersonation |
| Referral & Onboarding | Referral codes, parent/student onboarding wizards, AI goal alignment, demographic collection |
| Variable Diagnostic | Expanded question bank (Bank A + B), unique retests, score history, per-course cooldown |
| Admin & Multi-Course | Admin console (28 sections), 75+ courses, RBAC, audit logging, CMS, platform settings |
| Gamification | XP, badges, quests, streaks, houses, seasonal challenges, rewards marketplace, adventure map |
| Email Infrastructure | Provider abstraction (Resend/SMTP/SendGrid), suppression, 20 templates, newsletter console |
| Compliance | COPPA, age gating, parental consent, state-aware verification, district transfer |
| Lesson Expansion | All courses to 9 lessons/unit (~8,100 total), video stubs, content generation |
| Certificates | Course completion certificates with PDF generation, QR codes, public shareable URLs |
| Billing | Stripe subscriptions, coupons, card management, invoices, billing delegation, exemptions |
| Weekly Digest | Parent email digests with celebration badges, activity preferences, preview, opt-out |
| Student Dashboard Redesign | Course recommendations, progress milestones, learning streak tracker |
| Learning Plan | Personalized study schedules, configurable blocks, hourly reminders |
| Task Management | Parent-assigned tasks, recurrence, proof requirements, XP rewards, templates, shared tasks |
| Focus Mode & Leaderboards | Focus timer, streak leaderboard, task leaderboard, XP competitions |
| Parent Engagement | Parent insights tab, family activity feed, exportable PDF reports, task difficulty auto-adjustment |
| Sprint 31 | Parent redirect fix, resend invite, dark mode audit |
| Sprint 32 | Parent resend invite, admin invite status badges, mobile touch targets |
| Sprint 33 | Admin invite conversion chart (AreaChart), parent resend confirmation dialog |
| Sprint 34 | Invite expiry reminder (daily cron), bulk invite actions, copy invite link |
| Sprint 35 | Invite acceptance tracking timeline, auto-expire cleanup job, parent notification preferences |
| Sprint 36 | Invite acceptance notification email, weekly progress digest preference toggle |

---

## 24. Quick Reference Commands

```bash
# Start development
cd /home/ubuntu/educhamp
pnpm dev                           # Start dev server (auto-starts via webdev)

# Run tests
pnpm test                          # All 1,208 tests
pnpm test -- --watch               # Watch mode
pnpm test -- server/sprint36.test.ts  # Specific file

# TypeScript check
npx tsc --noEmit                   # Should report 0 errors

# Generate migration after schema change
pnpm drizzle-kit generate          # Creates SQL in drizzle/ folder

# Check heartbeat jobs
manus-heartbeat list               # List all 10 registered crons

# View server logs
tail -f .manus-logs/devserver.log
tail -f .manus-logs/browserConsole.log
tail -f .manus-logs/networkRequests.log

# Count tests
npx vitest run --reporter=verbose 2>&1 | tail -5

# Check schema table count
grep -c "mysqlTable(" drizzle/schema.ts
```

---

## Appendix A: Router Module Index (23 modules)

| Router File | Domain | Key Procedures |
|-------------|--------|----------------|
| `admin.ts` | Admin console | User CRUD, platform settings, system health, audit log |
| `adminUserDetail.ts` | Admin user detail | Detailed user view, role changes, session management |
| `authEnhancements.ts` | Auth | 2FA setup/verify, password reset, session management |
| `certificate.ts` | Certificates | Generate, list, verify, download certificates |
| `coParent.ts` | Co-parent | Invite, accept, revoke co-parent access |
| `coppa.ts` | Compliance | Consent request, approve/deny, status check |
| `familyFeed.ts` | Family | Activity feed with cursor pagination, stats |
| `focusMode.ts` | Focus | Start/end sessions, history, XP awards |
| `gamification.ts` | Gamification | XP, badges, quests, streaks, houses, rewards, challenges |
| `landing.ts` | Public | Landing page stats, AI chat, session management |
| `newsletter.ts` | Newsletter | Subscribe, unsubscribe, campaign CRUD, send |
| `onboarding.ts` | Onboarding | Parent/student wizards, invite acceptance, referral tracking |
| `parent.ts` | Parent core | Child management, enrollment, progress queries |
| `parentTasks.ts` | Tasks | Create, assign, complete, confirm/reject, templates |
| `parentTools.ts` | Parent tools | Goals, notes, skill gap, export, insights |
| `payment.ts` | Billing | Checkout, subscriptions, coupons, invoices, cards |
| `questionFlags.ts` | Content QA | Flag questions, resolve, notify |
| `referral.ts` | Referrals | Create codes, track clicks/signups, list |
| `sharedTasks.ts` | Shared tasks | Sibling task delegation, shared completions |
| `skillPractice.ts` | Practice | Weak skill identification, practice sessions |
| `studentAuth.ts` | Student auth | Student login, password setup, forgot password |
| `weeklyChallenges.ts` | Challenges | Weekly challenge definitions, progress, rewards |
| `weeklyReport.ts` | Reports | PDF report generation, download |

---

## Appendix B: Key Database Indexes

Performance-critical indexes include:
- `userCourseEnrollments_userId_courseId_idx` (unique) — fast enrollment lookup
- `parentInviteTokens_studentId_status_idx` — invite polling (30s interval)
- `parentInviteTokens_status_expiresAt_idx` — expiry job queries
- `parentInviteTokens_parentId_idx` — parent dashboard queries

---

## Appendix C: File Naming Conventions

- **Pages:** PascalCase (`ParentDashboard.tsx`, `GamificationHub.tsx`)
- **Routers:** camelCase (`parentTasks.ts`, `familyFeed.ts`)
- **Email templates:** camelCase (`weeklyParentDigest.ts`, `inviteAccepted.ts`)
- **Scheduled handlers:** camelCase (`cardExpiryReminder.ts`, `studentInviteAutoExpire.ts`)
- **Tests:** `*.test.ts` suffix (`sprint36.test.ts`, `auth.logout.test.ts`)
- **Migrations:** Auto-generated by Drizzle Kit (`0000_gigantic_robbie_robertson.sql`)

---

*This document was generated on June 11, 2026 at checkpoint `7b05ac80`. For the most current state, always check `todo.md` and the latest git log.*
