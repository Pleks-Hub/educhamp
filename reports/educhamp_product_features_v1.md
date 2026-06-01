# EduChamp — Product Feature & Capabilities Document

**Version:** 1.0  
**Date:** May 31, 2026  
**Prepared by:** Manus AI  
**Audience:** Product marketing, sales, school administrators, investors

---

## 1. Executive Summary

EduChamp is an adaptive K–12 mathematics learning platform purpose-built for Algebra I, with a curriculum that spans Pre-K through Grade 12 and includes AP/Advanced and SAT Preparation tracks. It combines an AI-powered tutoring engine, a diagnostic placement system, standards-aligned curriculum content, and a full gamification stack to deliver personalised learning experiences at scale. EduChamp serves four distinct user roles — students, parents/guardians, teachers, and platform administrators — through a single integrated web application. The platform solves the persistent gap between one-size-fits-all classroom instruction and the individual learning pace of each student: EduBot, the platform's AI tutor, adapts its explanations in real time based on the student's demonstrated mastery, while the parent module gives families unprecedented visibility into their child's academic progress. EduChamp is built for compliance from day one, with COPPA-grade age verification, FERPA-aligned data handling, and state-specific age-of-majority enforcement during registration.

---

## 2. Target Audience & Use Cases

### 2.1 Primary User Personas

| Persona | Description | Primary Goal |
|---|---|---|
| **Student (K–12)** | Ages 5–21, enrolled in one or more EduChamp courses | Master curriculum skills, earn XP and badges, prepare for exams |
| **Parent / Guardian** | Adults linked to one or more student accounts | Monitor progress, set goals, receive weekly digests, co-manage access |
| **Teacher / Tutor** | Educators managing class rosters and tracking mastery | Assign courses, review skill gaps, export progress reports |
| **Platform Administrator** | School, district, or platform-level admin | Manage users, configure courses, monitor compliance, handle billing |

### 2.2 Core Use Cases

EduChamp is deployed across three primary scenarios. In **home learning**, a parent creates an account, links their child's student profile, and the student works through a diagnostic placement test that assigns them to the correct starting unit. The parent receives a weekly email digest summarising progress and skill gaps. In **classroom supplementation**, a teacher enrols an entire class section into a specific course, monitors individual mastery scores from the Admin Console, and uses the flagged-questions system to identify content that is confusing multiple students. In **district-wide deployment**, a district administrator provisions schools, assigns courses to grade levels, configures pacing guides, and uses the bulk enrolment and grade promotion tools to manage hundreds of students simultaneously.

---

## 3. Core Features

### 3.1 Curriculum & Content

EduChamp ships with nine fully-authored courses covering the core K–12 mathematics progression. Each course is structured as a hierarchy of **Units → Lessons → Skills → Quiz Questions**, with an additional diagnostic question bank used for placement and ongoing assessment.

| Course ID | Title | Grade Level | Subject |
|---|---|---|---|
| ALG1 | Algebra I | Grade 9 | Mathematics |
| ALG2 | Algebra II | Grade 10 | Mathematics |
| GEO | Geometry | Grade 9–10 | Mathematics |
| PRECALC | Pre-Calculus | Grade 11 | Mathematics |
| CALC | Calculus | Grade 12 | Mathematics |
| APSTAT | AP Statistics | AP/Advanced | Mathematics |
| SATMATH | SAT Math Prep | SAT | Mathematics |
| ENG2 | English II | Grade 10 | English Language Arts |
| USH | U.S. History | Grade 11 | Social Studies |

All mathematics content is aligned to the **Texas Essential Knowledge and Skills (TEKS)** framework, with a 44-row TEKS→CCSS crosswalk table enabling national standards mapping. Each lesson includes structured content, worked examples, and a skill-tagged question bank. The CMS (Content Management System) allows administrators to draft, publish, revert, and version-control any content item without a code deployment.

### 3.2 Diagnostic Placement Engine

When a student enrols in a new course, EduChamp administers a **diagnostic placement test** that samples questions from across the course's skill tree. The engine uses the student's response pattern to identify the optimal starting unit, preventing both under-challenge (starting too easy) and frustration (starting too hard). Students may also skip directly to a specific unit via the Skip-to-Unit dialog, which displays unit descriptions and a real-time search bar. The diagnostic question bank is separate from the quiz question bank, ensuring students do not encounter placement questions again during regular study.

### 3.3 EduBot — AI Tutor

EduBot is the platform's conversational AI tutor, accessible from any lesson or quiz page. It operates in six distinct teaching modes:

| Mode | Behaviour |
|---|---|
| **Explain** | Provides a step-by-step explanation of the current concept |
| **Hint** | Gives a targeted hint without revealing the full solution |
| **Example** | Generates a worked example similar to the current problem |
| **Socratic** | Asks guiding questions to lead the student to the answer |
| **Check** | Reviews the student's written work and identifies errors |
| **Encourage** | Provides motivational support when the student is struggling |

EduBot uses the platform's built-in LLM integration (server-side, credentials never exposed to the client). Each session is stored in the `tutorSessions` table, enabling session history and continuity across logins. The tutor enforces a 40-message session cap to prevent runaway usage. A COPPA inline banner is shown when the student is under 13, linking to the Parent Dashboard. Mobile users access EduBot through a fixed overlay sidebar.

### 3.4 Quiz & Mastery Engine

Each skill in EduChamp has an associated question bank. When a student completes a lesson, they take a **skill quiz** that updates their mastery score for that skill. Mastery is tracked at the skill level in the `userMastery` table and rolled up to the unit level in `unitProgress`. The mastery scoring algorithm uses a weighted combination of recent attempt accuracy and attempt count, so a student who answers correctly on the first attempt scores higher than one who needed multiple tries. Mastery thresholds (configurable per platform) determine when a skill is marked as "mastered" versus "in progress" versus "needs review".

### 3.5 Parent Module

The Parent Module gives parents and guardians a dedicated dashboard with four tabs:

- **Overview** — active course, current unit, streak, XP, and a skill gap summary
- **Progress** — vertical timeline of quiz attempts and unit completions, with a date-range filter (7d / 30d / 90d / All) and subject filter
- **Insights** — Recharts bar chart of mastery percentages by skill, colour-coded green/amber/red
- **Goals** — parent-set learning goals with progress tracking and notes

Parents can link multiple children to a single account and grant **co-parent access** to another adult via an email invitation. The platform sends a **weekly parent digest** email every Sunday summarising each child's activity, mastery gains, and upcoming skill gaps. Parents receive an **inactivity alert** if their child has not studied for a configurable number of days.

### 3.6 Gamification System

EduChamp ships with a seven-layer gamification stack designed to sustain long-term engagement:

| Layer | Description |
|---|---|
| **XP & Levels** | Students earn XP for quiz completions, correct answers, and streaks. XP accumulates in the `xpLedger` table and rolls up to a level in `studentLevels`. |
| **Badges** | 20+ achievement badges awarded for milestones (first quiz, 7-day streak, 100% mastery, etc.). Stored in `badges` and `userBadges`. |
| **Streaks** | Daily study streaks tracked in the `streaks` table. A "Streak at Risk" banner appears on the home screen when a student has a streak ≥2 days but has not studied today. |
| **Quests** | Time-limited challenges (e.g., "Complete 5 quizzes this week") tracked in `quests` and `userQuests`. |
| **Houses** | Students are sorted into houses (similar to school houses), creating a team-based competition layer via `houses` and `userHouses`. |
| **Seasonal Challenges** | Platform-wide seasonal events with leaderboards, tracked in `seasonalChallenges` and `userSeasonalProgress`. |
| **Rewards Marketplace** | Students redeem XP for virtual rewards in the `rewardsMarketplace`. Redemptions are tracked in `rewardRedemptions`. |

Students can also customise their **avatar** (stored in `userAvatars`) and view their full achievement history in the **Gamification Hub** page.

### 3.7 Referral System

EduChamp includes a built-in referral programme. Students and parents can generate a unique referral link from their Profile page. Referrals are tracked in the `referrals` and `referralSignups` tables, enabling reward attribution when a referred user completes registration.

---

## 4. Key Capabilities

### 4.1 Authentication & Security

EduChamp uses **Manus OAuth** for primary authentication, with a session cookie signed by `JWT_SECRET`. The platform additionally supports **email/password authentication** with bcrypt hashing, **two-factor authentication** (TOTP, stored in `twoFactorAuth`), **password reset** via time-limited tokens (`passwordResetTokens`), and **email verification** for new accounts. All API traffic is protected by Helmet.js security headers, express-rate-limit on auth endpoints, and a 1 MB body-parser cap. Admin-only procedures are gated behind an `adminProcedure` middleware that checks `ctx.user.role === "admin"`.

### 4.2 Role-Based Access Control (RBAC)

Beyond the built-in `admin` / `user` role split, EduChamp implements a full **custom RBAC system** with named roles (`adminRoles`), granular permissions (`rolePermissions`), and per-user role assignments (`adminRoleAssignments`). Administrators can create custom roles, assign permissions, and grant or revoke roles from any user without a code deployment. A seed script populates sensible default roles on first run.

### 4.3 Email Infrastructure

The email layer uses a **provider abstraction factory** that supports three backends: **Resend** (default, using the platform's built-in `RESEND_API_KEY`), **SMTP**, and **SendGrid**. Provider configuration is stored encrypted (AES-256-GCM) in the `emailSettings` table. A bootstrap procedure seeds the default Resend provider from environment variables at server startup, ensuring email works out of the box. All outbound emails are logged to `emailLogs` with status, provider, and timestamp. Administrators can retry failed sends, archive logs, and configure domain verification (DKIM/SPF) through the Email Settings tab.

**Email suppression** is handled automatically: hard bounces and spam complaints received via the `/api/webhooks/email` endpoint are written to `emailSuppression` and `suppressionAuditLog`. The `sendEmail()` entry point checks the suppression list before every send, protecting sender reputation. Administrators can view the suppression list, manually suppress or unsuppress addresses, and export the full list as CSV.

### 4.4 Payments & Subscriptions

EduChamp integrates **Stripe** for subscription billing. The checkout flow creates a Stripe Checkout Session server-side and opens it in a new tab. Webhook events (`checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`) are verified with `stripe.webhooks.constructEvent()` and processed at `/api/stripe/webhook`. Subscription state is stored in the `subscriptions` table (Stripe IDs only, no card data). Administrators have access to a **Subscription CRM** tab for managing individual subscriptions, a **Payment Analytics** tab with revenue charts, and a **Coupon Manager** for creating and tracking discount codes (`coupons`, `couponRedemptions`).

### 4.5 Compliance & Age Verification

EduChamp enforces compliance at multiple layers:

- **COPPA (Children's Online Privacy Protection Act):** Students under 13 are identified by stored date of birth (DOB-first) or grade level (fallback). They are blocked from accessing course content until a parent provides email-verified parental consent (`parentalConsents` table). The consent flow sends a verification email to the parent; clicking the link marks the consent as verified and unlocks the student's account.
- **Age of majority (U.S.):** Guardian registration enforces state-specific minimum ages — Mississippi: 21, Alabama and Nebraska: 19, all other states: 18. The validation runs both client-side (with inline error messages) and server-side (throwing `BAD_REQUEST` if the age requirement is not met).
- **Student age range:** Students must be between 3 and 21 years old at registration.
- **Age-based course gating:** Individual courses can have a `minAgeRequirement` field. Students whose stored DOB places them below the minimum see an amber "Age X+ required" badge on the course card and a disabled Enrol button with a tooltip explaining the restriction.

### 4.6 Admin Console

The Admin Console is a full-featured management portal accessible at `/admin`, structured as a **left sidebar navigation** with 21 sections grouped into seven categories:

| Category | Sections |
|---|---|
| Dashboard | Overview |
| Users & Access | Users, RBAC |
| Content | Courses, CMS, Grades, Course Requests |
| Finance | Subscriptions, Coupons, Payment Analytics |
| Email | Email Logs, Suppression List, Email Settings |
| Compliance & Safety | Inactivity Monitor, Gamification, Flagged Questions, Demo Requests |
| System | Audit Log, District Transfer, System Health |

The sidebar displays **live badge counters** (auto-refreshing every 60 seconds) on Flagged Questions, Demo Requests, and Suppression List. The Suppression List badge shows a hover tooltip breaking down the count into hard bounces, spam complaints, and manual suppressions. The Demo Requests badge opens a **quick-action popover** showing the three newest pending requests, each with a "Mark as contacted" button that updates the status without navigating away.

### 4.7 System Health & Monitoring

The **System Health** tab provides real-time server metrics: uptime, database ping latency (with a Recharts sparkline for the last 20 samples), heap and RSS memory usage (with area chart sparklines), Node.js version, and environment badge. A **Recent Admin Activity** table shows the last 20 audit log entries, auto-refreshing every 30 seconds. Administrators can also view active impersonation sessions and force-end them from this tab.

### 4.8 Admin Impersonation

Administrators can log in as any user for support and debugging purposes. Clicking "Log in as User" in the Users tab creates a 15-minute impersonation session token stored in `adminImpersonationSessions`. An amber **ImpersonationBanner** appears across all pages while impersonating, with a countdown timer, an "End Session" button, and a "+15 min" extension button that appears when fewer than 5 minutes remain. The session is automatically invalidated on expiry.

### 4.9 District & School Management

EduChamp includes a geographic data model for **countries → states → districts → schools**, enabling district-level deployment. Administrators can transfer students between districts, assign courses to tracks, and configure pacing guides (`pacingGuides`, `pacingWindows`) that define the expected completion windows for each unit. The **standards framework** tables (`standardFrameworks`, `standards`, `standardCrosswalk`) support multi-framework alignment (TEKS, CCSS, NY-NGLS).

### 4.10 Newsletter & Chat Management

The **Newsletter Console** (`/admin/newsletter`) supports creating and sending email campaigns to the full subscriber list (`newsletterSubscriptions`, `newsletterCampaigns`). The **Chat Management** console (`/admin/chat`) provides administrators with visibility into all chat sessions and messages, enabling moderation and support escalation.

---

## 5. Differentiators

EduChamp distinguishes itself from generic learning management systems and standalone tutoring apps across five dimensions.

**Adaptive AI tutoring with six modes.** Most platforms offer a single "ask a question" interface. EduBot's six distinct modes (Explain, Hint, Example, Socratic, Check, Encourage) allow the tutor to meet the student where they are — providing scaffolding without giving away answers, or switching to encouragement when frustration is detected.

**Compliance-first architecture.** COPPA consent, age-of-majority verification, email suppression, and FERPA-aligned data handling are built into the core platform, not bolted on. Schools and districts can deploy EduChamp with confidence that regulatory requirements are enforced at the data layer, not just in the UI.

**Full-stack gamification.** Seven gamification layers (XP, badges, streaks, quests, houses, seasonal challenges, rewards marketplace) are deeply integrated with the curriculum engine. XP is earned for genuine academic work — correct answers, completed units, maintained streaks — not for passive engagement.

**Parent visibility without friction.** The Parent Module gives families a real-time window into their child's academic progress, with weekly automated digests and inactivity alerts. Co-parent access allows two adults to share visibility without sharing login credentials.

**Production-grade admin tooling.** The 21-section Admin Console, live sidebar badge counters, quick-action popovers, admin impersonation, and system health monitoring give platform operators the tools they need to manage a large deployment without leaving the application.

---

## 6. Benefits by Stakeholder

| Stakeholder | Concrete Benefit |
|---|---|
| **Student** | Personalised starting point via diagnostic placement; AI tutor available 24/7 in six modes; gamification sustains motivation; age-gated courses prevent mismatched enrolment |
| **Parent / Guardian** | Weekly digest emails; real-time progress dashboard; co-parent access; inactivity alerts; COPPA consent flow ensures child's data is protected |
| **Teacher / Educator** | Mastery-level visibility per student and per skill; flagged-question system surfaces confusing content; bulk enrolment and grade promotion tools reduce administrative overhead |
| **School / District Admin** | Full RBAC with custom roles; district/school geographic model; pacing guides; standards crosswalk (TEKS, CCSS, NY-NGLS); audit log for all admin actions; impersonation for support |
| **Platform Operator** | Live system health monitoring; email delivery health dashboard; Stripe subscription management; suppression list with bounce/complaint breakdown; 960-test CI suite |

---

## 7. Implementation & Support

### 7.1 Onboarding Flow

New users are guided through a role-specific onboarding wizard:

- **Students** complete a 3-step wizard: personal details (name, grade, date of birth), course selection, and diagnostic placement test.
- **Parents/Guardians** complete a 3-step wizard: personal details (name, state, date of birth — with state-specific age-of-majority validation), child linking (invite token or direct link), and notification preferences.

Age verification runs both client-side (inline error with specific minimum age for the selected state) and server-side (tRPC `BAD_REQUEST` with a clear message).

### 7.2 Deployment Timeline

| Day | Milestone |
|---|---|
| Day 1 | Admin account provisioned; platform settings configured; email provider verified |
| Day 2–3 | Student and parent accounts created (bulk import or invite tokens) |
| Day 3–5 | Students complete diagnostic placement tests; starting units assigned |
| Week 2 | First quiz attempts recorded; mastery data available in Admin Console |
| Week 3 | First weekly parent digest emails sent; inactivity alerts configured |
| Month 2 | Pacing guide alignment reviewed; flagged questions addressed; coupon campaigns launched |

### 7.3 Technical Requirements

EduChamp is a web application requiring only a modern browser (Chrome, Firefox, Edge, Safari). No native app installation is required. The platform is hosted on Manus infrastructure with automatic scaling, SSL termination, and daily database backups. The tech stack is React 19 + Tailwind CSS 4 on the frontend, Express 4 + tRPC 11 on the backend, and MySQL/TiDB as the database.

### 7.4 Support Channels

- **In-app notifications** via the `userNotifications` table, surfaced in the platform UI
- **Email support** via the platform's Resend-backed email infrastructure
- **Admin audit log** for tracing any user action or system event
- **System Health tab** for real-time infrastructure monitoring

---

## 8. Suggested Presentation Flow

The following slide-by-slide outline is recommended for a 20-minute product presentation to school administrators or district decision-makers.

| Slide | Title | Key Content |
|---|---|---|
| 1 | **Title Slide** | EduChamp logo, tagline, presenter name, date |
| 2 | **The Problem** | Gap between classroom instruction and individual learning pace; parent visibility deficit; compliance burden for schools |
| 3 | **Introducing EduChamp** | One-paragraph positioning statement; "Adaptive AI tutoring meets compliance-first infrastructure" |
| 4 | **Who It's For** | Four persona cards: Student, Parent, Teacher, Admin — with one-line benefit each |
| 5 | **The Curriculum** | 9 courses, K–12 progression, TEKS/CCSS alignment, 44-row crosswalk table |
| 6 | **EduBot: AI Tutor** | Six teaching modes diagram; screenshot of tutor interface |
| 7 | **Diagnostic Placement** | How the engine works; screenshot of placement test; "right start, every time" |
| 8 | **Mastery Engine** | Skill → Unit → Course mastery hierarchy; mastery score calculation; colour-coded progress bars |
| 9 | **Parent Module** | Dashboard screenshot; weekly digest email; co-parent access; inactivity alerts |
| 10 | **Gamification** | Seven-layer stack diagram; XP, badges, streaks, quests, houses, seasonal challenges, rewards |
| 11 | **Compliance Built In** | COPPA consent flow; age-of-majority validation by state; age-gated courses; FERPA alignment |
| 12 | **Admin Console** | Sidebar navigation screenshot; 21 sections; live badge counters; quick-action popovers |
| 13 | **Email Infrastructure** | Provider abstraction (Resend/SMTP/SendGrid); suppression list; delivery health dashboard |
| 14 | **Payments & Billing** | Stripe integration; subscription CRM; coupon manager; payment analytics |
| 15 | **Pricing** | *(Insert current pricing tiers — contact product team for latest figures)* |
| 16 | **Implementation Timeline** | Day 1 → Month 2 milestone table |
| 17 | **Technical Snapshot** | React 19, Tailwind 4, tRPC 11, MySQL/TiDB; 960 automated tests; 44 DB migrations; 137 commits |
| 18 | **Why EduChamp** | Five differentiators summary; "compliance-first, engagement-driven, parent-visible" |
| 19 | **Call to Action** | Request a demo; contact information; QR code to sign-up page |

---

*This document was generated from the EduChamp codebase as of checkpoint `a57807fc` (May 31, 2026). Pricing figures on Slide 15 should be confirmed with the product team before finalising the deck.*
