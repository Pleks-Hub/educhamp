# EduChamp — Project Handoff Document v8

**Version:** 8.0
**Date:** June 1, 2026
**Checkpoint:** `563a5c07` (current stable)
**Previous Handoff:** `educhamp_handoff_v3.md` (checkpoint `a57807fc` — May 31, 2026)
**Author:** Manus AI
**Repository:** [github.com/Pleks-Hub/educhamp](https://github.com/Pleks-Hub/educhamp) · branch `main`
**Deployed Domains:** `educhamp.app` · `educhamp.co` · `educhamp.manus.space`
**Test Suite:** 1,091 tests passing · TypeScript: 0 errors · DB Migrations: 48 applied

> **How to use this document:** This is a cumulative handoff covering the full platform state as of checkpoint `563a5c07`. It is designed for another AI agent, engineer, or development team to immediately understand the architecture, feature set, integrations, and recommended next steps without reading prior handoff versions.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture & File Structure](#3-architecture--file-structure)
4. [Database Schema (88 Tables)](#4-database-schema-88-tables)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Core Learning Features](#6-core-learning-features)
7. [Parent & Guardian Module](#7-parent--guardian-module)
8. [Admin Console](#8-admin-console)
9. [Billing & Subscription System](#9-billing--subscription-system)
10. [Gamification Engine](#10-gamification-engine)
11. [Email & Notification System](#11-email--notification-system)
12. [Scheduled Jobs (Heartbeat)](#12-scheduled-jobs-heartbeat)
13. [Content & Curriculum](#13-content--curriculum)
14. [Compliance & Age Verification](#14-compliance--age-verification)
15. [UI/UX Design System](#15-uiux-design-system)
16. [Integrations](#16-integrations)
17. [Testing Strategy](#17-testing-strategy)
18. [Known Issues & Limitations](#18-known-issues--limitations)
19. [Pending Tasks](#19-pending-tasks)
20. [Recommended Next Steps](#20-recommended-next-steps)
21. [Environment Variables](#21-environment-variables)
22. [Deployment & Infrastructure](#22-deployment--infrastructure)
23. [Sprint History Summary](#23-sprint-history-summary)

---

## 1. Platform Overview

EduChamp is an AI-powered adaptive learning platform serving Pre-K through Grade 12+ students, with 70+ courses aligned to Texas Essential Knowledge and Skills (TEKS) standards. The platform provides personalized learning paths through diagnostic placement tests, mastery-based progression, an AI tutor (EduBot), and comprehensive parent/guardian dashboards.

The platform supports three account types — **student**, **parent**, and **admin** — with strict role separation enforced at both the server and client layers. Parents manage one or more student accounts, track progress, set goals, and receive weekly digest emails. Administrators manage users, courses, content, billing, and platform settings through a dedicated admin console.

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
| Database | MySQL (TiDB) | Managed |
| Authentication | Manus OAuth + JWT sessions | — |
| Payments | Stripe (Checkout + Subscriptions) | 22.1.1 |
| Email | Resend | 6.12.4 |
| AI/LLM | Manus Forge API (GPT-4 class) | Built-in |
| Build Tool | Vite | Latest |
| Testing | Vitest | 2.1.9 |
| Validation | Zod | 4.1.12 |
| Runtime | Node.js | 22.13.0 |
| Package Manager | pnpm | Latest |

---

## 3. Architecture & File Structure

The project follows a monorepo structure with a shared type system between client and server, connected via tRPC for end-to-end type safety.

```
educhamp/
├── client/                    # React 19 SPA
│   ├── src/
│   │   ├── pages/            # 40 page components
│   │   ├── components/       # Reusable UI (shadcn/ui + custom)
│   │   ├── contexts/         # ThemeContext
│   │   ├── hooks/            # Custom hooks (useAuth, useMobile, etc.)
│   │   ├── lib/              # tRPC client, utilities
│   │   ├── App.tsx           # Route definitions (wouter)
│   │   └── index.css         # Global theme (OKLCH tokens)
│   └── index.html            # Entry point (Google Fonts CDN)
├── server/
│   ├── _core/                # Framework plumbing (DO NOT EDIT)
│   │   ├── index.ts          # Express app + route registration
│   │   ├── context.ts        # tRPC context builder
│   │   ├── trpc.ts           # Procedure definitions
│   │   ├── llm.ts            # LLM invocation helper
│   │   ├── oauth.ts          # Manus OAuth handler
│   │   ├── heartbeat.ts      # Scheduled job registration
│   │   └── ...               # notification, imageGen, voiceTranscription
│   ├── routers/              # 15 tRPC router modules
│   ├── scheduled/            # 4 heartbeat handlers
│   ├── emailTemplates/       # 12 HTML email templates
│   ├── emailService.ts       # Provider abstraction (Resend/SMTP/SendGrid)
│   ├── stripe.ts             # Stripe helpers, PLANS, coupon logic
│   ├── db.ts                 # 200+ query helper functions
│   ├── routers.ts            # AppRouter composition
│   ├── storage.ts            # S3 storage helpers
│   └── *.test.ts             # 40 test files (1,091 tests)
├── drizzle/
│   ├── schema.ts             # 88 tables (1,867 lines)
│   ├── relations.ts          # Table relationships
│   └── 0000–0048/            # 48 migration SQL files
├── shared/                   # Shared types & constants
├── reports/                  # Handoff docs, QA reports
└── references/               # periodic-updates.md
```

**Key architectural decisions:**

- All backend logic is exposed exclusively through tRPC procedures — no raw REST endpoints except OAuth callback, Stripe webhook, and scheduled job handlers.
- The `protectedProcedure` middleware injects `ctx.user` from the JWT session cookie. A `studentProcedure` variant additionally blocks parent-typed accounts from student-only routes.
- Superjson serialization means Drizzle rows (with `Date` objects) can be returned directly from procedures without manual transformation.
- The single Express process serves both the Vite dev server (in development) and the built SPA + API (in production via Cloud Run).

---

## 4. Database Schema (88 Tables)

The database is organized into logical domains. Below is a categorized summary of all 88 tables:

### Core Learning

| Table | Purpose |
|-------|---------|
| `users` | All accounts (student, parent, admin) with role, accountType, grade, status |
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
| `tutorSessions` | AI Tutor chat session history |

### Parent & Guardian

| Table | Purpose |
|-------|---------|
| `parentChildren` | Parent-child relationships (nickname, gradeLevel, relationship) |
| `coParentInvitations` | Co-parent invite tokens (7-day expiry) |
| `coParentAccess` | Active co-parent view access grants |
| `parentGoals` | Parent-set learning goals per child |
| `parentNotes` | Private parent notes per child |
| `parentInviteTokens` | Parent-to-parent invitation tokens |
| `studentInviteTokens` | Parent-issued student registration tokens |
| `parentalConsents` | COPPA parental consent records |
| `billingDelegations` | Billing responsibility delegation tokens |

### Authentication & Security

| Table | Purpose |
|-------|---------|
| `passwordResetTokens` | Password reset flow tokens |
| `twoFactorAuth` | TOTP 2FA secrets + backup codes |
| `userSessions` | Active session tracking for admin impersonation |
| `adminImpersonationSessions` | Impersonation audit trail |

### Admin & Platform

| Table | Purpose |
|-------|---------|
| `courses` | 75+ courses with subject, gradeLevel, teksCode, minAgeRequirement |
| `userCourseEnrollments` | Student course enrollment records |
| `platformSettings` | Key-value platform configuration |
| `adminAuditLog` | All admin actions with IP, timestamp, details |
| `adminRoles` | Custom admin role definitions |
| `rolePermissions` | Permission grants per role |
| `adminRoleAssignments` | Role-to-user assignments |
| `cmsContent` | CMS content blocks (landing page, FAQ, etc.) |
| `cmsContentHistory` | CMS version history |
| `demoRequests` | School/district demo request submissions |
| `courseRequests` | User-submitted course requests |

### Billing & Payments

| Table | Purpose |
|-------|---------|
| `subscriptions` | Active subscriptions (stripeSubscriptionId, plan, status, card details) |
| `coupons` | Discount codes (percentage/fixed, duration, limits) |
| `couponRedemptions` | Coupon usage tracking |
| `paymentAuditLog` | All payment events (webhook-driven) |

### Email & Notifications

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

### Gamification

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

### Standards & Curriculum Mapping

| Table | Purpose |
|-------|---------|
| `standardFrameworks` | Standard framework definitions (TEKS, Common Core, etc.) |
| `standards` | Individual standard entries |
| `standardCrosswalk` | Cross-framework standard mappings |
| `unitStandards` | Unit-to-standard alignments |
| `learningObjectives` | Granular learning objectives |
| `objectivePrerequisites` | Prerequisite chains |
| `assessmentTemplates` | Assessment generation templates |

### Geography & Schools

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
| `enrollmentContexts` | Enrollment context metadata |

### Other

| Table | Purpose |
|-------|---------|
| `userProfiles` | Extended demographics, onboarding state, notification preferences, activityPreference |
| `referrals` | Referral codes with click/signup counts |
| `referralSignups` | Referral attribution records |
| `questionFlags` | Student-flagged quiz questions for review |
| `chatSessions` / `chatMessages` | Admin live chat system |
| `courseCertificates` | Issued completion certificates |
| `masteryRecords` | Historical mastery snapshots |

---

## 5. Authentication & Authorization

The platform uses **Manus OAuth** for authentication with JWT session cookies for state management.

**Account types and roles:**

| Account Type | Role | Access |
|-------------|------|--------|
| `student` | `user` | Curriculum, quizzes, diagnostic, AI tutor, progress, gamification |
| `parent` | `parent` | Parent dashboard, child management, co-parent invites, billing, reports |
| `admin` | `admin` | Full admin console, user management, content, settings |

**Key enforcement rules:**

- Parent accounts are **hard-blocked** from quiz, diagnostic, and mastery accumulation routes (server-side `studentProcedure`).
- Student accounts cannot access parent dashboard or co-parent features.
- Admin routes use `adminProcedure` which checks `ctx.user.role === 'admin'`.
- Students cannot self-register; they must use a parent-issued invite token.
- 2FA (TOTP) is optional for all account types.
- Admin impersonation creates an audit trail and uses a separate session token.

**OAuth flow:**

1. Frontend calls `getLoginUrl(returnPath)` which encodes `window.location.origin` + return path in OAuth state.
2. Manus OAuth redirects to `/api/oauth/callback` which extracts origin from state for the final redirect.
3. Session cookie is set with JWT containing user ID and role.

---

## 6. Core Learning Features

### Curriculum Browser (`/curriculum`, `/curriculum/unit/:unitNumber`, `/curriculum/unit/:unitNumber/lesson/:lessonId`)

Each course contains 12 units with 9 lessons per unit. Lessons include structured content: explanations, TEKS alignment, worked examples, guided practice problems (with hints), independent practice problems (with solution reveal), and common misconceptions. A `videoUrl` field supports embedded video lessons (YouTube/MP4/iframe).

### AI Tutor — EduBot (`/tutor`)

Six modes: **Teach**, **Practice**, **Quiz**, **Exam Review**, **Remediation**, **Parent Summary**. The tutor uses streaming SSE responses via `/api/tutor/stream`. System prompts are context-aware, injecting the student's mastery scores, current unit/lesson, diagnostic placement, parent goals, and demographics. The tutor adapts difficulty based on per-skill mastery levels.

### Diagnostic Assessment (`/diagnostic`, `/diagnostic/early`)

A 30-question adaptive placement test (6 prerequisite + 24 unit questions) drawn from a 57-question bank using seeded Fisher-Yates shuffle. Each retest draws different questions. Results determine unit-by-unit placement recommendations. An early-learner variant exists for Pre-K/Kindergarten students.

### Quiz Engine (`/curriculum/unit/:unitNumber/quiz`)

15 questions per unit quiz (5 easy, 5 medium, 3 hard, 2 challenge). Automatic mastery score updates after completion. Adaptive path unlock logic: below 60% triggers reteach, 60–74% guided practice, 75–89% unlocks next quiz, 90%+ unlocks challenge content.

### Progress & Mastery (`/progress`, `/skills`)

Skill-level mastery charts (bar charts per unit), unit completion timeline, mastery level labels (Beginner → Advanced), and a full skill index page showing all skill IDs with prerequisites.

### Course Completion Certificates (`/certificates`, `/certificate/:token`)

Students who achieve 90%+ mastery across all units of a course can earn a completion certificate. Certificates are generated as PDFs and have a public shareable URL.

### Exam Prep (`/exam-prep`)

Timed exam practice mode with the AI tutor focused on test-taking strategies and time management.

---

## 7. Parent & Guardian Module

### Parent Dashboard (`/parent`)

Multi-child management with tab-based child switcher. Per-child views include:

- **Progress Overview** — mastery by unit, quiz scores, placement results, adaptive path status
- **Skill Gap Analysis** — skills below 75% with priority ranking
- **Study Goals** — set/track goals per child with AI-generated goal alignment
- **Parent Notes** — private notes per child
- **Learning Insights** — time trends, improvement rate, quiz score history
- **Export Report** — CSV download + print-to-PDF
- **Certificates** — view/download child's earned certificates

### Co-Parent System

Primary parents can invite co-parents/guardians via email. Co-parents get read-only access to the same progress dashboard. Invitations expire after 7 days and can be revoked.

### Weekly Digest Emails

Every Monday at 8 AM UTC, parents receive a digest email summarizing each child's weekly activity: lessons completed, quiz scores, mastery progress, on-track status, and a tailored at-home activity suggestion. Features include:

- **Celebration badges** — golden trophy badge when a child achieves a perfect 100% quiz score or masters new skills
- **Activity preference customization** — parents choose from 6 focus areas (general, reading, math games, hands-on, outdoor, creative) and the digest tailors suggestions accordingly
- **Preview Digest** — parents can preview the next digest email from their Profile page
- **Opt-out** — toggle in Profile page to disable weekly emails

### Notification Preferences (`/profile`)

Parents can manage email notification preferences including weekly digest opt-in/out and activity preference selection from the Profile page.

---

## 8. Admin Console

The admin console (`/admin`) uses a standalone layout (no student sidebar) with a left sidebar navigation organized into 7 categories:

### Admin Sections

| Category | Sections |
|----------|----------|
| **Overview** | Dashboard stats (users, sessions, diagnostics, quizzes, courses) |
| **Users** | User list (search, filter, role/account-type edit), User Detail, Impersonation |
| **Content** | Courses (CRUD, unit management), CMS, Question Flags |
| **Communication** | Newsletter Console, Chat Management, Email Service Health |
| **Billing** | Subscriptions, Coupons, Card Management, Transaction Log |
| **Compliance** | COPPA Consents, Suppression List, Audit Log |
| **Settings** | Platform Settings, Roles & Permissions |

### Key Admin Features

- **Impersonation** — admins can impersonate any user with full audit trail and a visible banner
- **Email Service Management** — provider switching (Resend/SMTP/SendGrid), health dashboard, AES-256-GCM encrypted credentials
- **Newsletter Console** — compose, schedule, send campaigns to subscriber segments
- **Question Flag Review** — review student-flagged quiz questions, mark resolved
- **Badge Counters** — live sidebar counts for flagged questions, demo requests, suppression list (auto-refresh 60s)

---

## 9. Billing & Subscription System

### Pricing Plans

| Plan | Monthly | Annual | Max Students | Key Features |
|------|---------|--------|-------------|--------------|
| **Free** | $0 | $0 | 1 | All courses, limited AI Tutor, basic progress |
| **Family** | $19.99 | $15.99/mo | 3 | Unlimited AI Tutor, adaptive quizzes, parent dashboard |
| **Premium Family** | $29.99 | $23.99/mo | 5 | All Family + AP courses, exam prep, priority AI, co-parent |

### Implementation

- **Stripe Checkout** for subscription creation with promotion code support
- **Card-on-file** requirement (even for free plan) via Stripe Setup Intents
- **Billing delegation** — parents can delegate billing to another email address
- **Admin subscription management** — suspend, resume, status update, manual creation
- **Payment audit log** — all Stripe webhook events logged with type, amount, timestamp
- **Invoice/receipt download** — Stripe-hosted PDF invoices accessible from billing page
- **Payment history** — filterable by date range, sortable by date/amount
- **Card expiry reminders** — daily heartbeat checks for cards expiring within 30 days
- **Coupon system** — percentage/fixed discounts, duration (once/repeating/forever), usage limits, admin CRUD

### Stripe Webhook (`/api/stripe/webhook`)

Handles: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `payment_intent.succeeded`. Test events (ID starting with `evt_test_`) return `{ verified: true }`.

---

## 10. Gamification Engine

The gamification system provides engagement mechanics for students:

- **XP & Levels** — XP earned from lessons, quizzes, streaks; level-up thresholds
- **Badges** — achievement badges (auto-seeded defaults + admin-created custom)
- **Quests** — multi-step challenges with progress tracking
- **Streaks** — daily activity streaks with freeze tokens
- **Houses** — 4-house system with collective point competition
- **Seasonal Challenges** — time-limited events with unique rewards
- **Rewards Marketplace** — redeem XP for avatar items, themes, etc.
- **Adventure Map** (`/adventure-map`) — visual progression through curriculum
- **Gamification Hub** (`/gamification`) — central dashboard for all gamification features

---

## 11. Email & Notification System

### Email Service Architecture

The email system uses a provider abstraction layer supporting three backends:

| Provider | Status | Configuration |
|----------|--------|---------------|
| **Resend** | Active (primary) | API key via `RESEND_API_KEY` |
| **SMTP** | Available | Host/port/auth via admin settings |
| **SendGrid** | Available | API key via admin settings |

Provider credentials are stored AES-256-GCM encrypted in the `emailSettings` table. The admin can switch providers from the Email Service Health dashboard.

### Email Templates (12)

| Template | Trigger |
|----------|---------|
| `weeklyParentDigest` | Monday 8 AM UTC heartbeat |
| `cardExpiry` | Daily heartbeat (cards expiring in 30 days) |
| `coppaConsentRequest` | Parent enrolls child under 13 |
| `courseRequestNotification` | User submits course request |
| `flagResolutionNotification` | Admin resolves flagged question |
| `inactivityNotification` | 7-day inactivity heartbeat |
| `parentInvite` | Parent invites co-parent |
| `passwordReset` | Password reset request |
| `trialExpiry` | Trial period ending |
| `trialReminder` | Trial reminder (3 days before) |
| `trialWelcome` | New user signup |
| `emailBase` | Shared HTML wrapper (brand header/footer) |

### Email Suppression

Bounce/complaint handling via Resend webhooks. Suppressed addresses are blocked from future sends. Admin can view, manage, and audit the suppression list.

---

## 12. Scheduled Jobs (Heartbeat)

All scheduled jobs use the Manus Heartbeat system (cron-based HTTP POST to registered endpoints):

| Job | Schedule | Endpoint | Purpose |
|-----|----------|----------|---------|
| Weekly Parent Digest | Monday 8 AM UTC | `/api/scheduled/weekly-parent-digest` | Send digest emails to all opted-in parents |
| Card Expiry Reminder | Daily 9 AM UTC | `/api/scheduled/card-expiry-reminder` | Email parents whose card expires within 30 days |
| Inactivity Monitor | Daily | `/api/scheduled/inactivity-monitor` | Flag students inactive 7+ days, notify parents |
| Invite Expiry | Daily | `/api/scheduled/invite-expiry` | Expire stale invitation tokens |
| Grade Promotion | Configurable | `/api/scheduled/grade-promotion` | End-of-year grade level advancement |

---

## 13. Content & Curriculum

### Course Catalog

The platform hosts **75+ courses** spanning Pre-K through Grade 12+ including AP courses. Each course contains 12 units with 9 lessons per unit, totaling approximately **5,223 lessons** across **565 units**.

### Subject Coverage

| Grade Band | Subjects |
|-----------|----------|
| Pre-K – Grade 2 | Math, ELA, Science, Social Studies |
| Grade 3 – Grade 5 | Math, ELA, Science, Social Studies |
| Grade 6 – Grade 8 | Math, English, Science, Social Studies |
| Grade 9 – Grade 12 | Algebra I, English I, Biology I, Spanish 2, and more |
| AP | Human Geography, Calculus, Chemistry, and more |

### Content Structure Per Lesson

Each lesson contains structured JSON content:
- **Explanation** — core concept teaching
- **TEKS Alignment** — Texas standard reference
- **Worked Examples** — step-by-step solutions
- **Guided Practice** — problems with progressive hints
- **Independent Practice** — problems with solution reveal
- **Common Misconceptions** — typical errors and corrections
- **Video URL** (optional) — embedded video lesson

### Diagnostic Question Bank

57 questions organized as Bank A (original 30) + Bank B (27 additional) ensuring unique retests via seeded shuffle.

---

## 14. Compliance & Age Verification

### COPPA Compliance

- **Compulsory DOB** collection for all sign-ups
- **Age-based hard block** — children under 13 require verified parental consent before accessing the platform
- **Consent flow** — parent receives email with approve/deny links; child sees waiting screen until approved
- **State-aware age-of-majority** — guardian age verification uses state-specific thresholds (18 or 19 depending on state)

### Course Age Gating

- `minAgeRequirement` column on courses table
- Server-side enforcement in `enrollUserInCourse` — throws `AGE_GATE:N` error
- Client-side amber badge "Age X+ required" with disabled enrol button for underage students

---

## 15. UI/UX Design System

### Theme

- **Color system:** OKLCH tokens in CSS variables (dark theme default)
- **Typography:** Inter (body) + Lora (headings) via Google Fonts CDN
- **Component library:** shadcn/ui (Radix primitives) with Tailwind CSS 4
- **Animations:** Snappy ease-out transitions (180ms dropdowns, 100–160ms buttons), `prefers-reduced-motion` respected

### Layout Patterns

- **Student views:** DashboardLayout with left sidebar (Dashboard, Curriculum, AI Tutor, Diagnostic, Progress, Skills, Gamification, etc.)
- **Parent views:** Same DashboardLayout with parent-specific nav items
- **Admin console:** Standalone layout with categorized left sidebar (21 sections in 7 groups)
- **Public pages:** Custom top navigation (Landing, Courses, Pricing, FAQ, Schools)

### Responsive Design

Mobile-first with Tailwind breakpoints. Key mobile optimizations applied to Quiz, Diagnostic, ParentOnboarding, Skills, and Billing pages.

---

## 16. Integrations

| Integration | Purpose | Configuration |
|------------|---------|---------------|
| **Manus OAuth** | Authentication | `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` |
| **Manus Forge API** | LLM (AI Tutor), Image Generation, Voice Transcription | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` |
| **Stripe** | Payments, Subscriptions, Invoices | `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Resend** | Transactional Email | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| **TiDB (MySQL)** | Database | `DATABASE_URL` |
| **S3 Storage** | File uploads, certificates | Built-in via `storagePut`/`storageGet` |
| **Manus Heartbeat** | Scheduled jobs | Registered via `server/_core/heartbeat.ts` |

---

## 17. Testing Strategy

### Test Coverage

- **40 test files** with **1,091 tests** all passing
- **Framework:** Vitest 2.1.9
- **Pattern:** Unit tests for tRPC procedures using `appRouter.createCaller(ctx)` with mocked context

### Test Categories

| Category | Files | Tests |
|----------|-------|-------|
| Core learning (mastery, adaptive path, skills) | 8 | ~200 |
| Parent module (enrollment, co-parent, digest) | 5 | ~120 |
| Admin (users, courses, settings, impersonation) | 6 | ~150 |
| Billing (subscriptions, coupons, cards) | 4 | ~100 |
| Gamification (XP, badges, quests, streaks) | 5 | ~130 |
| Email (templates, service, suppression) | 4 | ~80 |
| Auth (logout, 2FA, password reset) | 3 | ~50 |
| Other (certificates, flags, newsletter, onboarding) | 5 | ~261 |

### Running Tests

```bash
cd /home/ubuntu/educhamp
pnpm test              # Run all tests
pnpm test -- server/weeklyDigest.test.ts  # Run specific file
```

---

## 18. Known Issues & Limitations

| Issue | Severity | Details |
|-------|----------|---------|
| Payment history status filter not implemented | Low | UI filter dropdown for paid/pending/failed status is pending |
| CSV export for payment history | Low | Export button for filtered transaction records not yet built |
| Quick filter chips for payments | Low | "Last 30 Days" and "This Year" shortcuts pending |
| Video lessons are stubs | Medium | `videoUrl` column exists but most lessons have no video content yet |
| Safari Private Browsing | Low | OAuth cookies blocked in Safari Private/Firefox Strict ETP |
| Cold start latency | Low | Cloud Run min-instances=0 means first request after idle has ~2s cold start |
| Single-region deployment | Medium | Currently US-only; no CDN or multi-region setup |

---

## 19. Pending Tasks

The following items remain uncompleted in `todo.md`:

```
- [ ] UI: Status filter dropdown (paid, pending/open, failed/void)
- [ ] UI: Export to CSV button for filtered transaction records
- [ ] UI: Quick filter chips — "Last 30 Days" and "This Year"
- [ ] Tests: status filter, CSV export, quick filter chips
```

All other features across 50+ sprint sections are marked complete.

---

## 20. Recommended Next Steps

### High Priority

1. **Complete payment history filters** — implement the 4 remaining pending items (status filter, CSV export, quick filter chips, tests)
2. **Video content pipeline** — populate `videoUrl` for high-traffic courses; consider integration with a video hosting service
3. **Performance optimization** — add database indexes for frequently queried columns (especially `userMastery`, `unitProgress` by userId+courseId)
4. **CDN/Edge caching** — deploy static assets to a CDN for global performance

### Medium Priority

5. **Mobile app wrapper** — consider React Native or PWA for native mobile experience
6. **Real-time notifications** — WebSocket or SSE for in-app notifications instead of polling
7. **Analytics dashboard** — student engagement metrics, course completion rates, revenue analytics
8. **Multi-language support** — i18n framework for Spanish (high demand in Texas market)
9. **Accessibility audit** — WCAG 2.1 AA compliance review and remediation

### Low Priority

10. **Multi-region deployment** — EU/Asia regions for international expansion
11. **API rate limiting refinement** — per-user rate limits on AI Tutor to manage LLM costs
12. **Content versioning** — track lesson content changes over time (beyond CMS)
13. **Parent mobile notifications** — push notifications for real-time alerts (quiz completion, mastery milestones)

---

## 21. Environment Variables

All environment variables are managed through the Manus platform secrets system. The following are configured:

| Variable | Purpose | Layer |
|----------|---------|-------|
| `DATABASE_URL` | MySQL/TiDB connection string | Server |
| `JWT_SECRET` | Session cookie signing | Server |
| `VITE_APP_ID` | Manus OAuth app ID | Client |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL | Server |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL | Client |
| `OWNER_OPEN_ID` / `OWNER_NAME` | Platform owner info | Server |
| `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` | LLM/AI services | Server |
| `VITE_FRONTEND_FORGE_API_URL` / `VITE_FRONTEND_FORGE_API_KEY` | Frontend AI access | Client |
| `STRIPE_SECRET_KEY` | Stripe API (server) | Server |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe (client) | Client |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | Server |
| `RESEND_API_KEY` | Email sending | Server |
| `RESEND_FROM_EMAIL` | Sender address | Server |
| `VITE_APP_TITLE` / `VITE_APP_LOGO` | Branding | Client |
| `VITE_ANALYTICS_ENDPOINT` / `VITE_ANALYTICS_WEBSITE_ID` | Analytics | Client |
| `VITE_GTM_ID` | Google Tag Manager | Client |

---

## 22. Deployment & Infrastructure

### Production Environment

| Component | Details |
|-----------|---------|
| **Runtime** | Google Cloud Run (Node.js) |
| **Resources** | 1 vCPU, 512 MiB RAM |
| **Request timeout** | 180 seconds |
| **Min instances** | 0 (cold starts possible) |
| **Database** | TiDB (MySQL-compatible, managed) |
| **File storage** | S3-compatible object storage |
| **Domains** | `educhamp.app`, `educhamp.co`, `educhamp.manus.space` |

### Deployment Process

1. Make changes and verify with `pnpm test`
2. Save checkpoint via `webdev_save_checkpoint`
3. Click **Publish** in the Manus Management UI
4. Deployment is automatic (build + deploy to Cloud Run)

### Database Migrations

Migrations are managed via Drizzle Kit:
```bash
pnpm drizzle-kit generate   # Generate SQL from schema changes
# Then apply via webdev_execute_sql tool
```

**Important:** Database data is NOT recoverable. Exercise extreme caution with destructive SQL commands.

---

## 23. Sprint History Summary

The project has been developed across 50+ sprints. Below is a condensed timeline of major milestones:

| Sprint/Phase | Key Deliverables |
|-------------|-----------------|
| Phase 2–9 | Core platform: schema, curriculum, AI tutor, diagnostic, quiz, progress, notifications |
| Tutor UX Round 2 | Context-aware prompts, mastery-based difficulty, parent summary mode |
| Parent Module | Multi-child management, co-parent invitations, progress dashboards |
| Auth Enhancements | 2FA, password reset, parent tools (goals, notes, skill gap, reports) |
| Referral & Onboarding | Referral codes, parent/student onboarding wizards, AI goal alignment |
| Variable Diagnostic | Expanded question bank, unique retests, score history |
| Admin & Multi-Course | Admin console, 75+ courses, RBAC, audit logging |
| Gamification | XP, badges, quests, streaks, houses, seasonal challenges, rewards |
| Email Infrastructure | Provider abstraction, suppression, templates, newsletter |
| Compliance | COPPA, age gating, parental consent, state-aware verification |
| Lesson Expansion | All courses to 9 lessons/unit (5,223 total), video stubs |
| Certificates | Course completion certificates with PDF generation |
| Billing | Stripe subscriptions, coupons, card management, invoices |
| Weekly Digest | Parent email digests with celebration badges, activity preferences, preview |

---

## Appendix: Quick Reference Commands

```bash
# Start development
cd /home/ubuntu/educhamp
pnpm dev                    # Start dev server (auto-starts via webdev)

# Run tests
pnpm test                   # All 1,091 tests
pnpm test -- --watch        # Watch mode

# TypeScript check
npx tsc --noEmit

# Generate migration after schema change
pnpm drizzle-kit generate

# Check heartbeat jobs
manus-heartbeat list

# View server logs
tail -f .manus-logs/devserver.log
tail -f .manus-logs/browserConsole.log
```

---

*This document was generated on June 1, 2026 at checkpoint `563a5c07`. For the most current state, always check `todo.md` and the latest git log.*
