# EduChamp — Comprehensive Project Handoff Document

**Version:** 2.0 · **Date:** May 28, 2026 · **Author:** Manus AI
**Checkpoint:** `0a40ab58` (Sprint 37 — Contextual Tooltip System)
**Live domains:** `educhamp.app`, `www.educhamp.app`, `educhamp.manus.space`
**Repository path:** `/home/ubuntu/educhamp`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview & Target Users](#2-product-overview--target-users)
3. [Implementation Status — All Features](#3-implementation-status--all-features)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [File & Folder Structure](#6-file--folder-structure)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Database Schema](#8-database-schema)
9. [API Structure (tRPC Routers)](#9-api-structure-trpc-routers)
10. [Curriculum & Course Structure](#10-curriculum--course-structure)
11. [Adaptive Learning Engine](#11-adaptive-learning-engine)
12. [AI Tutor Architecture (EduBot)](#12-ai-tutor-architecture-edubot)
13. [Diagnostic Assessment System](#13-diagnostic-assessment-system)
14. [Parent & Guardian Module](#14-parent--guardian-module)
15. [Payment & Subscription Architecture](#15-payment--subscription-architecture)
16. [Email & Notification Workflows](#16-email--notification-workflows)
17. [Email Suppression & Deliverability](#17-email-suppression--deliverability)
18. [Admin Portal & CMS](#18-admin-portal--cms)
19. [Landing Page & Marketing](#19-landing-page--marketing)
20. [Analytics & Conversion Tracking](#20-analytics--conversion-tracking)
21. [Frontend Design System & UX](#21-frontend-design-system--ux)
22. [Security & Compliance](#22-security--compliance)
23. [Testing Strategy](#23-testing-strategy)
24. [Deployment & DevOps](#24-deployment--devops)
25. [Environment Variables](#25-environment-variables)
26. [Scheduled Jobs & Automation](#26-scheduled-jobs--automation)
27. [Known Issues & Technical Debt](#27-known-issues--technical-debt)
28. [Pending Enhancements & Roadmap](#28-pending-enhancements--roadmap)
29. [Sprint History](#29-sprint-history)
30. [Developer Setup Guide](#30-developer-setup-guide)

---

## 1. Executive Summary

EduChamp is an AI-powered adaptive learning platform for K–12 students in Texas, with a primary focus on TEKS-aligned curriculum across Grades 3–12 and AP/SAT courses. The platform combines a structured curriculum browser, an AI tutor named EduBot, a diagnostic placement engine, per-skill mastery tracking, a quiz engine, and a parent/guardian monitoring dashboard into a single cohesive product.

The business model is a subscription SaaS platform with three tiers: a free-to-start tier, a Family Plan ($19.99/mo or $15.99/mo billed annually), and a Premium Family Plan ($29.99/mo or $23.99/mo billed annually). A fourth tier — ISD/School Licensing — targets school district administrators and is sold through a demo-request and sales pipeline. As of Sprint 37, the platform is fully production-deployed at `educhamp.app`, with 141 automated tests passing, 0 TypeScript errors, Stripe integration live, and a comprehensive email deliverability and suppression system in place.

---

## 2. Product Overview & Target Users

EduChamp serves four distinct user personas, each with a dedicated interface and workflow.

**Students (Grades 3–12)** are the primary learners. They complete a diagnostic placement test, follow an adaptive curriculum path, interact with EduBot in six modes (Teach, Practice, Quiz, Exam Review, Remediation, Parent Summary), and track mastery across individual skills. Students can be enrolled by parents or sign up independently and invite a parent afterward. Under-16 students require a parent/guardian account to be linked before gaining full course access.

**Parents and Guardians** monitor one or more children's progress from a dedicated Parent Dashboard. They receive AI-generated learning summaries, set academic goals, invite co-parents or guardians, and manage their subscription and billing. The Premium Family Plan supports up to three student accounts under one parent subscription.

**School/District Administrators (ISD)** are enterprise leads who submit demo requests through the landing page. Their inquiries are tracked in a CRM pipeline within the Admin Console. This tier is not yet self-service; it is managed through a sales workflow.

**Platform Administrators** access the full Admin Console, which includes user management, course and curriculum CMS, coupon management, subscription CRM, payment analytics, newsletter management, demo request pipeline, RBAC role management, email logs with delivery status, email suppression management, platform settings, and audit logs.

---

## 3. Implementation Status — All Features

| Feature Area | Status | Sprint |
|---|---|---|
| Landing page (hero, features, pricing, FAQ, Schools section) | Complete | 12, 16, 23 |
| User authentication (Manus OAuth) | Complete | 1 |
| Student onboarding wizard (3-step) | Complete | 12, 16 |
| Parent onboarding wizard (3-step + AI goal alignment) | Complete | 12, 16 |
| Parent–child account linking + co-parent invitations | Complete | 7, 8 |
| Under-16 gate (requires parent link before course access) | Complete | 16 |
| Referral system (unique codes, click/signup tracking) | Complete | 9 |
| Algebra I curriculum (12 units, lessons, practice, quizzes) | Complete | 1–5 |
| 56+ courses across Grades 3–12 + AP/SAT | Complete | 6–11, 14, 15 |
| Diagnostic placement test (per-course, variable retest) | Complete | 6, 8, 9, 15 |
| Per-skill mastery tracking (0–100, 5 levels) | Complete | 1–5 |
| Unit quiz engine (answer normalisation, 75% threshold) | Complete | 4, 5 |
| AI Tutor EduBot (6 modes, streaming SSE, course-aware) | Complete | 5, 10, 14 |
| Student dashboard (multi-course, progress, mastery) | Complete | 3, 6 |
| Parent dashboard (child switcher, progress, goals, notes, export) | Complete | 7, 8 |
| Course catalog (grade-filtered, self-enrollment) | Complete | 6, 7, 16 |
| Guided first-login tour (4-step walkthrough) | Complete | 6 |
| Personalisation (colour palette, display name, AI welcome message) | Complete | 8, 10 |
| Admin Console — User Management (CRUD, status, RBAC) | Complete | 11, 18 |
| Admin Console — Course & Curriculum CMS | Complete | 11, 18 |
| Admin Console — RBAC (custom roles, permissions) | Complete | 18 |
| Admin Console — Newsletter (AI-drafted campaigns) | Complete | 13 |
| Admin Console — Demo Requests (CRM pipeline) | Complete | 22 |
| Admin Console — Coupon Manager | Complete | 25 |
| Admin Console — Subscription CRM | Complete | 25 |
| Admin Console — Payment Analytics | Complete | 25 |
| Admin Console — Email Logs (with delivery status) | Complete | 21, 36 |
| Admin Console — Suppression Management | Complete | 34, 35 |
| Stripe integration (checkout, webhooks, portal) | Complete | 25, 26, 27 |
| PayPal / ACH payment methods | Complete | 26 |
| 14-day free trial | Complete | 27 |
| Trial active banner (days remaining) | Complete | 30 |
| Post-trial locked-access overlay + reactivation CTA | Complete | 31 |
| Stripe Customer Portal direct link | Complete | 33, 34 |
| Coupon redemption at checkout | Complete | 25 |
| Annual billing toggle + 20% discount | Complete | 22, 24 |
| ISD demo request form | Complete | 22 |
| Transactional email (Resend) | Complete | 20 |
| Trial welcome email | Complete | 31 |
| Trial expiry reminder email (T-3 days) | Complete | 29, 35 |
| Email suppression (bounce/complaint webhook) | Complete | 33 |
| Email delivery status tracking (delivered/opened/bounced) | Complete | 36 |
| Suppression badge on admin user profiles | Complete | 34 |
| Google Tag Manager / GA4 analytics | Complete | 31 |
| Conversion event tracking (5 events) | Complete | 31 |
| Contextual tooltip system (all major pages) | Complete | 37 |
| Custom favicon + PWA manifest | Complete | 28 |
| SEO metadata + OG/Twitter cards | Complete | 28 |
| robots.txt + dynamic sitemap | Complete | 29 |
| Helmet security headers | Complete | Production |
| Rate limiting (public LLM endpoint) | Complete | Production |
| DB indexes on high-traffic columns | Complete | Production |
| Invite expiry heartbeat job | Complete | 21 |
| Grade promotion heartbeat job | Complete | 6 |
| Mobile responsiveness (all pages) | Complete | 17 |
| District logos in Schools section | Blocked | 24 — awaiting partnership agreements |
| VITE_APP_TITLE update | Blocked | 28 — requires manual Settings → General update |
| Resend DNS verification | Blocked | 27, 32 — requires manual DNS records at registrar |
| Stripe webhook secret update | Blocked | 27, 32 — requires manual Settings → Payment update |
| RESEND_WEBHOOK_SECRET | Blocked | 33 — requires Resend dashboard webhook signing secret |

---

## 4. System Architecture

EduChamp runs as a single Node.js process serving both the Express API and the Vite-built React frontend. In development, Vite runs as a middleware plugin within the Express server. In production, the Vite build outputs static assets that Express serves directly.

The server entry point is `server/_core/index.ts`. It registers middleware in this order: trust proxy, Helmet security headers, rate limiting on public LLM endpoints, raw-body parsing for Stripe and Resend webhooks (before `express.json()`), storage proxy, OAuth routes, SSE tutor streaming, scheduled heartbeat endpoints, dynamic sitemap, tRPC router at `/api/trpc`, and finally Vite middleware or static file serving.

The database is MySQL-compatible (TiDB Cloud) accessed via Drizzle ORM. All schema changes are managed through `drizzle-kit generate` followed by `webdev_execute_sql` — never through direct `ALTER TABLE` in application code. The `drizzle/schema.ts` file is the single source of truth for the data model.

All client–server communication uses tRPC 11 with Superjson serialisation, meaning `Date` objects are preserved end-to-end without manual serialisation. Public procedures use `publicProcedure`; authenticated procedures use `protectedProcedure`; admin-only procedures use an inline `adminProcedure` guard that checks `ctx.user.role === "admin"`.

---

## 5. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | React 19 | Vite 6 build tooling |
| UI components | shadcn/ui + Tailwind CSS 4 | OKLCH colour format in `@theme` blocks |
| Routing | wouter 3.7 | Patched for React 19 compatibility |
| State / data fetching | tRPC 11 + TanStack Query | Superjson serialisation |
| Backend framework | Express 4 | Single process, no separate API server |
| RPC layer | tRPC 11 | Procedures defined in `server/routers.ts` and sub-routers |
| Database | MySQL / TiDB Cloud | Drizzle ORM, migrations in `drizzle/migrations/` |
| Authentication | Manus OAuth 2.0 | JWT session cookie, `server/_core/oauth.ts` |
| AI / LLM | Manus Built-in Forge API | `server/_core/llm.ts`, `invokeLLM()` helper |
| AI streaming | SSE endpoint | `/api/tutor/stream`, `server/tutorStream.ts` |
| Email | Resend SDK | `server/emailService.ts`, from `invites@educhamp.app` |
| Payments | Stripe | Checkout Sessions, Customer Portal, webhooks |
| File storage | Manus S3 proxy | `server/storage.ts`, `/manus-storage/` path |
| Testing | Vitest | 141 tests, `server/*.test.ts` |
| Type checking | TypeScript 5 | Strict mode, 0 errors |
| Package manager | pnpm | Workspace root |

---

## 6. File & Folder Structure

```
educhamp/
├── client/
│   ├── index.html              ← GTM snippet, favicon, SEO meta, PWA manifest link
│   ├── public/
│   │   ├── favicon.ico         ← 16/32/48px ICO
│   │   ├── manifest.json       ← PWA manifest with 192/512px icons
│   │   └── robots.txt          ← Disallows /admin, /diagnostic, /quiz, /parent
│   └── src/
│       ├── App.tsx             ← Route map + global providers
│       ├── index.css           ← Design tokens, 6 colour palettes, global styles
│       ├── main.tsx            ← Provider tree root
│       ├── const.ts            ← getLoginUrl(), app constants
│       ├── components/
│       │   ├── DashboardLayout.tsx     ← Sidebar, trial banner, locked-access overlay
│       │   ├── NavTooltip.tsx          ← Reusable accessible tooltip wrapper (Sprint 37)
│       │   ├── AIChatBox.tsx           ← Reusable chat UI with streaming
│       │   ├── CheckoutModal.tsx       ← Stripe checkout with coupon entry
│       │   └── ui/                     ← shadcn/ui component library
│       ├── contexts/
│       │   ├── ThemeContext.tsx
│       │   └── PaletteContext.tsx      ← 6 colour palettes
│       ├── lib/
│       │   ├── trpc.ts                 ← tRPC client binding
│       │   ├── analytics.ts            ← GTM dataLayer push helpers (Sprint 31)
│       │   └── tooltipContent.ts       ← Central tooltip registry (Sprint 37)
│       └── pages/
│           ├── Home.tsx                ← Student dashboard
│           ├── LandingPage.tsx         ← Public marketing page
│           ├── Curriculum.tsx
│           ├── UnitDetail.tsx
│           ├── LessonDetail.tsx
│           ├── Tutor.tsx               ← EduBot AI tutor
│           ├── Diagnostic.tsx
│           ├── DiagnosticResults.tsx
│           ├── Quiz.tsx
│           ├── Progress.tsx
│           ├── SkillIndex.tsx
│           ├── Parent.tsx              ← Parent Dashboard
│           ├── Billing.tsx
│           ├── Profile.tsx
│           ├── Referrals.tsx
│           ├── AdminDashboard.tsx      ← Full admin console
│           ├── CheckoutSuccess.tsx
│           └── CourseWelcome.tsx
├── drizzle/
│   ├── schema.ts               ← Single source of truth for all tables
│   ├── relations.ts
│   ├── migrations/             ← Auto-generated SQL (0000–0024)
│   └── meta/_journal.json
├── server/
│   ├── _core/
│   │   ├── index.ts            ← Express app bootstrap
│   │   ├── context.ts          ← tRPC context (user, req, res)
│   │   ├── trpc.ts             ← publicProcedure, protectedProcedure
│   │   ├── llm.ts              ← invokeLLM() helper
│   │   ├── env.ts              ← Typed env var access
│   │   └── oauth.ts            ← Manus OAuth flow
│   ├── routers/
│   │   ├── admin.ts            ← All admin procedures
│   │   ├── payment.ts          ← Stripe checkout, portal, subscription status
│   │   ├── parent.ts
│   │   ├── coParent.ts
│   │   ├── onboarding.ts
│   │   ├── landing.ts
│   │   ├── newsletter.ts
│   │   └── rbac.ts
│   ├── routers.ts              ← Top-level appRouter composition
│   ├── db.ts                   ← Query helpers
│   ├── emailService.ts         ← Resend SDK wrapper + suppression guard
│   ├── emailTemplates/
│   │   ├── trialWelcome.ts     ← Trial start email (Sprint 31)
│   │   ├── trialExpiry.ts      ← T-3 day reminder (Sprint 35)
│   │   └── ...
│   ├── stripeWebhook.ts        ← Stripe webhook handler
│   ├── resendWebhook.ts        ← Resend delivery/bounce webhook (Sprint 33)
│   ├── stripe.ts               ← Stripe client + PLANS map
│   ├── storage.ts              ← S3 helpers
│   └── tutorStream.ts          ← SSE streaming endpoint
├── shared/
│   ├── const.ts
│   └── types.ts
├── docs/
│   ├── sprint-32-setup-guide.md       ← DNS + Stripe + GTM setup guide
│   └── ga4-funnel-exploration-guide.md
├── reports/
│   ├── EduChamp-Project-Handoff.md    ← v1 (Sprint 26)
│   └── educhamp_handoff_v2.md         ← This document (Sprint 37)
├── scripts/
│   ├── create-stripe-products.mjs
│   └── resend-domain-setup.mjs
├── drizzle.config.ts
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
└── todo.md                     ← Full sprint history and feature checklist
```

---

## 7. Authentication & Authorization

Authentication is handled by Manus OAuth 2.0. The flow is:

1. Frontend calls `getLoginUrl(returnPath?)` from `client/src/const.ts`, which encodes `window.location.origin` and the return path into the OAuth `state` parameter.
2. User is redirected to the Manus OAuth portal.
3. On return, `/api/oauth/callback` exchanges the code for a user token, creates or updates the `users` row, sets a signed JWT session cookie, and redirects to the original return path.
4. Every tRPC request builds context in `server/_core/context.ts` by verifying the JWT cookie and loading the user. `ctx.user` is available in all procedures.

New users are redirected to the appropriate onboarding wizard (`/onboarding/parent` or `/onboarding/student`) after their first login. The redirect logic checks `userProfiles.onboardingCompleted`.

**Role model:** The `users` table has a `role` column (`admin` | `user`) and an `accountType` column (`student` | `parent` | `teacher`). Admin procedures check `ctx.user.role === "admin"`. Student-only procedures (quiz, diagnostic, mastery) check `ctx.user.accountType === "student"` via a `studentProcedure` guard. Parent-only routes are enforced both server-side and client-side.

**User status:** The `users.status` column (`active` | `suspended` | `archived` | `deleted`) is checked in `authenticateRequest`. Suspended or deleted users receive a 401 on every API call.

**2FA:** TOTP-based two-factor authentication is implemented via `auth.setup2FA`, `auth.verify2FA`, `auth.disable2FA`, and `auth.generateBackupCodes` procedures. The `twoFactorAuth` table stores the TOTP secret and encrypted backup codes.

---

## 8. Database Schema

The database has 40+ tables managed by Drizzle ORM. The following table summarises the most important ones.

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | Core user accounts | id, email, name, role, accountType, status, billingPeriod, stripeCustomerId |
| `userProfiles` | Extended demographics + personalisation | userId, gradeLevel, dob, colorPalette, displayName, preferredName, aiWelcomeMessage, onboardingCompleted |
| `courses` | Course catalogue | courseCode, title, subject, gradeLevel, isActive, isDefault, diagnosticCooldownDays |
| `userCourseEnrollments` | Student–course links | userId, courseId, isActive, enrolledAt |
| `units` | Curriculum units | courseId, unitNumber, title, teksCode |
| `lessons` | Lessons within units | unitId, title, explanation, workedExamples, guidedProblems, independentProblems |
| `skills` | Skill tags | unitId, skillCode, name, prerequisites |
| `quizQuestions` | Quiz question bank | unitId, question, choices, correctAnswer, difficulty, explanation |
| `diagnosticQuestions` | Diagnostic question bank | courseId, unitNumber, question, choices, correctAnswer, difficulty |
| `userMastery` | Per-skill mastery scores | userId, skillId, masteryScore (0–100), lastUpdated |
| `unitProgress` | Unit completion state | userId, unitId, isCompleted, lessonsCompleted, quizScore |
| `lessonProgress` | Lesson view tracking | userId, lessonId, isCompleted, completedAt |
| `quizAttempts` | Quiz submission history | userId, unitId, score, answers, completedAt |
| `diagnosticAttempts` | Diagnostic submission history | userId, courseId, score, prereqScore, unitResults, completedAt |
| `parentChildren` | Parent–student links | parentId, childId, nickname, gradeLevel, relationship |
| `coParentAccess` | Co-parent read access | studentId, coParentUserId, invitedByParentId, isActive |
| `coParentInvitations` | Co-parent invite tokens | studentId, invitedByParentId, inviteeEmail, token, status, expiresAt |
| `parentInviteTokens` | Parent invite tokens from students | parentId, childId, token, status, expiresAt, resendCount |
| `studentInviteTokens` | Parent-issued student invite tokens | parentId, childId, token, status, expiresAt |
| `parentGoals` | Academic goals per child | parentId, childId, goalText, targetDate, isCompleted |
| `parentNotes` | Private notes per child | parentId, childId, noteText |
| `referrals` | Referral codes | referrerId, code, clickCount, signupCount, isActive |
| `subscriptions` | Stripe subscription state | userId, stripeCustomerId, stripeSubscriptionId, planName, billingPeriod, status, trialEnd, currentPeriodEnd |
| `coupons` | Promotional discount codes | code, discountType, discountValue, usageLimit, status |
| `couponRedemptions` | Coupon usage history | couponId, userId, redeemedAt, planName, discountApplied |
| `paymentAuditLog` | Stripe event log | userId, event, stripeEventId, amount, status, metadata |
| `emailLogs` | Outbound email log | toEmail, subject, templateName, status, messageId, deliveryStatus, deliveryUpdatedAt, referenceId |
| `emailSuppression` | Bounce/complaint suppression list | email, reason, isActive, suppressedAt, resendEventId |
| `suppressionAuditLog` | Admin suppression actions | suppressionId, email, action, adminId, notes, createdAt |
| `platformSettings` | Key-value platform config | key, value, category, label |
| `adminAuditLog` | Admin action history | adminId, action, targetType, targetId, details |
| `adminRoles` | RBAC role definitions | name, description, isSystem |
| `rolePermissions` | Role–permission matrix | roleId, resource, action |
| `adminRoleAssignments` | User–role assignments | userId, roleId, assignedBy, isActive |
| `cmsContent` | CMS content blocks | key, section, value, publishedValue, isDraft, version |
| `cmsContentHistory` | CMS version history | contentId, version, value, changedBy |
| `newsletterSubscriptions` | Email subscribers | email, role, segment, subscribedAt |
| `newsletterCampaigns` | Email campaigns | title, subject, htmlContent, status, sentAt |
| `chatSessions` | Landing page chat leads | sessionToken, visitorName, visitorEmail, status |
| `chatMessages` | Chat message history | sessionId, role, content |
| `demoRequests` | ISD demo request CRM | fullName, schoolName, email, numStudents, status, assignedTo |

---

## 9. API Structure (tRPC Routers)

The top-level `appRouter` in `server/routers.ts` merges the following sub-routers. All procedures are accessed from the frontend via `trpc.<router>.<procedure>.useQuery/useMutation`.

| Router | File | Key Procedures |
|---|---|---|
| `auth` | `routers.ts` (inline) | `me`, `logout` |
| `curriculum` | `routers.ts` (inline) | `getUnits`, `getUnit`, `getLessons`, `getLesson`, `markLessonComplete` |
| `quiz` | `routers.ts` (inline) | `getQuestions`, `submitQuiz`, `getAttempts` |
| `progress` | `routers.ts` (inline) | `getDashboard`, `getAllCourseProgress`, `getMastery`, `getSkillIndex` |
| `diagnostic` | `routers.ts` (inline) | `getQuestions`, `submitDiagnostic`, `getLatestAttempt`, `getStatus`, `getAllAttempts` |
| `tutor` | `routers.ts` (inline) | `chat`, `getHistory`, `clearHistory` |
| `admin` | `routers/admin.ts` | `getStats`, `listUsers`, `updateUserRole`, `createUser`, `updateUserStatus`, `listCourses`, `createCourse`, `getSettings`, `upsertSetting`, `getAuditLog`, `getCmsContent`, `updateCmsContent`, `publishCmsContent`, `getEmailLogs`, `getEmailLogStats`, `listSuppressions`, `unsuppressEmail`, `suppressEmailManual`, `exportSuppressions`, `getSuppressionAuditLog`, `listDemoRequests`, `updateDemoRequest`, `respondToDemoRequest`, `listCoupons`, `createCoupon`, `updateCoupon`, `getSubscriptions` |
| `payment` | `routers/payment.ts` | `createCheckoutSession`, `validateCoupon`, `getSubscriptionStatus`, `getMySubscription`, `getPaymentHistory`, `createPortalSession` |
| `parent` | `routers/parent.ts` | `enrollChild`, `listChildren`, `removeChild`, `getChildProgress`, `updateChildNickname` |
| `coParent` | `routers/coParent.ts` | `inviteCoParent`, `acceptInvitation`, `listCoParents`, `revokeAccess`, `listMyStudents` |
| `onboarding` | `routers/onboarding.ts` | `getProfile`, `saveStudentProfile`, `saveParentProfile`, `generateGoalAlignment`, `completeOnboarding`, `createStudentInvite`, `acceptStudentInvite`, `saveBillingPeriod`, `savePersonalization` |
| `landing` | `routers/landing.ts` | `getStats`, `chat`, `startSession`, `updateSessionInfo`, `submitDemoRequest`, `subscribeNewsletter` |
| `newsletter` | `routers/newsletter.ts` | `listCampaigns`, `createCampaign`, `sendCampaign`, `getSubscribers`, `exportSubscribers`, `aiNewsBotSearch`, `generateDraft` |
| `authEnhancements` | `routers/authEnhancements.ts` | `requestPasswordReset`, `validateResetToken`, `setup2FA`, `verify2FA`, `disable2FA`, `generateBackupCodes` |
| `parentTools` | `routers/parentTools.ts` | `createGoal`, `listGoals`, `completeGoal`, `createNote`, `listNotes`, `skillGapAnalysis`, `getReportData` |
| `referral` | `routers/referral.ts` | `createCode`, `listMyCodes`, `lookupCode`, `redeemCode` |
| `rbac` | `routers/rbac.ts` | `listRoles`, `createRole`, `updateRole`, `duplicateRole`, `deleteRole`, `assignRole`, `revokeRole`, `getUserPermissions` |
| `system` | `server/_core/systemRouter.ts` | `notifyOwner` |

---

## 10. Curriculum & Course Structure

The platform hosts 56+ courses organised by grade level and subject. Each course has 12 units; each unit has multiple lessons; each lesson has explanation text, worked examples, guided practice problems, and independent practice problems.

| Grade Band | Courses |
|---|---|
| Grade 3 | Math, ELA, Science, Social Studies |
| Grade 4–8 | Math, ELA, Science, Social Studies, Technology (ACA + KAP variants) |
| Grade 9 | Algebra I, English I, Biology I, AP Human Geography, Spanish 2 |
| AP / SAT | AP Chemistry, AP Statistics, AP Calculus BC, AP Literature, AP Business, SAT Prep |

Each course has a diagnostic question bank of 57 questions. The Fisher-Yates shuffle is applied per call so each retest draws a different question set.

**Progression logic:** After the diagnostic, all non-mastered units are unlocked for flexible navigation. Unit N+1 is locked until Unit N meets the completion gate: all lessons viewed AND quiz score ≥ 60%. The `submitQuiz` procedure updates mastery scores and unlocks the next unit in the same course.

---

## 11. Adaptive Learning Engine

The adaptive learning engine operates at three levels:

**Placement:** The diagnostic test scores each unit with a `masteryScore` (0–100). Units scoring ≥ 75 are marked "mastered" and the student is directed to start from the lowest-scoring non-mastered unit.

**Mastery levels:** Five levels are defined — Beginner (0–39), Developing (40–59), Approaching (60–74), Mastered (75–89), Advanced (90–100). These labels appear in the student dashboard, parent dashboard, and progress charts.

**Adaptive path unlock:** After a unit quiz, the score determines the next step: below 60% triggers remediation mode in EduBot; 60–74% unlocks guided practice; 75–89% unlocks the next unit; 90%+ unlocks challenge mode. This logic is implemented in `submitQuiz` and surfaced in the `getDashboard` response.

**AI Tutor context injection:** Every EduBot session receives a system prompt built by `buildTutorSystemPrompt()` in `server/tutorStream.ts`. The prompt includes the student's preferred name, active course title and units, per-unit mastery scores, parent goal context (if set), student demographics (grade, school type), and mode-specific instructions.

---

## 12. AI Tutor Architecture (EduBot)

EduBot is powered by the Manus Built-in Forge API via `invokeLLM()`. It operates in six modes:

| Mode | Behaviour |
|---|---|
| Teach | Explains concepts with examples, checks for understanding |
| Practice | Generates practice problems at the student's mastery level |
| Quiz | Timed quiz simulation with immediate feedback |
| Exam Review | Comprehensive review of all units, exam-style questions |
| Remediation | Targeted re-teaching of weak skills (triggered when quiz score < 60%) |
| Parent Summary | Generates a plain-language progress summary for parents |

Responses are streamed token-by-token via SSE at `/api/tutor/stream`. The frontend uses `EventSource` and renders markdown via the `streamdown` library. Session history is persisted in `tutorSessions` and capped at the last 20 turns. EduBot has a hard guardrail preventing off-topic responses — enforced in the system prompt.

---

## 13. Diagnostic Assessment System

Key behaviours of the diagnostic placement test:

- Each call to `diagnostic.getQuestions` applies Fisher-Yates shuffle to the 57-question bank, drawing 27 questions per session (2 per unit + 3 prerequisite questions). This ensures variable retests.
- A per-course cooldown (`courses.diagnosticCooldownDays`, default 7) prevents retesting too frequently.
- After submission, `submitDiagnostic` saves the attempt, updates `userMastery` scores, and unlocks all non-mastered units for flexible navigation.
- The `DiagnosticResults` page shows per-unit recommendations with Start Here / Take Quiz / Review CTAs.

---

## 14. Parent & Guardian Module

**Child enrollment:** Parents can enroll a child by email lookup or by generating a secure 7-day invite token. Students can also invite a parent from the student onboarding flow. The `parentInviteTokens` table tracks all invitations with resend counts (capped at 10 per 24h).

**Co-parent invitations:** Primary parents can invite a co-parent or guardian. Co-parents get read-only access to the student's progress dashboard.

**Under-16 gate:** Students who declare an age under 16 during onboarding are blocked from course access until a parent account is linked.

**Parent Dashboard features:** Child switcher tabs, per-child progress overview (mastery by unit, quiz scores, placement result), Skill Gap Analysis (skills below 75%), Study Goals panel, Parent Notes, Learning Insights (time trends, improvement rate, quiz score history), Export Report (CSV + print-to-PDF), and cross-course summary table.

---

## 15. Payment & Subscription Architecture

**Plans and pricing:**

| Plan | Monthly | Annual (20% off) |
|---|---|---|
| Family | $19.99/mo | $15.99/mo ($191.88/yr) |
| Premium Family | $29.99/mo | $23.99/mo ($287.88/yr) |
| ISD/School | Custom | Custom (demo request) |

**Checkout flow:** `payment.createCheckoutSession` creates a Stripe Checkout Session with a 14-day free trial, PayPal and ACH payment methods enabled, and `allow_promotion_codes: true`. The session includes `client_reference_id` (user ID) and metadata for webhook correlation.

**Webhook events handled** in `server/stripeWebhook.ts`:

| Event | Action |
|---|---|
| `checkout.session.completed` | Upsert subscription, persist billing period, log coupon redemption, send trial welcome email |
| `customer.subscription.created/updated` | Upsert subscription status |
| `customer.subscription.deleted` | Mark subscription cancelled |
| `invoice.paid` | Log payment event |
| `invoice.payment_failed` | Mark subscription `past_due` |
| `customer.subscription.trial_will_end` | Send trial expiry reminder email (T-3 days) |

**Post-trial recovery:** `DashboardLayout` checks `payment.getMySubscription` on every load. When `status === "past_due"` or `status === "canceled"`, a full-screen locked-access overlay is shown with a direct Stripe Customer Portal button (`PortalButton` component). The `/billing` and `/admin` routes remain accessible.

**Stripe Customer Portal:** `payment.createPortalSession` creates a portal session with `return_url` set to `${origin}/billing` (dynamically resolved from request headers).

---

## 16. Email & Notification Workflows

All transactional email is sent via the Resend SDK in `server/emailService.ts`. The `sendEmail()` function:

1. Checks the `emailSuppression` table for active suppressions before sending.
2. If suppressed, logs a `skipped` entry to `emailLogs` and returns without sending.
3. Attempts delivery with up to 3 retries on failure.
4. Logs every attempt to `emailLogs` with `templateName`, `messageId`, and error details.

**Email templates** (all in `server/emailTemplates/`):

| Template | Trigger | Content |
|---|---|---|
| `trialWelcome.ts` | `checkout.session.completed` | User name, plan, trial end date, 3 quick-start tips, dashboard CTA |
| `trialExpiry.ts` | `customer.subscription.trial_will_end` (T-3 days) | Trial end date, billing date, plan, amount, "what you keep" section, Stripe portal CTA |
| Parent invite | `onboarding.createStudentInvite` | Student name, grade, course, invite link |
| Demo request confirmation | `landing.submitDemoRequest` | Confirmation of demo request, next steps |

**Delivery status tracking:** The Resend webhook at `/api/resend/webhook` handles `email.delivered`, `email.opened`, `email.bounced`, `email.complained`, `email.delivery_delayed`, and `email.failed` events. Each event updates `emailLogs.deliveryStatus` and `emailLogs.deliveryUpdatedAt` by matching the Resend `email_id` to `emailLogs.messageId`.

---

## 17. Email Suppression & Deliverability

The suppression system protects sender reputation by preventing email delivery to addresses that have bounced or complained.

**Architecture:**

- `emailSuppression` table stores suppressed addresses with `reason` (`bounced` | `complained` | `manual`), `isActive`, `suppressedAt`, and `resendEventId`.
- `suppressionAuditLog` table records all admin actions (suppress, unsuppress) with `adminId`, `notes`, and `createdAt`.
- `sendEmail()` checks `isEmailSuppressed()` before every send.
- The Resend webhook (`/api/resend/webhook`) automatically suppresses addresses on `email.bounced` and `email.complained` events.

**Admin suppression management** (Admin Dashboard → Suppression tab):

- Paginated table with search by email, filter by reason and status.
- Manual suppress dialog with email + notes fields.
- Inline audit history per address.
- Unsuppress action with Dialog confirmation modal.
- Export CSV button (UTF-8 BOM, date-stamped filename, respects active filters).

**Suppression badge on user profiles:** The `SuppressionBadge` component appears inline in the Admin Users tab whenever a user's email has an active suppression. It shows reason, suppression date, and a one-click unsuppress button with confirmation dialog.

**Pending configuration:** `RESEND_WEBHOOK_SECRET` must be set in Settings → Secrets using the signing secret from the Resend webhook dashboard.

---

## 18. Admin Portal & CMS

The Admin Console is at `/admin`. It has the following tabs:

| Tab | Capabilities |
|---|---|
| Overview | Platform stats, active course grid |
| Users | Paginated user table, search, role/account-type/status selectors, create user modal, relationship panel |
| Courses | Course list, detail panel, create course modal, bulk enrollment |
| Settings | Categorised key-value platform settings |
| CMS | Section browser, inline rich-text editor, draft/publish workflow, version history |
| RBAC | Role list with permission matrix, create/edit/duplicate/delete roles, user assignment |
| Audit Log | Admin action history with colour-coded action types |
| Newsletter | Subscriber management, AI-drafted campaigns, AI News Bot, analytics |
| Email Logs | Paginated email log with delivery status badges, delivery status filter, stats cards |
| Suppression | Suppression list, search/filter, manual suppress/unsuppress, audit history, CSV export |
| Demo Requests | CRM table with status badges, assignment, respond action, full submission detail |
| Coupon Manager | Full CRUD, redemption history, stats |
| Subscription CRM | Active/cancelled subscriptions, per-user payment history |
| Payment Analytics | KPI cards (MRR, active subs, coupon redemptions, failed payments), charts, CSV export |
| Chat Leads | Landing page chat session management, lead stats, admin notes, status management |

**RBAC:** The `adminRoles`, `rolePermissions`, and `adminRoleAssignments` tables implement a granular permission system. Resources include `users`, `courses`, `cms`, `rbac`, `reports`, `diagnostics`, `settings`. Actions include `view`, `create`, `edit`, `delete`, `approve`, `export`.

---

## 19. Landing Page & Marketing

The landing page at `/landing` includes:

- **Hero section:** Animated headline, trust signals, social proof, dual CTAs, animated EduBot demo widget.
- **Features section:** 6 feature cards with icons.
- **How It Works section:** 3-step process.
- **Courses section:** Grade-band tabs with subject filter pills and live course cards from the database.
- **Schools & Districts section:** Value proposition for ISD decision-makers, "Request a Demo" CTA.
- **Pricing section:** Monthly/annual toggle, plan comparison table, ISD tier.
- **Testimonials section.**
- **FAQ section:** Content driven from CMS table with static fallback.
- **Footer:** Links, newsletter subscription form.
- **AI chatbot widget:** Anonymous visitor chat with lead capture after 3 exchanges.
- **Live stats:** Course count, student count, question count, AI session count from `landing.getStats`.

---

## 20. Analytics & Conversion Tracking

**Google Tag Manager:** The GTM container snippet is embedded in `client/index.html`. The container ID is set via `VITE_GTM_ID`.

**Conversion events** tracked via `client/src/lib/analytics.ts`:

| Event | Fired From | Trigger |
|---|---|---|
| `view_pricing` | LandingPage | IntersectionObserver on pricing section |
| `begin_checkout` | LandingPage | Pricing CTA click |
| `checkout_redirect` | CheckoutModal | Stripe redirect button click |
| `purchase` | CheckoutSuccess | On page mount |
| `trial_started` | CheckoutSuccess | On page mount |

**Pending configuration:** Set `VITE_GTM_ID` in Settings → Secrets. Configure GA4 Measurement ID inside GTM. Toggle `trial_started` as a Conversion in GA4 → Admin → Events. See `docs/ga4-funnel-exploration-guide.md` for the 4-step funnel setup.

---

## 21. Frontend Design System & UX

**Design tokens:** Defined in `client/src/index.css` using CSS custom properties. Dark theme by default with indigo primary (`#4338CA`). Six colour palettes available (indigo, emerald, rose, violet, amber, teal) applied via `PaletteContext`.

**Typography:** Inter (sans-serif) for UI, Lora (serif) for headings. Both loaded via Google Fonts CDN.

**Tooltip system (Sprint 37):** A central registry in `client/src/lib/tooltipContent.ts` holds all tooltip copy in six namespaces: `NAV_TOOLTIPS`, `ADMIN_TAB_TOOLTIPS`, `ADMIN_ACTION_TOOLTIPS`, `BILLING_TOOLTIPS`, `TUTOR_TOOLTIPS`, `DIAGNOSTIC_TOOLTIPS`. The `NavTooltip` component wraps shadcn `Tooltip` with configurable `side`, `align`, and `delayDuration` props. Tooltips are keyboard-accessible and screen-reader-friendly. Wired into: all sidebar nav items, sidebar toggle, user avatar trigger, Admin Dashboard tabs and action buttons, Billing page CTAs, AI Tutor mode buttons, and Diagnostic page buttons.

**Mobile responsiveness:** All pages audited and fixed in Sprint 17. DashboardLayout uses a mobile drawer for the sidebar.

---

## 22. Security & Compliance

- **Helmet:** HTTP security headers applied via `helmet()` middleware.
- **Rate limiting:** Public LLM chatbot endpoint rate-limited.
- **JWT session cookies:** Signed with `JWT_SECRET`, `httpOnly`, `sameSite: strict`.
- **User status check:** `authenticateRequest` rejects suspended/deleted users on every API call.
- **Admin procedure guard:** All admin procedures check `ctx.user.role === "admin"`.
- **Student procedure guard:** Quiz, diagnostic, and mastery procedures check `ctx.user.accountType === "student"`.
- **Stripe webhook verification:** `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`.
- **Resend webhook verification:** Svix signature verification with `RESEND_WEBHOOK_SECRET` (pending configuration).
- **robots.txt:** Disallows `/admin`, `/diagnostic`, `/quiz`, `/parent` from crawlers.
- **Error boundaries:** Raw stack traces hidden from end users in production.
- **DB indexes:** Added on high-traffic `userId` columns.

---

## 23. Testing Strategy

The test suite uses Vitest with 141 tests:

| Test File | Coverage |
|---|---|
| `server/auth.logout.test.ts` | Auth logout procedure |
| `server/mastery.test.ts` | Mastery score calculation, level labels |
| `server/adaptive.test.ts` | Adaptive path unlock logic |
| `server/tutor.test.ts` | Tutor system prompt building, mode validation |
| `server/diagnostic.test.ts` | Diagnostic scoring, cooldown logic |
| `server/payment.test.ts` | Stripe discount calculation, coupon validation, billing period persistence, subscription upsert |
| `server/demoRequest.test.ts` | Demo request validation, admin list procedure |
| `server/inviteExpiry.test.ts` | Invite expiry heartbeat logic |

Run with `pnpm test`. All 141 tests pass as of Sprint 37. TypeScript reports 0 errors (`npx tsc --noEmit`).

---

## 24. Deployment & DevOps

The platform is deployed on the Manus cloud platform (Cloud Run, Node.js only, 1 vCPU, 512 MiB RAM, 180s request timeout, min-instances=0).

**Live domains:**
- `educhamp.app` (primary)
- `www.educhamp.app`
- `educhamp.manus.space`

**Deployment process:** Create a checkpoint via `webdev_save_checkpoint`, then click the Publish button in the Management UI.

**Dev server:** Runs at `http://localhost:3000` via `tsx watch server/_core/index.ts`.

**Build:** `pnpm build` runs `tsc && vite build` to produce the production bundle in `dist/`.

---

## 25. Environment Variables

The following environment variables are automatically injected by the Manus platform:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL (frontend) |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Platform owner identity |
| `BUILT_IN_FORGE_API_URL` | Manus built-in APIs (LLM, storage, notifications) |
| `BUILT_IN_FORGE_API_KEY` | Bearer token for server-side Manus APIs |
| `VITE_FRONTEND_FORGE_API_KEY` | Bearer token for frontend Manus APIs |
| `VITE_FRONTEND_FORGE_API_URL` | Frontend Manus API URL |
| `RESEND_API_KEY` | Resend email sending key (send-only, restricted) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (frontend) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

The following variables must be set manually in Settings → Secrets:

| Variable | Status | Action Required |
|---|---|---|
| `VITE_GTM_ID` | Needs value | Paste GTM container ID (e.g. `GTM-XXXXXXX`) |
| `RESEND_WEBHOOK_SECRET` | Not set | Paste signing secret from Resend dashboard |
| `STRIPE_WEBHOOK_SECRET` | Needs update | Paste `whsec_f1YtygORnidWD9MTDUYNpKlNU0alyEhm` in Settings → Payment |

---

## 26. Scheduled Jobs & Automation

| Job | Endpoint | Schedule | Logic |
|---|---|---|---|
| Invite expiry | `/api/scheduled/invite-expiry` | Daily 02:00 UTC | Marks expired `parentInviteTokens` as `expired`; creates in-app notifications for affected students |
| Grade promotion | `/api/scheduled/grade-promotion` | Manual / end-of-year | Increments `userProfiles.gradeLevel` for all students in a selected cohort |

Both jobs are idempotent.

---

## 27. Known Issues & Technical Debt

| Issue | Severity | Notes |
|---|---|---|
| Resend DNS not verified | High | `educhamp.app` domain not yet verified in Resend. See `docs/sprint-32-setup-guide.md`. |
| STRIPE_WEBHOOK_SECRET not updated | High | Must paste `whsec_f1YtygORnidWD9MTDUYNpKlNU0alyEhm` in Settings → Payment. |
| RESEND_WEBHOOK_SECRET not set | Medium | Resend webhook events accepted without signature verification. Set in Settings → Secrets. |
| VITE_GTM_ID not set | Medium | GTM snippet in `index.html` but no container ID configured. Set in Settings → Secrets. |
| District logos blocked | Low | Schools section uses text badges. Awaiting signed partnership agreements. |
| VITE_APP_TITLE not updated | Low | Update in Settings → General. |
| N+1 suppression status queries | Low | `SuppressionBadge` fires one query per user row. Replace with batch query for large tables. |
| Tooltip content not admin-editable | Low | Tooltip copy in `tooltipContent.ts`. Could be moved to `platformSettings` for admin editing. |
| No in-app subscription upgrade/downgrade | Medium | Users manage subscription via Stripe Customer Portal only. No in-app "Change Plan" button. |

---

## 28. Pending Enhancements & Roadmap

**Email & Deliverability**
- Open-rate stats card in Email Logs header.
- Per-template delivery breakdown chart.
- Email log CSV export.
- Batch suppression status query to replace N+1 `SuppressionBadge` calls.
- Mid-trial "halfway through your trial" email at day 7.

**Admin & Operations**
- Admin-editable tooltip content via `platformSettings` table.
- Suppression export extended to Email Logs tab.

**Student Experience**
- Onboarding-mode tooltips for first-time users (auto-show for first 3 sidebar items).
- Tooltip coverage for Courses/Curriculum pages.
- In-app "Change Plan" button on `/billing` page.

**Analytics**
- GA4 Funnel Exploration setup (guide at `docs/ga4-funnel-exploration-guide.md`).
- Google Ads / Meta Ads conversion action pointing to `trial_started` event.

**Platform**
- Mobile app (React Native) — not scoped.
- PayPal standalone flow — TBD.
- Auto-generated demo coupon for ISD leads.

---

## 29. Sprint History

| Sprint | Key Deliverables |
|---|---|
| 1–5 | Core platform: auth, Algebra I curriculum, diagnostic, mastery, quiz, AI tutor, parent dashboard |
| 6 | Multi-course dashboard, guided tour, grade management, multi-course enrollment |
| 7 | AP/SAT courses, auto-enrollment, CourseSwitcher |
| 8 | Course-aware diagnostic, personalisation (colour palettes, display name) |
| 9 | Course-aware diagnostic first-run, auto-redirect, correct course labels |
| 10 | Curriculum course-awareness, AI tutor course context, preferred name |
| 11 | Course welcome gate, diagnostic question banks for all courses |
| 12 | EduBot personality, landing page redesign, role-based tutor, onboarding improvements |
| 13 | Newsletter console, AP diagnostic fix, live landing stats, chat lead capture |
| 14 | EduBot personality and course guardrails, Grades 4–8 catalogue (ACA + KAP) |
| 15 | AP diagnostic fix, grade-aware auto-enrollment, expanded diagnostic banks |
| 16 | FAQ/landing update, onboarding fixes, intelligent course enrollment, QA/UAT |
| 17 | Diagnostic course name fix, logo/favicon, mobile responsiveness |
| 18 | Course-specific diagnostic cooldown, enhanced user/course management, CMS, RBAC |
| 19 | Student-to-parent invitation workflow redesign |
| 20 | Transactional email (Resend), invite status banner, resend workflow |
| 21 | Custom Resend sender domain, Email Logs admin tab, invite expiry heartbeat |
| 22 | ISD demo request CRM, annual billing toggle, pricing comparison table |
| 23 | DNS verification guide, Schools hero section, annual billing flow |
| 24 | Schools nav link, billingPeriod server persistence |
| 25 | Stripe integration (checkout, webhooks, coupon manager, subscription CRM, payment analytics) |
| 26 | Stripe products created, PayPal/ACH payment methods |
| 27 | 14-day free trial, Stripe webhook registration |
| 28 | Custom favicon, PWA manifest, SEO metadata |
| 29 | Trial pricing labels, trial reminder webhook, robots.txt, sitemap |
| 30 | Trial active banner, Google Search Console guide |
| 31 | Post-trial locked-access overlay, trial welcome email, GTM/GA4 analytics |
| 32 | DNS setup guide, Stripe webhook secret instructions, GTM conversion goals guide |
| 33 | Resend bounce suppression, Stripe Customer Portal direct link, GA4 funnel guide |
| 34 | Portal return URL fix, Admin Suppression Management tab, suppression badge, reusable skill |
| 35 | CSV export for suppression, trial expiry reminder email, unsuppress confirmation modal |
| 36 | Email delivery status column in Admin Email Logs |
| 37 | Contextual tooltip system across all major pages |

---

## 30. Developer Setup Guide

To set up a local development environment:

```bash
# Clone the repository
git clone <repo-url>
cd educhamp

# Install dependencies
pnpm install

# Start the development server
pnpm dev
# Server runs at http://localhost:3000

# Run tests
pnpm test

# Type check
npx tsc --noEmit

# Generate a new migration after schema changes
pnpm drizzle-kit generate
# Then apply via webdev_execute_sql in the Manus Management UI
```

**Adding a new feature (standard workflow):**

1. Update `drizzle/schema.ts` with new tables or columns.
2. Run `pnpm drizzle-kit generate` to produce migration SQL.
3. Apply migration via `webdev_execute_sql`.
4. Add query helpers in `server/db.ts`.
5. Add or extend procedures in `server/routers.ts` or a sub-router in `server/routers/`.
6. Build the frontend page in `client/src/pages/`.
7. Register the route in `client/src/App.tsx`.
8. Write Vitest tests in `server/*.test.ts`.
9. Run `pnpm test` and `npx tsc --noEmit` to verify.
10. Update `todo.md` with completed items.
11. Save a checkpoint via `webdev_save_checkpoint`.

**Key files to read first when onboarding:**

- `drizzle/schema.ts` — full data model
- `server/routers.ts` — API surface
- `client/src/App.tsx` — route map
- `client/src/components/DashboardLayout.tsx` — main app shell
- `todo.md` — full sprint history and feature checklist
- `reports/educhamp_handoff_v2.md` — this document

---

*This document was generated by Manus AI on May 28, 2026. It reflects the state of the EduChamp platform at checkpoint `0a40ab58` (Sprint 37). For questions or updates, refer to `todo.md` for the full feature checklist and sprint history.*
