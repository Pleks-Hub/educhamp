# EduChamp — Phase 0 Current State Audit

> Produced: 2026-05-30 | Author: Manus AI (senior engineer role)
> Purpose: Checkpoint 0 of the multi-district refactor. No code was changed during this audit.

---

## 1. Stack & Structure

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 5, Tailwind CSS 4, shadcn/ui, Wouter (routing), TanStack Query |
| **Backend** | Node.js 22, Express 4, tRPC 11 (type-safe RPC, no REST routes) |
| **Database** | MySQL 8 / TiDB (cloud-hosted), Drizzle ORM, 34 migrations to date |
| **Auth** | Manus OAuth 2.0 (platform SSO); session cookie signed with `JWT_SECRET`; 2FA via TOTP (speakeasy) |
| **AI / LLM** | Manus built-in Forge API (`BUILT_IN_FORGE_API_URL`); model abstracted behind `invokeLLM()` helper; streaming via SSE at `/api/tutor/stream` |
| **Email** | Resend (transactional); bounce/complaint suppression table; 9 HTML email templates |
| **Payments** | Stripe Checkout + webhooks; test sandbox provisioned |
| **Scheduled jobs** | 4 heartbeat crons registered on the Manus platform (invite-expiry, inactivity-monitor, weekly-parent-digest, grade-promotion) |
| **Hosting / Deploy** | Manus WebDev platform (Cloud Run, Node-only, 512 MiB RAM, 1 vCPU) |
| **Repo** | GitHub (synced via `user_github` remote) |
| **Test suite** | Vitest — 452 tests passing across 18 test files |

The app is a single Node.js process: Express serves the tRPC API, the SSE tutor stream, OAuth callbacks, Stripe/Resend webhooks, and the Vite-built React SPA.

---

## 2. Data Model

The database has **47 tables** across these domains:

### Core curriculum (the content library)

| Table | Purpose |
|---|---|
| `units` | Ordered units within a course. Has `courseId` (FK), `teksAlignment` (text) |
| `lessons` | Lessons within a unit. Has `teksAlignment` (text), `workedExamples`, `guidedProblems`, `independentProblems`, `misconceptions` (all JSON) |
| `skills` | Atomic skills within a unit. Has `courseId`, `skillCode` (e.g. `ALG1-U3-S2`) |
| `quizQuestions` | Quiz items. Has `unitId`, `difficulty`, `explanation`, `options` (JSON) |
| `diagnosticQuestions` | Placement/diagnostic items. Has `courseId`, `unitNumber`, `difficulty` |

### Courses & enrollment

| Table | Purpose |
|---|---|
| `courses` | Course catalogue. Has `courseCode`, `subject`, `gradeLevel`, `teksCode`, `isTimedExam`, `timeLimitMinutes` |
| `userCourseEnrollments` | Which courses a student is enrolled in; `isCurrent` marks the active one |

### Student progress

| Table | Purpose |
|---|---|
| `userMastery` | Per-skill mastery score (0–100) per student per course |
| `unitProgress` | Unit-level completion state |
| `lessonProgress` | Lesson-level completion state |
| `quizAttempts` | Quiz results with `score`, `answers` (JSON), `questionTimings` (JSON), `isPracticeMode` |
| `diagnosticAttempts` | Diagnostic/placement results with `unitScores` (JSON) |

### Users & profiles

| Table | Purpose |
|---|---|
| `users` | Core identity: `openId`, `name`, `email`, `role` (user/admin), `accountType` (student/parent/teacher), `status`, `grade`, `school` |
| `userProfiles` | Extended demographics: `dateOfBirth`, `gender`, `city`, `state`, `country`, `schoolDistrict`, `schoolType`, `schoolName`, `gradeLevel`, `parentGoalCategory`, `parentGoalDetail`, `colorPalette`, `preferredName`, `aiWelcomeMessage`, `parentLedMode` |

### Family & access

| Table | Purpose |
|---|---|
| `parentChildren` | Parent → student links |
| `coParentAccess` | Secondary guardian view-only access |
| `coParentInvitations` | Invite flow for co-parents |
| `enrolmentInvitations` | Student invite tokens |
| `parentInviteTokens` | Student → parent invite flow |
| `studentInviteTokens` | Admin → student invite flow |

### Gamification (full system)

| Table | Purpose |
|---|---|
| `xpLedger` | XP awards per event |
| `studentLevels` | Aggregated XP + current level |
| `badges` | Badge catalogue |
| `userBadges` | Earned badges |
| `quests` | Quest catalogue |
| `userQuests` | Quest progress |
| `streaks` | Daily login/activity streaks |
| `houses` | House system (4 houses) |
| `userHouses` | House membership |
| `seasonalChallenges` | Time-limited challenges |
| `userSeasonalProgress` | Student progress on seasonal challenges |
| `rewardsMarketplace` | Redeemable rewards |
| `rewardRedemptions` | Redemption history |
| `userAvatars` | Avatar customisation |

### Platform / admin

| Table | Purpose |
|---|---|
| `platformSettings` | Key-value config store |
| `adminAuditLog` | Every admin action with actor, target, details, IP |
| `adminRoles` | Custom RBAC roles |
| `rolePermissions` | Granular permissions per role |
| `adminRoleAssignments` | User → role assignments |
| `cmsContent` | CMS pages (landing, about, etc.) |
| `cmsContentHistory` | Version history for CMS |
| `emailLogs` | Outbound email audit trail |
| `emailSuppression` | Bounce/complaint suppression list |
| `suppressionAuditLog` | Admin actions on suppression list |
| `userNotifications` | In-app notifications |
| `newsletterSubscriptions` | Email newsletter opt-ins |
| `newsletterCampaigns` | Campaign records |
| `chatSessions` | AI tutor session records (messages JSON) |
| `chatMessages` | Individual chat messages |
| `demoRequests` | School demo request form submissions |
| `referrals` | Referral links |
| `referralSignups` | Referral conversion tracking |
| `coupons` | Discount coupon catalogue |
| `couponRedemptions` | Coupon usage records |
| `subscriptions` | Stripe subscription records |
| `paymentAuditLog` | Stripe webhook event log |
| `courseRequests` | Student course access requests (parent approval flow) |
| `inactivityNotifications` | Re-engagement notification tracking |
| `questionFlags` | Student-reported question issues |
| `passwordResetTokens` | Password reset tokens |
| `twoFactorAuth` | TOTP 2FA secrets |
| `parentGoals` | AI-generated parent goal statements |
| `parentNotes` | Parent notes on students |

**Current schema does not have:** `StandardFramework`, `Standard`, `District`, `School`, `Track`, `PacingGuide`, `PacingWindow`, `ResourceAdoption`, `LearningObjective`, `EnrollmentContext`, `MasteryRecord` (concept-level), `StandardCrosswalk`, or `AssessmentType`. These are the entities the target architecture requires.

---

## 3. Curriculum Coupling — Hard-Coded Texas/Katy/TEKS References

This is the complete refactor target list, grouped by file.

### A. AI tutor system prompt (`server/educhamp-helpers.ts`)

| Location | Hard-coded assumption |
|---|---|
| Core Principle #6 (line ~468) | `"Follow the Texas Essential Knowledge and Skills (TEKS) standards for this course"` — unconditional, applies to all courses |
| Course context block (line ~367) | `course.teksCode` injected as `"TEKS Standard: ..."` — assumes TEKS is the only framework |
| `subjectExpertise` line (~368) | `"following " + course.teksCode` — assumes teksCode is always a TEKS code |
| `exam_review` mode instructions (line ~185) | `"Reference specific skill IDs (ALG1-U[N]-S[N])"` — hard-codes ALG1 format as the example |
| Parent goal category map (line ~319) | `"test_prep": "Test Preparation (STAAR/SAT/ACT)"` — STAAR named explicitly |
| Parent goal tutor note (line ~335) | `"if the goal is test prep, emphasise STAAR-aligned problem types"` — STAAR hard-coded |

### B. Landing page (`client/src/pages/LandingPage.tsx`)

| Location | Hard-coded assumption |
|---|---|
| Hero headline (line ~582) | `"70+ courses aligned to Katy ISD TEKS"` |
| Hero trust badges (line ~587) | `{ label: "TEKS Aligned" }` |
| Course catalogue header (line ~688) | `"All courses are aligned to Katy ISD TEKS and AP College Board standards with both ACA (standard) and KAP (advanced) pathways"` |
| Stats bar (line ~386) | `{ icon: BookOpen, title: "70+ Courses, Pre-K–Grade 12", desc: "...aligned to Katy ISD TEKS..." }` |
| Schools & Districts section header (line ~907) | `"fully aligned to TEKS"` |
| District control feature (line ~922) | `"custom TEKS alignment"` |
| District trust strip (line ~954) | `["Katy ISD", "Spring ISD", "Cypress-Fairbanks ISD", "Humble ISD", "Conroe ISD", "Alief ISD"]` — all Texas ISDs |
| District stats (line ~968) | `{ value: "TEKS", label: "Aligned" }` |
| Demo checklist (line ~990) | `"Custom TEKS alignment review"` |
| Pricing table (line ~1143) | `"Purpose-built for school districts and campuses — with teacher dashboards, custom TEKS alignment..."` |
| Pricing feature rows (lines ~1193, ~1197) | `"Custom TEKS alignment"` and `"TEKS-aligned curriculum"` |
| Pricing footer (line ~1222) | `"TEKS-aligned curriculum"` |
| FAQ answer (line ~478) | `"ISD / School License...custom TEKS alignment"` |
| FAQ answer (line ~480) | `"ACA (Academic) courses follow the standard Katy ISD grade-level curriculum. KAP (Katy Advanced Program) courses are accelerated..."` — defines ACA/KAP as Katy-specific |
| FAQ answer (line ~487) | `"All courses are aligned to Katy ISD TEKS (Texas Essential Knowledge and Skills) standards"` |

### C. Course switcher (`client/src/components/CourseSwitcher.tsx`)

| Location | Hard-coded assumption |
|---|---|
| Line ~158 | `"Katy ISD"` as the default district description fallback |

### D. Home page (`client/src/pages/Home.tsx`)

| Location | Hard-coded assumption |
|---|---|
| Line ~578 | `"Katy ISD"` reference in the welcome/dashboard copy |

### E. Guided tour (`client/src/components/GuidedTour.tsx`)

| Location | Hard-coded assumption |
|---|---|
| Line ~35 | `"Katy ISD"` in the onboarding tour step copy |

### F. Demo widget (`client/src/components/EduChampDemoWidget.tsx`)

| Location | Hard-coded assumption |
|---|---|
| Line ~82 | `"STAAR/EOC"` in the demo widget description |

### G. Student onboarding (`client/src/pages/StudentOnboarding.tsx`)

| Location | Hard-coded assumption |
|---|---|
| Line ~410 | `"Katy ISD"` as the default `schoolDistrict` placeholder |

### H. Marketing chatbot system prompt (`server/routers/landing.ts`)

| Location | Hard-coded assumption |
|---|---|
| LANDING_SYSTEM_PROMPT (lines ~1–80) | Multiple references to `"Katy ISD"`, `"TEKS"`, `"STAAR"`, `"KAP"`, `"ACA"` tracks as if they are universal |

### I. Onboarding goal generation (`server/routers/onboarding.ts`)

| Location | Hard-coded assumption |
|---|---|
| Goal generation LLM prompt (line ~130) | `"STAAR"` named in the goal category options passed to the AI |

### J. Database schema (`drizzle/schema.ts`)

| Location | Hard-coded assumption |
|---|---|
| `courses.teksCode` column | Column name and type imply TEKS is the only standards framework |
| `units.teksAlignment` column | Same — text field with no framework identifier |
| `lessons.teksAlignment` column | Same |

### K. Seed scripts (not in production runtime, but shape the data)

| File | Hard-coded assumption |
|---|---|
| `server/seed-courses.mjs` | All courses seeded with Katy ISD descriptions and TEKS codes |
| `server/seed-katy-gr45.mjs` | Katy ISD Grade 4–5 content |
| `server/seed-katy-gr68.mjs` | Katy ISD Grade 6–8 content |
| `server/seed-katy-kap-sci-ss.mjs` | Katy KAP Science & Social Studies |
| `server/seed-curriculum.mjs` | Original Algebra I content with TEKS unit structure |
| `server/seed-ap-courses.mjs` | AP courses seeded with TEKS + College Board references |
| `scripts/seed-prek-grade2.sql` | Pre-K–Grade 2 content with TEKS alignment strings |

### L. Stripe products (`server/stripe.ts`)

| Location | Hard-coded assumption |
|---|---|
| Plan feature descriptions | `"TEKS-aligned curriculum"` appears in the Family and ISD plan feature lists |

**Total hard-coded references found:** approximately **47 distinct occurrences** across **14 files**. The most structurally dangerous are (A) the AI tutor system prompt (affects every tutoring session) and (J) the schema columns (affect every content row in the database).

---

## 4. AI Layer

### Provider & model
- Provider: Manus Forge API (`BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY`)
- Model: abstracted — `invokeLLM()` in `server/_core/llm.ts` uses the platform default (no model name hard-coded in application code)
- Streaming: SSE endpoint at `/api/tutor/stream` using `invokeLLM` with `stream: true`

### How the tutor prompt is assembled (`server/tutorStream.ts` + `server/educhamp-helpers.ts`)

The `buildTutorSystemPrompt()` function in `educhamp-helpers.ts` assembles a context block from:

1. **Mode instructions** — one of: `tutor`, `quiz`, `exam_review`, `remediation`, `parent_summary`, `young_learner` (selected per request)
2. **Course context** — `courseTitle`, `courseCode`, `teksCode`, `gradeLevel`, `subject` — fetched from the `courses` table
3. **Student mastery data** — `userMastery` rows for the current course, sorted by score
4. **Placement/diagnostic results** — latest `diagnosticAttempts` row with `unitScores` JSON
5. **Recent quiz history** — last 8 `quizAttempts` rows
6. **Lesson progress** — `lessonProgress` rows for the current course
7. **Student demographics** — `schoolDistrict`, `gradeLevel`, `schoolType` from `userProfiles`
8. **Parent goal context** — `parentGoalCategory`, `parentGoalDetail`, `signupReason` from `userProfiles` / `parentGoals`
9. **Gamification profile** — level, XP, streak, recent badge from gamification tables
10. **Preferred name** — from `userProfiles.preferredName`
11. **Young learner / parent-led mode flags** — from `userProfiles`

**There is no RAG or vector retrieval.** The lesson content (explanation, worked examples, misconceptions) is stored in the `lessons` table as JSON and is currently **not injected into the tutor prompt**. The tutor relies on the LLM's parametric knowledge of the subject, guided by the mastery/progress context. This is the primary content-grounding gap for the target architecture.

### Out-of-course redirection
The prompt includes an explicit instruction to redirect students who ask about topics from other courses, with a suggestion to switch courses or enroll.

---

## 5. Auth & Student Data

### Authentication flow
1. Student/parent clicks "Sign In" → frontend calls `getLoginUrl()` which encodes `window.location.origin` + return path in OAuth state
2. Manus OAuth server handles credential exchange; callback lands at `/api/oauth/callback`
3. Server calls `sdk.getUserInfo()` → upserts `users` row → sets signed session cookie (1-year expiry)
4. 2FA gate: if user has TOTP enabled, a short-lived pending-2FA cookie is set and the user must verify before the full session cookie is issued
5. Every tRPC request: `authenticateRequest()` in `sdk.ts` reads the session cookie, fetches the user row, and **blocks** `suspended`, `deactivated`, `archived`, and `deleted` statuses (P0-1 fix applied)

### Personal data stored

| Data | Table | Notes |
|---|---|---|
| Name, email, login method | `users` | From OAuth provider |
| Date of birth | `userProfiles.dateOfBirth` | Collected during onboarding; YYYY-MM-DD string |
| Gender | `userProfiles.gender` | Optional; free-text or enum |
| City, state, country | `userProfiles` | Optional |
| School district, school name, school type | `userProfiles` | Optional; student-entered |
| Grade level | `userProfiles.gradeLevel` | Optional |
| Parent signup reason, goal detail | `userProfiles` | Free-text; AI-generated goal statement |
| Preferred name / display name | `userProfiles` | Optional |
| AI welcome message | `userProfiles.aiWelcomeMessage` | Custom message stored per student |
| TOTP secret | `twoFactorAuth.secret` | Encrypted at rest by DB |
| Quiz answers, mastery scores, lesson progress | multiple tables | Academic performance data |
| Chat history | `tutorSessions.messages` | Capped at 40 messages (20 turns) in tutorStream; 100 in the quiz chat path |

### Minors' data (FERPA / COPPA)
- This is a K–12 product; students as young as Pre-K are served
- Date of birth is collected but there is **no age gate** — a student under 13 can sign up without triggering a COPPA parental consent flow
- The parent module exists (parent links to student via invite), but it is opt-in, not required for under-13 accounts
- **Risk:** COPPA requires verifiable parental consent before collecting personal information from children under 13. The current flow does not enforce this.
- No data is shared between students; each student's data is isolated by `userId` in all queries
- FERPA compliance requires that educational records not be disclosed without consent; the current admin panel does allow admins to view any student's data — this is appropriate for an operator but should be documented in a privacy policy

---

## 6. Content Source

Content in the database was produced through three methods:

| Method | What it produced | Volume |
|---|---|---|
| **Hand-authored seed scripts** (`.mjs` files) | Original Algebra I (12 units, ~150 quiz questions, ~60 diagnostic questions), AP course structures | Majority of the original content |
| **LLM-generated via scripts** | `scripts/generate-missing-questions.mjs`, `scripts/generate-early-childhood-quiz.mjs`, `scripts/generate-early-childhood-diagnostics.mjs` — these call the Forge API to generate quiz/diagnostic questions for courses that lacked them | Grades Pre-K–2 quiz/diagnostic banks, gap-fill questions for other courses |
| **SQL import** | `scripts/seed-prek-grade2.sql` — Pre-K through Grade 2 lesson content | Early childhood curriculum |

**73 active courses** are in the database, spanning Pre-K through Grade 12 plus AP and SAT Prep.

The lesson content (explanation, worked examples, misconceptions) is stored in `lessons.explanation`, `lessons.workedExamples`, `lessons.guidedProblems`, `lessons.independentProblems`, `lessons.misconceptions` as JSON. This content was authored for Texas/TEKS and is not tagged to a standards framework entity — it is implicitly TEKS-aligned.

**There is no external content import pipeline** (no LMS integration, no publisher API, no IMS Global/QTI importer). All content is either hand-authored or LLM-generated and lives entirely in the database.

---

## 7. Gaps & Risks — What Blocks Multi-District Support Today

### G1 — No standards abstraction layer (most critical)
The database has no `StandardFramework`, `Standard`, or `LearningObjective` tables. Standards are stored as free-text strings in `teksCode` / `teksAlignment` columns. There is no way to say "this lesson teaches TEKS 111.39(b)(3)" as a structured, queryable fact. Until this exists, content cannot be tagged to a framework, crosswalks cannot be built, and pacing cannot be gated by standard.

### G2 — No district / pacing model
There is no `District`, `PacingGuide`, or `PacingWindow` table. The app has no concept of "what has Katy ISD taught by week 12 of the school year." The "Am I at par?" diagnostic mode cannot be built without this.

### G3 — No enrollment context
`userProfiles.schoolDistrict` is a free-text string. There is no `EnrollmentContext` entity binding a student to `{district, school, grade, course, track}`. The tutor prompt uses `schoolDistrict` as a display string only — it does not gate content.

### G4 — Mastery is stored at skill level, not concept/standard level
`userMastery` rows are keyed by `(userId, courseId, skillId)`. Skills are course-specific (e.g., `ALG1-U3-S2`). When a student moves districts or states, their mastery cannot be recomputed against a new standards framework because there is no crosswalk and no standard-level mastery record.

### G5 — AI tutor prompt hard-codes TEKS as the universal standard
Core Principle #6 in `buildTutorSystemPrompt()` unconditionally tells the LLM to follow TEKS. For a student in New York following NY_NGLS, this is incorrect and potentially confusing. Fixing this requires making the standards reference a runtime parameter derived from the student's enrollment context.

### G6 — Lesson content is implicitly TEKS-aligned with no portability
The 73 courses' lesson content was authored for Texas. There is no mechanism to serve a different explanation, worked example, or misconception set to a student in a different state. The content is not tagged to a `LearningObjective` entity, so it cannot be filtered or swapped by framework.

### G7 — No track system
The `courses` table has no `track` column. Katy's KAP (accelerated) vs. ACA (standard) distinction is expressed only in course names and landing page copy — not as a queryable data attribute. A multi-district model needs tracks as first-class entities with GPA weighting.

### G8 — No resource adoption model
There is no `ResourceAdoption` table. The app cannot record which textbook or HQIM a district has adopted, so the tutor cannot cite the student's actual classroom material.

### G9 — No district onboarding pipeline
Adding a new district requires a developer to write a seed script. There is no admin UI or importer for pacing guides, adopted materials, or course catalogs.

### G10 — COPPA age gate missing
Students under 13 can complete onboarding and use the AI tutor without triggering a parental consent flow. This is a legal risk for a K–12 product operating in the United States.

### G11 — Landing page and marketing copy are Katy ISD-specific
~20 hard-coded references to Katy ISD, TEKS, ACA, and KAP in `LandingPage.tsx` mean the public-facing product presents as a Katy ISD tool, not a universal one. This is a go-to-market blocker for other districts.

---

## Summary for the Founder

EduChamp is a well-built, production-ready AI tutoring platform with a strong feature set (73 courses, adaptive diagnostics, gamification, parent module, admin console, email, payments). The core problem is that it was built **as a Katy ISD product**, and Katy ISD assumptions are woven into the database schema, the AI tutor prompt, the landing page, and the seed data in approximately 47 distinct places.

The path to multi-district support is clear but requires careful, incremental work:

1. **Phase 1** adds the missing data layer (standards, districts, pacing, tracks, enrollment context) without breaking existing data — existing Katy content maps into the new structure as the "Katy ISD" district profile.
2. **Phase 2** makes the AI tutor read from that data layer instead of assuming TEKS.
3. **Phase 3** builds the district onboarding pipeline so new districts can be added without developer involvement.

The biggest technical risk is the mastery portability gap (G4): skill-level mastery scores cannot be translated across frameworks without a crosswalk, so a student who moves states would lose their progress history. This must be solved in Phase 1 before any student data is migrated.

The biggest legal risk is the COPPA age gate (G10). This should be addressed as a parallel track, not deferred to Phase 3.

---

*Ready for Checkpoint 0 review. Awaiting founder approval before any code changes.*
