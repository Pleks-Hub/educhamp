# EduChamp — Comprehensive Project Handoff Document

**Version:** 3.0 · **Date:** May 29, 2026 · **Author:** Manus AI
**Checkpoint:** `eec9367` (Sprint 46 — Production Readiness)
**Live domains:** `educhamp.app`, `www.educhamp.app`, `educhamp.co`, `educhamp.manus.space`
**Repository path:** `/home/ubuntu/educhamp`
**Test status:** 234 tests passing, 0 TypeScript errors

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview & Target Users](#2-product-overview--target-users)
3. [Implementation Status — All Features](#3-implementation-status--all-features)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [File & Folder Structure](#6-file--folder-structure)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Database Schema — All 50 Tables](#8-database-schema--all-50-tables)
9. [API Structure — tRPC Routers](#9-api-structure--trpc-routers)
10. [Curriculum & Course Structure](#10-curriculum--course-structure)
11. [Adaptive Learning Engine](#11-adaptive-learning-engine)
12. [AI Tutor Architecture (EduBot)](#12-ai-tutor-architecture-edubot)
13. [Diagnostic Assessment System](#13-diagnostic-assessment-system)
14. [Parent & Guardian Module](#14-parent--guardian-module)
15. [Parent-Approval Course Assignment Workflow](#15-parent-approval-course-assignment-workflow)
16. [Payment & Subscription Architecture](#16-payment--subscription-architecture)
17. [Email & Notification Workflows](#17-email--notification-workflows)
18. [Email Suppression & Deliverability](#18-email-suppression--deliverability)
19. [Admin Portal & CMS](#19-admin-portal--cms)
20. [Inactivity Monitoring & Re-Engagement](#20-inactivity-monitoring--re-engagement)
21. [Landing Page & Marketing](#21-landing-page--marketing)
22. [Analytics & Conversion Tracking](#22-analytics--conversion-tracking)
23. [Frontend Design System & UX](#23-frontend-design-system--ux)
24. [Performance & Bundle Architecture](#24-performance--bundle-architecture)
25. [PWA & Offline Support](#25-pwa--offline-support)
26. [Security & Compliance](#26-security--compliance)
27. [Testing Strategy](#27-testing-strategy)
28. [Deployment & DevOps](#28-deployment--devops)
29. [Environment Variables](#29-environment-variables)
30. [Scheduled Jobs & Automation](#30-scheduled-jobs--automation)
31. [Known Issues & Technical Debt](#31-known-issues--technical-debt)
32. [Pending Enhancements & Roadmap](#32-pending-enhancements--roadmap)
33. [Sprint History](#33-sprint-history)
34. [Developer Setup Guide](#34-developer-setup-guide)

---

## 1. Executive Summary

EduChamp is an AI-powered adaptive learning platform for K–12 students in Texas, with a primary focus on TEKS-aligned curriculum across Grades 3–12 and AP/SAT courses. The platform combines a structured curriculum browser, an AI tutor named EduBot, a diagnostic placement engine, per-skill mastery tracking, a quiz engine, a parent/guardian monitoring dashboard, and a full-featured admin console into a single cohesive product.

The business model is a subscription SaaS platform with three tiers: a free-to-start tier, a Family Plan ($19.99/mo or $15.99/mo billed annually), and a Premium Family Plan ($29.99/mo or $23.99/mo billed annually). A fourth tier — ISD/School Licensing — targets school district administrators and is sold through a demo-request and sales pipeline. As of Sprint 46, the platform is fully production-deployed at `educhamp.app` and `educhamp.co`, with **234 automated tests passing**, 0 TypeScript errors, Stripe integration live, a comprehensive email deliverability and suppression system in place, and all production performance issues resolved.

**Key milestone since v2 handoff (Sprint 37 → Sprint 46):** The platform had a critical blank-page regression on all production domains caused by two independent issues — a Helmet.js CSP blocking the Manus platform's inline runtime script, and a 10.9 MB JavaScript bundle exceeding the platform's 5-second readiness timeout. Both were diagnosed and resolved. The initial load bundle was reduced from 2,032 KB to 1,306 KB gzip (36% reduction). Nine additional sprints of feature development were also completed, including the Parent-Approval Course Assignment Workflow, Inactivity Monitoring, Admin Bulk Actions, PWA support, and cross-browser compatibility fixes.

---

## 2. Product Overview & Target Users

EduChamp serves four distinct user personas, each with a dedicated interface and workflow.

**Students (Grades 3–12)** are the primary learners. They complete a diagnostic placement test, follow an adaptive curriculum path, interact with EduBot in six modes (Teach, Practice, Quiz, Exam Review, Remediation, Parent Summary), and track mastery across individual skills. Students can be enrolled by parents or sign up independently and invite a parent afterward. Under-16 students require a parent/guardian account to be linked before gaining full course access.

**Parents and Guardians** monitor one or more children's progress from a dedicated Parent Dashboard. They receive AI-generated learning summaries, set academic goals, invite co-parents or guardians, approve or reject their child's course enrollment requests, and manage their subscription and billing. The Premium Family Plan supports up to three student accounts under one parent subscription.

**School/District Administrators (ISD)** are enterprise leads who submit demo requests through the landing page. Their inquiries are tracked in a CRM pipeline within the Admin Console. This tier is not yet self-service; it is managed through a sales workflow.

**Platform Administrators** access the full Admin Console, which includes user management, course and curriculum CMS, coupon management, subscription CRM, payment analytics, newsletter management, demo request pipeline, RBAC role management, email logs with delivery status, email suppression management, inactivity monitoring, bulk user operations, platform settings, and audit logs.

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
| Admin Console — Inactivity Monitoring tab | Complete | 40 |
| Admin Console — Bulk User Actions | Complete | 42 |
| Stripe integration (checkout, webhooks, portal) | Complete | 25, 26, 27 |
| Stripe webhook smoke tests (16 unit tests) | Complete | 46 |
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
| Inactivity notification emails (7/14/30-day tiers) | Complete | 40 |
| Course request notification email (parent approval) | Complete | 38, 39 |
| Email suppression (bounce/complaint webhook) | Complete | 33 |
| Email delivery status tracking (delivered/opened/bounced) | Complete | 36 |
| Suppression badge on admin user profiles | Complete | 34 |
| Parent-Approval Course Assignment Workflow | Complete | 38, 39 |
| Course request result page (/course-request/result) | Complete | 39 |
| Live pending request count badge (Parent Dashboard nav) | Complete | 39 |
| Student re-engagement banner (WelcomeBackBanner) | Complete | 42 |
| Google Tag Manager / GA4 analytics | Complete | 31 |
| Conversion event tracking (5 events) | Complete | 31 |
| Contextual tooltip system (all major pages) | Complete | 37 |
| Custom favicon + PWA manifest | Complete | 28, 42 |
| PWA service worker (vite-plugin-pwa) | Complete | 42 |
| PWA update prompt toast | Complete | 42 |
| SEO metadata + OG/Twitter cards | Complete | 28 |
| robots.txt + dynamic sitemap | Complete | 29 |
| Helmet security headers | Complete | Production |
| Rate limiting (public LLM endpoint) | Complete | Production |
| DB indexes on high-traffic columns | Complete | Production |
| Invite expiry heartbeat job | Complete | 21 |
| Grade promotion heartbeat job | Complete | 6 |
| Inactivity monitor heartbeat job (daily) | Complete | 40 |
| Mobile responsiveness (all pages) | Complete | 17 |
| Cross-browser compatibility (Safari, Firefox, Brave) | Complete | 41 |
| React.lazy code splitting (90% bundle reduction) | Complete | 41 |
| CSP blank-page fix (Helmet + Manus runtime) | Complete | 44 |
| Bundle size fix (10.9 MB → 1.3 MB gzip initial load) | Complete | 45 |
| Tutor page loading skeleton (vendor-shiki lazy load) | Complete | 46 |
| Self-hosted fonts (Inter + Lora, Google Fonts CDN removed) | Complete | 46 |
| 2FA (TOTP + backup codes) | Complete | authEnhancements |
| Password reset flow | Complete | authEnhancements |
| District logos in Schools section | Blocked | 24 — awaiting partnership agreements |
| VITE_APP_TITLE update | Blocked | 28 — requires manual Settings → General update |
| Resend DNS verification | Blocked | 27, 32 — requires manual DNS records at registrar |
| STRIPE_WEBHOOK_SECRET update | Blocked | 27, 32 — requires manual Settings → Payment update |
| RESEND_WEBHOOK_SECRET | Blocked | 33 — requires Resend dashboard webhook signing secret |

---

## 4. System Architecture

EduChamp runs as a single Node.js process serving both the Express API and the Vite-built React frontend. In development, Vite runs as a middleware plugin within the Express server. In production, the Vite build outputs static assets that Express serves directly from `dist/public/`.

The server entry point is `server/_core/index.ts`. It registers middleware in this strict order:

1. `trust proxy` — required for Cloud Run behind Cloudflare
2. `helmet()` with `contentSecurityPolicy: false` — CSP disabled because the Manus platform injects an inline `manus-runtime` script that `script-src 'self'` would block
3. `express.raw({ type: 'application/json' })` for `/api/stripe/webhook` — **must** precede `express.json()` for Stripe signature verification
4. `express.raw({ type: 'application/json' })` for `/api/resend/webhook` — same reason
5. `express.json({ limit: '50mb' })` and `express.urlencoded({ limit: '50mb' })`
6. Rate limiter on `/api/trpc` (general) and `/api/tutor/stream` (SSE, stricter)
7. Storage proxy at `/manus-storage/`
8. Manus OAuth routes (`/api/oauth/*`)
9. SSE tutor streaming at `/api/tutor/stream`
10. Scheduled heartbeat endpoints (`/api/scheduled/*`)
11. Email token course-request handler (`GET /api/course-request/token`)
12. Dynamic sitemap generator (`GET /api/sitemap.xml`)
13. tRPC router at `/api/trpc`
14. Vite middleware (dev) or static file serving (prod)

The database is MySQL-compatible (TiDB Cloud) accessed via Drizzle ORM. All schema changes are managed through `pnpm drizzle-kit generate` followed by `webdev_execute_sql` — never through direct `ALTER TABLE` in application code. The `drizzle/schema.ts` file is the single source of truth for the data model.

All client–server communication uses tRPC 11 with Superjson serialisation, meaning `Date` objects are preserved end-to-end without manual serialisation. Public procedures use `publicProcedure`; authenticated procedures use `protectedProcedure`; admin-only procedures use an inline `adminProcedure` guard that checks `ctx.user.role === "admin"`.

---

## 5. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | React 19 | Vite 6 build tooling |
| UI components | shadcn/ui + Tailwind CSS 4 | OKLCH colour format in `@theme` blocks |
| Routing | wouter 3.7 | Patched for React 19 compatibility |
| State / data fetching | tRPC 11 + TanStack Query | Superjson serialisation, `staleTime: 30s`, `retry: 1` |
| Backend framework | Express 4 | Single process, no separate API server |
| RPC layer | tRPC 11 | Procedures in `server/routers.ts` and `server/routers/` |
| Database | MySQL / TiDB Cloud | Drizzle ORM, 50 tables, migrations in `drizzle/migrations/` |
| Authentication | Manus OAuth 2.0 | JWT session cookie, `server/_core/oauth.ts` |
| AI / LLM | Manus Built-in Forge API | `server/_core/llm.ts`, `invokeLLM()` helper |
| AI streaming | SSE endpoint | `/api/tutor/stream`, `server/tutorStream.ts` |
| Email | Resend SDK | `server/emailService.ts`, from `invites@educhamp.app` |
| Payments | Stripe | Checkout Sessions, Customer Portal, webhooks |
| File storage | Manus S3 proxy | `server/storage.ts`, `/manus-storage/` path |
| PWA | vite-plugin-pwa + Workbox | Service worker, offline fallback, update prompt |
| Testing | Vitest | 234 tests across 12 test files |
| Type checking | TypeScript 5 | Strict mode, 0 errors |
| Package manager | pnpm | Workspace root |
| Markdown rendering | streamdown | Lazy-loaded; includes KaTeX (math) and Mermaid (diagrams) |
| Syntax highlighting | shiki | Lazy-loaded via `vendor-shiki` chunk (1.6 MB gzip) |

---

## 6. File & Folder Structure

```
educhamp/
├── client/
│   ├── index.html              ← GTM snippet, self-hosted fonts, preload hints, SEO meta, PWA manifest link
│   ├── public/
│   │   ├── favicon.ico         ← 16/32/48px ICO
│   │   ├── manifest.json       ← PWA manifest with 192/512px icons
│   │   ├── offline.html        ← Branded offline fallback page
│   │   └── robots.txt          ← Disallows /admin, /diagnostic, /quiz, /parent
│   └── src/
│       ├── App.tsx             ← Route map + global providers + React.lazy splits
│       ├── index.css           ← Design tokens, 6 colour palettes, global styles
│       ├── main.tsx            ← Provider tree root + Safari polyfills
│       ├── const.ts            ← getLoginUrl(), app constants
│       ├── components/
│       │   ├── DashboardLayout.tsx         ← Sidebar, trial banner, locked-access overlay
│       │   ├── DashboardLayoutSkeleton.tsx ← Loading skeleton during auth checks
│       │   ├── NavTooltip.tsx              ← Accessible tooltip wrapper (Sprint 37)
│       │   ├── AIChatBox.tsx               ← Reusable chat UI with streaming
│       │   ├── CheckoutModal.tsx           ← Stripe checkout with coupon entry
│       │   ├── StreamdownRenderer.tsx      ← Lazy markdown/KaTeX/Mermaid/Shiki renderer
│       │   ├── WelcomeBackBanner.tsx       ← Re-engagement banner for inactive students
│       │   ├── PWAUpdatePrompt.tsx         ← Service worker update toast
│       │   ├── CourseSwitcher.tsx          ← Inline course switcher dropdown
│       │   ├── CourseContextBanner.tsx     ← Active course context display
│       │   ├── GuidedTour.tsx              ← First-login 4-step walkthrough
│       │   ├── EduChampDemoWidget.tsx      ← Landing page animated EduBot demo
│       │   ├── RoleSelectModal.tsx         ← Role selection during onboarding
│       │   ├── RequestDemoModal.tsx        ← ISD demo request modal
│       │   ├── DemoRequestsTab.tsx         ← Admin demo requests CRM tab
│       │   ├── admin/
│       │   │   ├── CouponManagerTab.tsx
│       │   │   ├── PaymentAnalyticsTab.tsx
│       │   │   └── SubscriptionCRMTab.tsx
│       │   └── ui/                         ← shadcn/ui component library (50+ components)
│       ├── contexts/
│       │   ├── ThemeContext.tsx
│       │   └── PaletteContext.tsx          ← 6 colour palettes
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useMobile.tsx
│       │   ├── useComposition.ts
│       │   └── usePersistFn.ts
│       ├── lib/
│       │   ├── trpc.ts                     ← tRPC client binding
│       │   ├── analytics.ts                ← GTM dataLayer push helpers
│       │   ├── tooltipContent.ts           ← Central tooltip registry (Sprint 37)
│       │   └── utils.ts
│       └── pages/
│           ├── Home.tsx                    ← Student dashboard
│           ├── LandingPage.tsx             ← Public marketing page
│           ├── Curriculum.tsx
│           ├── UnitDetail.tsx
│           ├── LessonDetail.tsx
│           ├── Tutor.tsx                   ← EduBot AI tutor with loading overlay
│           ├── Diagnostic.tsx
│           ├── Quiz.tsx
│           ├── Progress.tsx                ← Includes WelcomeBackBanner
│           ├── Skills.tsx
│           ├── CourseCatalog.tsx           ← Course request status badges
│           ├── CourseWelcome.tsx
│           ├── CourseRequestResult.tsx     ← Approval/rejection result page
│           ├── ParentDashboard.tsx         ← Course requests panel + pending badge
│           ├── AdminDashboard.tsx          ← Full admin console (15 tabs)
│           ├── NewsletterConsole.tsx
│           ├── ChatManagement.tsx
│           ├── Billing.tsx
│           ├── Profile.tsx
│           ├── Referrals.tsx
│           ├── CheckoutSuccess.tsx
│           ├── StudentOnboarding.tsx
│           ├── ParentOnboarding.tsx
│           ├── AcceptInvite.tsx
│           ├── JoinPage.tsx
│           ├── ForgotPassword.tsx
│           └── ResetPassword.tsx
├── drizzle/
│   ├── schema.ts               ← Single source of truth for all 50 tables
│   ├── relations.ts
│   ├── migrations/             ← Auto-generated SQL (0000–0026)
│   └── meta/_journal.json
├── server/
│   ├── _core/
│   │   ├── index.ts            ← Express app bootstrap (middleware order is critical)
│   │   ├── context.ts          ← tRPC context (user, req, res)
│   │   ├── trpc.ts             ← publicProcedure, protectedProcedure
│   │   ├── llm.ts              ← invokeLLM() helper
│   │   ├── env.ts              ← Typed env var access
│   │   ├── oauth.ts            ← Manus OAuth flow
│   │   ├── heartbeat.ts        ← Heartbeat job SDK helpers
│   │   ├── imageGeneration.ts  ← generateImage() helper
│   │   ├── notification.ts     ← notifyOwner() helper
│   │   └── systemRouter.ts     ← system.notifyOwner tRPC procedure
│   ├── routers/
│   │   ├── admin.ts            ← All admin procedures (1100+ lines)
│   │   ├── payment.ts          ← Stripe checkout, portal, subscription status
│   │   ├── parent.ts           ← Parent + courseRequestToken routers
│   │   ├── coParent.ts
│   │   ├── onboarding.ts
│   │   ├── landing.ts
│   │   ├── newsletter.ts
│   │   ├── authEnhancements.ts ← Password reset, 2FA
│   │   ├── parentTools.ts      ← Goals, notes, skill gap analysis, report export
│   │   └── referral.ts
│   ├── scheduled/
│   │   ├── inactivityMonitor.ts ← Daily heartbeat: 7/14/30-day inactivity tiers
│   │   └── inviteExpiry.ts      ← Daily heartbeat: expire stale invite tokens
│   ├── emailTemplates/
│   │   ├── trialWelcome.ts
│   │   ├── trialExpiry.ts
│   │   ├── trialReminder.ts
│   │   ├── parentInvite.ts
│   │   ├── courseRequestNotification.ts ← Parent approval request email
│   │   └── inactivityNotification.ts    ← 7/14/30-day inactivity emails
│   ├── routers.ts              ← Top-level appRouter composition
│   ├── db.ts                   ← Query helpers (200+ functions)
│   ├── emailService.ts         ← Resend SDK wrapper + suppression guard
│   ├── stripeWebhook.ts        ← Stripe webhook handler
│   ├── resendWebhook.ts        ← Resend delivery/bounce webhook
│   ├── stripe.ts               ← Stripe client + PLANS map
│   ├── storage.ts              ← S3 helpers
│   └── tutorStream.ts          ← SSE streaming endpoint
├── shared/
│   ├── const.ts
│   └── types.ts
├── docs/
│   ├── sprint-32-setup-guide.md          ← DNS + Stripe + GTM setup guide
│   └── ga4-funnel-exploration-guide.md
├── reports/
│   ├── EduChamp-Project-Handoff.md       ← v1 (Sprint 26)
│   ├── educhamp_handoff_v2.md            ← v2 (Sprint 37)
│   ├── Production-Readiness-Report.md    ← Sprint 21 readiness audit
│   └── project_handoff_summary.md        ← This document (Sprint 46)
├── scripts/
│   ├── create-stripe-products.mjs
│   ├── register-stripe-webhook.mjs
│   ├── resend-domain-setup.mjs
│   └── check-resend-dns.mjs
├── references/
│   └── periodic-updates.md    ← Heartbeat job architecture guide
├── drizzle.config.ts
├── vite.config.ts             ← 11 manual chunk splits for performance
├── vitest.config.ts
├── tsconfig.json
├── package.json
└── todo.md                    ← Full sprint history and feature checklist
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

**User status:** The `users.status` column (`active` | `suspended` | `deactivated` | `pending_verification` | `deleted`) is checked in `authenticateRequest`. Suspended or deleted users receive a 401 on every API call.

**2FA:** TOTP-based two-factor authentication is implemented via `authEnhancements.setup2FA`, `authEnhancements.verify2FA`, `authEnhancements.disable2FA`, and `authEnhancements.generateBackupCodes` procedures. The `twoFactorAuth` table stores the TOTP secret and encrypted backup codes.

**Password reset:** `authEnhancements.requestPasswordReset` generates a token stored in `passwordResetTokens` and sends a reset email. `authEnhancements.validateResetToken` verifies the token and allows the user to set a new password.

---

## 8. Database Schema — All 50 Tables

The database has 50 tables managed by Drizzle ORM across 27 migrations (0000–0026). The following table summarises all tables by domain.

### Core User Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `users` | Core user accounts | id, email, name, role, accountType, status, billingPeriod, stripeCustomerId, lastActiveAt |
| `userProfiles` | Extended demographics + personalisation | userId, gradeLevel, dob, colorPalette, displayName, preferredName, aiWelcomeMessage, onboardingCompleted |
| `twoFactorAuth` | TOTP 2FA state | userId, secret, isEnabled, backupCodes |
| `passwordResetTokens` | Password reset tokens | userId, token, expiresAt, usedAt |

### Curriculum Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `courses` | Course catalogue | courseCode, title, subject, gradeLevel, isActive, isDefault, diagnosticCooldownDays |
| `userCourseEnrollments` | Student–course links | userId, courseId, isActive, enrolledAt |
| `units` | Curriculum units | courseId, unitNumber, title, teksCode |
| `lessons` | Lessons within units | unitId, title, explanation, workedExamples, guidedProblems, independentProblems |
| `skills` | Skill tags | unitId, skillCode, name, prerequisites |
| `quizQuestions` | Quiz question bank | unitId, question, choices, correctAnswer, difficulty, explanation |
| `diagnosticQuestions` | Diagnostic question bank | courseId, unitNumber, question, choices, correctAnswer, difficulty |

### Progress & Assessment Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `userMastery` | Per-skill mastery scores | userId, skillId, masteryScore (0–100), lastUpdated |
| `unitProgress` | Unit completion state | userId, unitId, isCompleted, lessonsCompleted, quizScore |
| `lessonProgress` | Lesson view tracking | userId, lessonId, isCompleted, completedAt |
| `quizAttempts` | Quiz submission history | userId, unitId, score, answers, completedAt |
| `diagnosticAttempts` | Diagnostic submission history | userId, courseId, score, prereqScore, unitResults, completedAt |
| `tutorSessions` | EduBot session history | userId, courseId, messages (JSON, capped at 20 turns), mode |

### Parent & Family Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `parentChildren` | Parent–student links | parentId, childId, nickname, gradeLevel, relationship |
| `coParentAccess` | Co-parent read access | studentId, coParentUserId, invitedByParentId, isActive |
| `coParentInvitations` | Co-parent invite tokens | studentId, invitedByParentId, inviteeEmail, token, status, expiresAt |
| `parentInviteTokens` | Parent invite tokens from students | parentId, childId, token, status, expiresAt, resendCount |
| `studentInviteTokens` | Parent-issued student invite tokens | parentId, childId, token, status, expiresAt |
| `enrolmentInvitations` | Enrollment invitation tokens | parentId, childId, courseId, token, status, expiresAt |
| `parentGoals` | Academic goals per child | parentId, childId, goalText, targetDate, isCompleted |
| `parentNotes` | Private notes per child | parentId, childId, noteText |
| `courseRequests` | Parent-approval course requests | studentId, courseId, requestedBy, status (pending/approved/rejected/cancelled), approvedBy, approvalToken, tokenExpiresAt |

### Payment & Subscription Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `subscriptions` | Stripe subscription state | userId, stripeCustomerId, stripeSubscriptionId, planName, billingPeriod, status, trialEnd, currentPeriodEnd |
| `coupons` | Promotional discount codes | code, discountType, discountValue, usageLimit, status |
| `couponRedemptions` | Coupon usage history | couponId, userId, redeemedAt, planName, discountApplied |
| `paymentAuditLog` | Stripe event log | userId, event, stripeEventId, amount, status, metadata |

### Email & Communication Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `emailLogs` | Outbound email log | toEmail, subject, templateName, status, messageId, deliveryStatus, deliveryUpdatedAt, referenceId |
| `emailSuppression` | Bounce/complaint suppression list | email, reason (bounced/complained/manual), isActive, suppressedAt, resendEventId |
| `suppressionAuditLog` | Admin suppression actions | suppressionId, email, action, adminId, notes, createdAt |
| `userNotifications` | In-app notification records | userId, type, title, message, isRead, createdAt |
| `inactivityNotifications` | Inactivity email de-dup log | userId, tier (7/14/30), sentAt, emailLogId |

### Admin & Platform Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `platformSettings` | Key-value platform config | key, value, category, label |
| `adminAuditLog` | Admin action history | adminId, action, targetType, targetId, details |
| `adminRoles` | RBAC role definitions | name, description, isSystem |
| `rolePermissions` | Role–permission matrix | roleId, resource, action |
| `adminRoleAssignments` | User–role assignments | userId, roleId, assignedBy, isActive |
| `cmsContent` | CMS content blocks | key, section, value, publishedValue, isDraft, version |
| `cmsContentHistory` | CMS version history | contentId, version, value, changedBy |

### Marketing & Sales Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `newsletterSubscriptions` | Email subscribers | email, role, segment, subscribedAt |
| `newsletterCampaigns` | Email campaigns | title, subject, htmlContent, status, sentAt |
| `chatSessions` | Landing page chat leads | sessionToken, visitorName, visitorEmail, status |
| `chatMessages` | Chat message history | sessionId, role, content |
| `demoRequests` | ISD demo request CRM | fullName, schoolName, email, numStudents, status, assignedTo |
| `referrals` | Referral codes | referrerId, code, clickCount, signupCount, isActive |
| `referralSignups` | Referral signup tracking | referralId, newUserId, signedUpAt |

---

## 9. API Structure — tRPC Routers

The top-level `appRouter` in `server/routers.ts` merges the following sub-routers. All procedures are accessed from the frontend via `trpc.<router>.<procedure>.useQuery/useMutation`.

| Router | File | Key Procedures |
|---|---|---|
| `auth` | `routers.ts` (inline) | `me`, `logout` |
| `curriculum` | `routers.ts` (inline) | `getUnits`, `getUnit`, `getLessons`, `getLesson`, `markLessonComplete` |
| `quiz` | `routers.ts` (inline) | `getQuestions`, `submitQuiz`, `getAttempts` |
| `progress` | `routers.ts` (inline) | `getDashboard`, `getAllCourseProgress`, `getMastery`, `getSkillIndex` |
| `diagnostic` | `routers.ts` (inline) | `getQuestions`, `submitDiagnostic`, `getLatestAttempt`, `getStatus`, `getAllAttempts` |
| `tutor` | `routers.ts` (inline) | `chat`, `getHistory`, `clearHistory` |
| `courses` | `routers.ts` (inline) | `getPublicCourses`, `getCourseCatalog`, `myEnrollments`, `enrollSelf`, `setActiveCourse`, `requestCourse`, `cancelRequest` |
| `student` | `routers.ts` (inline) | `getProfile`, `updateProfile`, `getReEngagementContext` |
| `notifications` | `routers.ts` (inline) | `list`, `markRead`, `markAllRead`, `getUnreadCount` |
| `admin` | `routers/admin.ts` | `getStats`, `listUsers`, `updateUserRole`, `createUser`, `updateUserStatus`, `bulkUpdateUserStatus`, `bulkAssignCourse`, `bulkRemoveCourse`, `listCourses`, `getSettings`, `upsertSetting`, `getAuditLog`, `cms.*`, `rbac.*`, `getEmailLogs`, `getEmailLogStats`, `listSuppressions`, `unsuppressEmail`, `suppressEmailManual`, `exportSuppressions`, `listDemoRequests`, `updateDemoRequest`, `respondToDemoRequest`, `listCoupons`, `createCoupon`, `updateCoupon`, `getInactiveStudents`, `getInactivityStats`, `triggerManualInactivityNotification`, `exportInactivityReport`, `scheduleGradePromotion` |
| `payment` | `routers/payment.ts` | `createCheckoutSession`, `validateCoupon`, `getSubscriptionStatus`, `getMySubscription`, `getPaymentHistory`, `createPortalSession`, `createCoupon`, `updateCoupon`, `listCoupons`, `getPaymentAnalytics` |
| `parent` | `routers/parent.ts` | `enrollChild`, `listChildren`, `removeChild`, `getChildProgress`, `updateChildNickname`, `getPendingRequests`, `approveCourseRequest`, `rejectCourseRequest` |
| `courseRequest` | `routers/parent.ts` (courseRequestTokenRouter) | `processToken` |
| `coParent` | `routers/coParent.ts` | `inviteCoParent`, `acceptInvitation`, `listCoParents`, `revokeAccess`, `listMyStudents` |
| `onboarding` | `routers/onboarding.ts` | `getProfile`, `saveStudentProfile`, `saveParentProfile`, `generateGoalAlignment`, `completeOnboarding`, `createStudentInvite`, `acceptStudentInvite`, `saveBillingPeriod`, `savePersonalization`, `getPersonalization` |
| `landing` | `routers/landing.ts` | `getStats`, `chat`, `startSession`, `updateSessionInfo`, `submitDemoRequest`, `subscribeNewsletter` |
| `newsletter` | `routers/newsletter.ts` | `subscribers.list`, `subscribers.add`, `subscribers.unsubscribe`, `subscribers.delete`, `subscribers.exportCsv`, `campaigns.list`, `campaigns.get`, `campaigns.create`, `campaigns.update`, `campaigns.markSent`, `campaigns.delete`, `campaigns.aiDraft`, `analytics` |
| `authEnhancements` | `routers/authEnhancements.ts` | `requestPasswordReset`, `validateResetToken`, `setup2FA`, `verify2FA`, `disable2FA`, `generateBackupCodes` |
| `parentTools` | `routers/parentTools.ts` | `createGoal`, `listGoals`, `completeGoal`, `createNote`, `listNotes`, `skillGapAnalysis`, `getReportData` |
| `referral` | `routers/referral.ts` | `createCode`, `listMyCodes`, `lookupCode`, `redeemCode` |
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

The adaptive learning engine operates at three levels.

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

Responses are streamed token-by-token via SSE at `/api/tutor/stream`. The frontend uses `EventSource` and renders markdown via the `streamdown` library (lazy-loaded as `vendor-streamdown`). Session history is persisted in `tutorSessions` and capped at the last 20 turns. EduBot has a hard guardrail preventing it from answering questions outside the active course subject.

**Loading overlay (Sprint 46):** When a student sends their first message, the `vendor-shiki` chunk (1.6 MB gzip, the syntax highlighter) downloads lazily. A branded "EduBot is loading…" overlay with an animated brain icon and progress bar covers this window. The `useStreamdownReady()` hook in `StreamdownRenderer.tsx` exposes the loading state to the Tutor page.

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

**Parent Dashboard features:** Child switcher tabs, per-child progress overview (mastery by unit, quiz scores, placement result), Skill Gap Analysis (skills below 75%), Study Goals panel, Parent Notes, Learning Insights (time trends, improvement rate, quiz score history), Export Report (CSV + print-to-PDF), cross-course summary table, and Course Requests panel (Sprint 38).

**Live pending request count badge:** The Parent Dashboard sidebar nav item shows a red badge with the count of pending course requests. The badge is hidden when the count is zero and uses `SidebarMenuBadge` from shadcn/ui.

---

## 15. Parent-Approval Course Assignment Workflow

Implemented in Sprints 38–39, this workflow allows parents to approve or reject their child's course enrollment requests.

**Flow:**
1. Student clicks "Request Access" on a course in the Course Catalog. The `courses.requestCourse` procedure creates a `courseRequests` row with `status: "pending"` and generates a time-limited `approvalToken`.
2. A notification email is sent to the linked parent via `courseRequestNotification.ts` with Approve and Reject links containing the token.
3. Parent can approve/reject from the Parent Dashboard (`parent.approveCourseRequest` / `parent.rejectCourseRequest`) OR by clicking the email link.
4. The email link hits `GET /api/course-request/token?token=<token>&action=approve|reject`, which processes the token and redirects to `/course-request/result` with the outcome.
5. The `/course-request/result` page shows branded states: `approved`, `rejected`, `expired`, `already_actioned`, `not_found`, `error`.
6. On approval, the student is automatically enrolled in the course via `enrollUserInCourse`.

**Course Catalog UI:** Shows "Request Access" / "Pending Approval" / "Rejected" / "Enrolled" status badges per course. Students can cancel pending requests.

**Admin audit:** All course requests are visible in the Admin Console with full audit trail.

---

## 16. Payment & Subscription Architecture

**Plans and pricing:**

| Plan | Monthly | Annual (20% off) | Stripe Price ID |
|---|---|---|---|
| Family | $19.99/mo | $15.99/mo ($191.88/yr) | `price_1TbnYY7Mcfd3gqtzhIiuU8AG` / `price_1TbnYa7Mcfd3gqtz6r8qjbHx` |
| Premium Family | $29.99/mo | $23.99/mo ($287.88/yr) | `price_1TbnYd7Mcfd3gqtzJc4cBAO6` / `price_1TbnYf7Mcfd3gqtzcQzNuisb` |
| ISD/School | Custom | Custom | Demo request pipeline |

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

**Test event handling:** The webhook handler detects Manus platform test events by checking `event.id.startsWith('evt_test_')` and returns `{ verified: true }` immediately. This is required for the Manus platform's webhook verification flow.

**Post-trial recovery:** `DashboardLayout` checks `payment.getMySubscription` on every load. When `status === "past_due"` or `status === "canceled"`, a full-screen locked-access overlay is shown with a direct Stripe Customer Portal button. The `/billing` and `/admin` routes remain accessible.

**Stripe Customer Portal:** `payment.createPortalSession` creates a portal session with `return_url` set to `${origin}/billing` (dynamically resolved from request headers).

---

## 17. Email & Notification Workflows

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
| `trialReminder.ts` | Mid-trial reminder | Engagement nudge at day 7 of trial |
| `parentInvite.ts` | `onboarding.createStudentInvite` | Student name, grade, course, invite link |
| `courseRequestNotification.ts` | `courses.requestCourse` | Student name, course title, approve/reject links with approval token |
| `inactivityNotification.ts` | Daily inactivity monitor heartbeat | Tier-appropriate message (7/14/30-day), last lesson CTA, parent CC |

**Delivery status tracking:** The Resend webhook at `/api/resend/webhook` handles `email.delivered`, `email.opened`, `email.bounced`, `email.complained`, `email.delivery_delayed`, and `email.failed` events. Each event updates `emailLogs.deliveryStatus` and `emailLogs.deliveryUpdatedAt` by matching the Resend `email_id` to `emailLogs.messageId`.

---

## 18. Email Suppression & Deliverability

The suppression system protects sender reputation by preventing email delivery to addresses that have bounced or complained.

**Architecture:** The `emailSuppression` table stores suppressed addresses with `reason` (`bounced` | `complained` | `manual`), `isActive`, `suppressedAt`, and `resendEventId`. The `suppressionAuditLog` table records all admin actions. `sendEmail()` checks `isEmailSuppressed()` before every send. The Resend webhook automatically suppresses addresses on `email.bounced` and `email.complained` events.

**Admin suppression management** (Admin Dashboard → Suppression tab): Paginated table with search by email, filter by reason and status, manual suppress dialog, inline audit history per address, unsuppress action with confirmation modal, and CSV export button (UTF-8 BOM, date-stamped filename, respects active filters).

**Suppression badge on user profiles:** The `SuppressionBadge` component appears inline in the Admin Users tab whenever a user's email has an active suppression. It shows reason, suppression date, and a one-click unsuppress button.

**Pending configuration:** `RESEND_WEBHOOK_SECRET` must be set in Settings → Secrets using the signing secret from the Resend webhook dashboard.

---

## 19. Admin Portal & CMS

The Admin Console is at `/admin`. It has the following tabs:

| Tab | Capabilities |
|---|---|
| Overview | Platform stats, active course grid |
| Users | Paginated user table, search, role/account-type/status selectors, create user modal, relationship panel, bulk actions (status update, course assign/remove) |
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
| Inactivity | Inactive student list by tier (7/14/30 days), stats cards, manual trigger, CSV export |
| Course Requests | Full audit trail of all parent-approval course requests |

**RBAC:** The `adminRoles`, `rolePermissions`, and `adminRoleAssignments` tables implement a granular permission system. Resources include `users`, `courses`, `cms`, `rbac`, `reports`, `diagnostics`, `settings`. Actions include `view`, `create`, `edit`, `delete`, `approve`, `export`.

**Bulk actions (Sprint 42):** The Users tab has a checkbox column and a bulk action toolbar that appears when rows are selected. Supported operations: `bulkUpdateUserStatus`, `bulkAssignCourse`, `bulkRemoveCourse`. All bulk operations are logged to `adminAuditLog` with partial success reporting.

---

## 20. Inactivity Monitoring & Re-Engagement

Implemented in Sprint 40, this system identifies and re-engages students who have not logged in for extended periods.

**Heartbeat job** (`server/scheduled/inactivityMonitor.ts`): Runs daily via Manus Heartbeat cron at `/api/scheduled/inactivity-monitor`. For each inactive tier (7, 14, 30 days), it queries `users.lastActiveAt`, checks `inactivityNotifications` to prevent duplicate sends within the window, sends tier-appropriate emails to student + linked parent, records the notification, and flags 30-day inactive students in `adminAuditLog` for manual intervention.

**WelcomeBackBanner (Sprint 42):** When a student who has been inactive for 7+ days logs in, a dismissible re-engagement banner appears on the Progress page. The banner shows a personalised message and a deep-link CTA to their last lesson. The `student.getReEngagementContext` procedure powers this. Dismissal state is stored in `userNotifications`.

**Admin Inactivity tab:** Shows inactive student counts by tier, per-student details (last active date, tier, linked parent), manual trigger button (fires the heartbeat logic immediately for testing), and CSV export.

---

## 21. Landing Page & Marketing

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

## 22. Analytics & Conversion Tracking

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

## 23. Frontend Design System & UX

**Design tokens:** Defined in `client/src/index.css` using CSS custom properties. Light theme by default (`defaultTheme="light"` in `App.tsx`) with indigo primary (`#4338CA`). Six colour palettes available (indigo, emerald, rose, violet, amber, teal) applied via `PaletteContext`.

**Typography:** Inter (variable weight 300–800) for UI, Lora (400/600/italic) for headings. Both are **self-hosted** as woff2 files served from the Manus storage CDN (Sprint 46). The Google Fonts CDN call has been removed. Two `<link rel="preload">` hints are injected for the most critical files.

**Tooltip system (Sprint 37):** A central registry in `client/src/lib/tooltipContent.ts` holds all tooltip copy in six namespaces: `NAV_TOOLTIPS`, `ADMIN_TAB_TOOLTIPS`, `ADMIN_ACTION_TOOLTIPS`, `BILLING_TOOLTIPS`, `TUTOR_TOOLTIPS`, `DIAGNOSTIC_TOOLTIPS`. The `NavTooltip` component wraps shadcn `Tooltip` with configurable `side`, `align`, and `delayDuration` props. Wired into all sidebar nav items, Admin Dashboard tabs and action buttons, Billing page CTAs, AI Tutor mode buttons, and Diagnostic page buttons.

**Mobile responsiveness:** All pages audited and fixed in Sprint 17. DashboardLayout uses a mobile drawer for the sidebar.

**Cross-browser compatibility (Sprint 41):** HSL fallbacks before oklch for Safari < 15.4, `-webkit-backdrop-filter` prefix, Safari ITP cookie fix (`SameSite=lax` for Safari UA), `requestIdleCallback` + `queueMicrotask` polyfills in `main.tsx`, Vite build target `es2019+safari14`, `font-display: swap`, touch target fixes, iOS text-size-adjust, mobile overflow fix, SSE `charset+Transfer-Encoding` headers.

---

## 24. Performance & Bundle Architecture

**Initial load budget (Sprint 45):** The initial page load (eagerly preloaded chunks) is **1,306 KB gzip** (down from 2,032 KB before Sprint 45, a 36% reduction).

**Chunk splitting** (`vite.config.ts` `manualChunks`):

| Chunk | Contents | Load Strategy | Size (uncompressed) |
|---|---|---|---|
| `vendor-react` | React, ReactDOM, wouter | Eager | 431 KB |
| `vendor-trpc` | tRPC, TanStack Query | Eager | 92 KB |
| `vendor-radix` | Radix UI primitives | Eager | 90 KB |
| `index` | App entry, DashboardLayout, Home, LandingPage | Eager | 411 KB |
| `vendor-charts` | Recharts | Eager (preloaded) | 398 KB |
| `vendor-mermaid` | Mermaid.js | Eager (preloaded) | 1,539 KB |
| `vendor-markdown` | remark, rehype, unified | Eager (preloaded) | 548 KB |
| `vendor-icons` | lucide-react | Lazy | 45 KB |
| `vendor-streamdown` | streamdown | Lazy (Tutor page) | ~30 KB |
| `vendor-shiki` | shiki + all 654 language grammars | Lazy (Tutor page) | 9,307 KB |
| `vendor-stripe` | @stripe/stripe-js | Lazy (Checkout) | ~50 KB |
| `vendor-misc` | All other dependencies | Eager (preloaded) | 1,056 KB |

**PWA precache:** Only essential app shell files are precached (CSS, HTML, ICO, PNG, SVG, WOFF2, and the four critical JS chunks: `vendor-react`, `vendor-trpc`, `vendor-radix`, `index`). Large vendor chunks are served normally to avoid Workbox's 2 MB precache limit.

**Root cause of previous blank page (Sprints 44–45):**
1. Sprint 44: Helmet.js applied `Content-Security-Policy: script-src 'self'` in production, blocking the Manus platform's inline `manus-runtime` script. Fix: `contentSecurityPolicy: false`.
2. Sprint 45: `vendor-misc` was 10.9 MB (21 seconds to download) because `lucide-react` was bundled twice (v0.453 + v0.542) and `shiki`'s 654 language grammars were eagerly included. The Manus platform's `manus-runtime` only waits 5 seconds for the app to signal readiness. Fix: deduplicated lucide-react and isolated shiki into `vendor-shiki` (lazy).

---

## 25. PWA & Offline Support

Implemented in Sprint 42 via `vite-plugin-pwa` with Workbox.

**Service worker strategies:**
- `CacheFirst` for static assets (fonts, images, CSS)
- `NetworkFirst` for API calls (`/api/trpc`)
- `StaleWhileRevalidate` for fonts

**Manifest:** `client/public/manifest.json` with 192×192 and 512×512 PNG icons, `display: standalone`, `theme_color: #4338CA`.

**Offline fallback:** `client/public/offline.html` — a branded page shown when the user is offline and the requested page is not cached.

**Update prompt:** `PWAUpdatePrompt.tsx` registers the service worker via `workbox-window`, listens for a `waiting` state, and shows a persistent Sonner toast with an "Update now" button that calls `messageSkipWaiting()` and reloads the page.

**Safari/iOS safety:** The PWA manifest and service worker are compatible with iOS Safari. The `SameSite=lax` cookie fix in Sprint 41 ensures authentication works correctly on iOS.

---

## 26. Security & Compliance

- **Helmet:** HTTP security headers applied via `helmet()` middleware with `contentSecurityPolicy: false` (the Manus platform's Cloudflare edge layer handles CSP at the CDN level).
- **Rate limiting:** Public LLM chatbot endpoint and tRPC endpoint are rate-limited.
- **JWT session cookies:** Signed with `JWT_SECRET`, `httpOnly`, `sameSite: lax` (Safari-compatible).
- **User status check:** `authenticateRequest` rejects suspended/deleted users on every API call.
- **Admin procedure guard:** All admin procedures check `ctx.user.role === "admin"`.
- **Student procedure guard:** Quiz, diagnostic, and mastery procedures check `ctx.user.accountType === "student"`.
- **Stripe webhook verification:** `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`. Test events detected via `event.id.startsWith('evt_test_')`.
- **Resend webhook verification:** Svix signature verification with `RESEND_WEBHOOK_SECRET` (pending configuration — see Known Issues).
- **robots.txt:** Disallows `/admin`, `/diagnostic`, `/quiz`, `/parent` from crawlers.
- **Error boundaries:** Raw stack traces hidden from end users in production.
- **DB indexes:** Added on high-traffic `userId` columns.

---

## 27. Testing Strategy

The test suite uses Vitest with **234 tests across 12 test files**:

| Test File | Tests | Coverage |
|---|---|---|
| `server/auth.logout.test.ts` | 1 | Auth logout procedure |
| `server/authEnhancements.test.ts` | 19 | Password reset, 2FA setup/verify/disable, backup codes |
| `server/demoRequest.test.ts` | 33 | Demo request validation, admin list, respond, stats |
| `server/educhamp.test.ts` | 25 | Mastery scoring, adaptive path unlock, diagnostic, tutor system prompt |
| `server/emailService.test.ts` | 4 | Suppression guard, retry logic, log creation |
| `server/parent.test.ts` | 23 | Parent enrollment, co-parent invitations, child progress |
| `server/payment.test.ts` | 36 | Stripe discount calculation, coupon validation, billing period persistence, subscription upsert |
| `server/sprint39.test.ts` | 18 | Course request workflow, approval/rejection, token expiry, pending badge count |
| `server/sprint40.test.ts` | 14 | Inactivity monitoring, tier logic, de-dup, admin stats |
| `server/sprint41.test.ts` | 20 | Cross-browser compatibility, polyfills, SSE headers |
| `server/sprint42.test.ts` | 25 | Re-engagement context, bulk user actions, PWA manifest |
| `server/stripeWebhook.test.ts` | 16 | Checkout completion, subscription lifecycle, invoice events, coupon redemption, test event detection |

Run with `pnpm test`. All 234 tests pass. TypeScript reports 0 errors (`npx tsc --noEmit`).

---

## 28. Deployment & DevOps

The platform is deployed on the Manus cloud platform (Cloud Run, Node.js only, 1 vCPU, 512 MiB RAM, 180s request timeout, min-instances=0 cold starts).

**Live domains:**
- `educhamp.app` (primary)
- `www.educhamp.app`
- `educhamp.co`
- `educhamp.manus.space`

**Deployment process:** Create a checkpoint via `webdev_save_checkpoint`, then click the Publish button in the Management UI. **Do not attempt to deploy via CLI or git push** — the Manus platform handles deployment internally.

**Dev server:** Runs at `http://localhost:3000` via `tsx watch server/_core/index.ts`.

**Build:** `pnpm build` runs `tsc && vite build` to produce the production bundle in `dist/public/`.

**Critical deployment constraint:** The platform is Cloud Run with a Node-only build image. No Python, Ruby, or native binaries beyond what npm ships. No `setInterval`, `node-cron`, or in-process timers — all scheduled work must use the Manus Heartbeat cron system (see Section 30).

---

## 29. Environment Variables

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

## 30. Scheduled Jobs & Automation

All scheduled jobs use the Manus Heartbeat cron system. **In-process timers (`setInterval`, `node-cron`) are forbidden** — Cloud Run terminates idle instances and in-process timers do not survive. See `references/periodic-updates.md` for the full architecture guide.

| Job | Endpoint | Schedule | Logic |
|---|---|---|---|
| Invite expiry | `/api/scheduled/invite-expiry` | Daily 02:00 UTC | Marks expired `parentInviteTokens` as `expired`; creates in-app notifications for affected students |
| Grade promotion | `/api/scheduled/grade-promotion` | Manual / end-of-year | Increments `userProfiles.gradeLevel` for all students in a selected cohort |
| Inactivity monitor | `/api/scheduled/inactivity-monitor` | Daily 08:00 UTC | Identifies students inactive for 7/14/30 days, sends tier-appropriate emails, records in `inactivityNotifications`, flags 30-day cases in `adminAuditLog` |

All handlers are idempotent. Authentication uses `sdk.authenticateRequest(req)` which returns `user.isCron === true` for heartbeat calls.

---

## 31. Known Issues & Technical Debt

| Issue | Severity | Notes |
|---|---|---|
| Resend DNS not verified | High | `educhamp.app` domain not yet verified in Resend. See `docs/sprint-32-setup-guide.md`. Email sends from `invites@educhamp.app` may land in spam until DNS is verified. |
| STRIPE_WEBHOOK_SECRET not updated | High | Must paste `whsec_f1YtygORnidWD9MTDUYNpKlNU0alyEhm` into Settings → Payment. Until then, webhook signature verification is skipped in production. |
| RESEND_WEBHOOK_SECRET not set | Medium | Resend webhook events accepted without signature verification. Set in Settings → Secrets. |
| VITE_GTM_ID not set | Medium | GTM snippet in `index.html` but no container ID configured. Conversion tracking is inactive. Set in Settings → Secrets. |
| District logos blocked | Low | Schools section uses text badges. Awaiting signed partnership agreements with Katy ISD, Spring ISD, Cy-Fair ISD, Humble ISD, Conroe ISD, Alief ISD. |
| VITE_APP_TITLE not updated | Low | Update in Settings → General. Browser tab title already updated in `index.html`. |
| N+1 suppression status queries | Low | `SuppressionBadge` fires one query per user row in the Admin Users table. Replace with a batch query for large user tables. |
| Tooltip content not admin-editable | Low | Tooltip copy is in `tooltipContent.ts`. Could be moved to `platformSettings` for admin editing without code deploys. |
| No in-app subscription upgrade/downgrade | Medium | Users manage subscription via Stripe Customer Portal only. No in-app "Change Plan" button on `/billing`. |
| vendor-mermaid eagerly preloaded | Low | Mermaid (1.5 MB) is preloaded even for users who never use the AI chat. Could be moved to lazy loading alongside `vendor-shiki`. |

---

## 32. Pending Enhancements & Roadmap

**Email & Deliverability**
- Open-rate stats card in Email Logs header.
- Per-template delivery breakdown chart.
- Email log CSV export.
- Batch suppression status query to replace N+1 `SuppressionBadge` calls.
- Mid-trial "halfway through your trial" email at day 7.

**Admin & Operations**
- Admin-editable tooltip content via `platformSettings` table.
- Suppression export extended to Email Logs tab.
- Move `vendor-mermaid` to lazy loading to reduce initial load further.

**Student Experience**
- Onboarding-mode tooltips for first-time users (auto-show for first 3 sidebar items).
- Tooltip coverage for Courses/Curriculum pages.
- In-app "Change Plan" button on `/billing` page.
- PWA "Add to Home Screen" install prompt on mobile.
- Student in-app notification bell with unread count dropdown.

**Analytics**
- GA4 Funnel Exploration setup (guide at `docs/ga4-funnel-exploration-guide.md`).
- Google Ads / Meta Ads conversion action pointing to `trial_started` event.

**Platform**
- Mobile app (React Native) — not scoped.
- PayPal standalone flow — TBD.
- Auto-generated demo coupon for ISD leads.
- Self-service ISD onboarding (currently requires sales call).

---

## 33. Sprint History

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
| 34 | Portal return URL fix, Admin Suppression Management tab, suppression badge |
| 35 | CSV export for suppression, trial expiry reminder email, unsuppress confirmation modal |
| 36 | Email delivery status column in Admin Email Logs |
| 37 | Contextual tooltip system across all major pages |
| 38 | Parent-Approval Course Assignment Workflow (courseRequests table, approval token, parent email, Parent Dashboard panel) |
| 39 | Course request result page, student notification emails, live pending request count badge |
| 40 | Admin Console Inactivity Monitoring tab, daily inactivity heartbeat job, WelcomeBackBanner, expanded user status enum |
| 41 | Cross-browser compatibility (Safari, Firefox, Brave), React.lazy code splitting (90% bundle reduction), polyfills |
| 42 | Student re-engagement banner, Admin bulk user actions, PWA service worker via vite-plugin-pwa |
| 43 | KaTeX lazy loading, PWA enhancements, branded offline fallback page |
| 44 | **Critical fix:** Helmet CSP blocking Manus platform inline runtime script → blank page on all production domains |
| 45 | **Critical fix:** 10.9 MB vendor-misc bundle exceeding 5-second readiness timeout → blank page. Deduplicated lucide-react, isolated shiki into lazy chunk. Initial load: 2,032 KB → 1,306 KB gzip |
| 46 | Tutor page loading overlay (vendor-shiki lazy load UX), self-hosted fonts (Google Fonts CDN removed), 16 Stripe webhook smoke tests |

---

## 34. Developer Setup Guide

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

# Build for production
pnpm build
```

**Adding a new feature (standard workflow):**

1. Update `drizzle/schema.ts` with new tables or columns.
2. Run `pnpm drizzle-kit generate` to produce migration SQL.
3. Apply migration via `webdev_execute_sql`.
4. Add query helpers in `server/db.ts`.
5. Add or extend procedures in `server/routers.ts` or a sub-router in `server/routers/`.
6. Build the frontend page in `client/src/pages/`.
7. Register the route in `client/src/App.tsx` (use `React.lazy` for non-critical pages).
8. Write Vitest tests in `server/*.test.ts`.
9. Run `pnpm test` and `npx tsc --noEmit` to verify.
10. Update `todo.md` with completed items.
11. Save a checkpoint via `webdev_save_checkpoint`.
12. Click Publish in the Management UI to deploy.

**Key files to read first when onboarding:**

- `drizzle/schema.ts` — full data model (50 tables)
- `server/routers.ts` — API surface (18 router namespaces)
- `client/src/App.tsx` — route map + lazy loading strategy
- `client/src/components/DashboardLayout.tsx` — main app shell
- `server/_core/index.ts` — Express middleware order (critical for webhook registration)
- `todo.md` — full sprint history and feature checklist
- `references/periodic-updates.md` — heartbeat job architecture (read before adding any scheduled work)
- `reports/project_handoff_summary.md` — this document

**Manual configuration steps required before go-live:**

1. Set `STRIPE_WEBHOOK_SECRET` in Settings → Payment (value: `whsec_f1YtygORnidWD9MTDUYNpKlNU0alyEhm`).
2. Set `RESEND_WEBHOOK_SECRET` in Settings → Secrets (from Resend dashboard → Webhooks → Signing Secret).
3. Set `VITE_GTM_ID` in Settings → Secrets (from Google Tag Manager → Container ID).
4. Add Resend DNS records at your domain registrar (see `docs/sprint-32-setup-guide.md`).
5. Update `VITE_APP_TITLE` in Settings → General to "EduChamp — AI-Powered Learning Solution".

---

*This document was generated by Manus AI on May 29, 2026. It reflects the state of the EduChamp platform at checkpoint `eec9367` (Sprint 46 — Production Readiness). For questions or updates, refer to `todo.md` for the full feature checklist and sprint history.*
