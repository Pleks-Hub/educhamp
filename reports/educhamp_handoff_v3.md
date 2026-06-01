# EduChamp — Project Handoff Document v3

**Version:** 3.0  
**Date:** May 31, 2026  
**Checkpoint:** `a57807fc` (current stable)  
**Previous Handoff:** `educhamp_handoff_v2.md` (checkpoint `0a40ab58` — Sprint 37 Contextual Tooltips)  
**Author:** Manus AI  
**Repository:** `/home/ubuntu/educhamp` · `user_github` remote · branch `main`  
**Test Suite:** 960/960 passing · TypeScript: 0 errors · DB Migrations: 44 applied · Commits: 137

> **How to use this document:** This v3 handoff covers all work completed **after** `educhamp_handoff_v2.md`. Read v1 and v2 first for the foundational architecture, database schema, and feature catalogue through Sprint 37. This document describes the incremental changes and current state as of checkpoint `a57807fc`.

---

## Table of Contents

1. [What Changed Since v2](#1-what-changed-since-v2)
2. [New Database Columns & Migrations](#2-new-database-columns--migrations)
3. [New Shared Utilities](#3-new-shared-utilities)
4. [New & Updated Server Procedures](#4-new--updated-server-procedures)
5. [Admin Portal Overhaul — Sidebar Navigation](#5-admin-portal-overhaul--sidebar-navigation)
6. [Compliance & Age Verification System](#6-compliance--age-verification-system)
7. [Email Infrastructure Overhaul](#7-email-infrastructure-overhaul)
8. [Student-Side Age Gate on Enrolment](#8-student-side-age-gate-on-enrolment)
9. [New UI Features](#9-new-ui-features)
10. [Current Test Suite](#10-current-test-suite)
11. [Known Issues & Limitations](#11-known-issues--limitations)
12. [Pending Tasks](#12-pending-tasks)
13. [Recommended Next Steps](#13-recommended-next-steps)
14. [Sprint History (v2 → v3)](#14-sprint-history-v2--v3)
15. [Environment Variables](#15-environment-variables)
16. [Deployment](#16-deployment)

---

## 1. What Changed Since v2

| Area | Summary |
|---|---|
| **Admin Portal** | Replaced 23-tab horizontal bar with a 21-section left sidebar navigation grouped into 7 categories |
| **DOB & Age Verification** | Compulsory date-of-birth for all sign-ups; state-aware age-of-majority for guardians; student age-range check |
| **COPPA Hard-Block** | COPPA gate now uses DOB-based age check (age < 13) as primary signal, grade-level as fallback |
| **Age-Based Course Gating** | `minAgeRequirement` column added to courses; student-side gate in CourseSwitcher; admin edit form field |
| **Email Infrastructure** | Provider abstraction factory (Resend/SMTP/SendGrid); AES-256-GCM encrypted config; bootstrap procedure; Mail Service Health dashboard |
| **Admin Users Table** | DOB/Age column; COPPA indicator; age filter chips (COPPA, underage guardian) |
| **Sidebar Badge Counters** | Live counts on Flagged Questions, Demo Requests, Suppression List; auto-refresh every 60s |
| **Suppression Badge Tooltip** | Hover tooltip on Suppression List badge breaks down count into hard bounces, spam complaints, manual |
| **Demo Requests Popover** | Quick-action popover on Demo Requests sidebar item; mark as contacted without navigating away |
| **Student Age Gate UI** | CourseSwitcher shows amber "Age X+ required" badge; Enrol button disabled with tooltip for underage students |
| **Documents** | `educhamp_product_features_v1.md` and this handoff committed to `/reports` |

---

## 2. New Database Columns & Migrations

### Migration 0043 — `minAgeRequirement` on courses

```sql
ALTER TABLE courses ADD COLUMN minAgeRequirement INT NULL;
```

Stores the minimum student age (years) required to enrol. `NULL` = no restriction. Used by:
- `server/routers/admin.ts` `updateCourse` (admin can set/clear)
- `client/src/components/CourseSwitcher.tsx` (student-side gate)
- `client/src/components/admin/AdminCoursesTab.tsx` (edit form + badge)

### userProfiles — existing columns now enforced

`dateOfBirth` (DATE) and `state` (VARCHAR) columns already existed. They are now **required** during onboarding:
- Students: `dateOfBirth` required; age must be 3–21
- Parents/Guardians: `dateOfBirth` + `state` required; age must meet state-specific minimum

---

## 3. New Shared Utilities

### `shared/ageValidation.ts`

Single source of truth for age-related validation. Imported by both server procedures and client-side onboarding pages.

```typescript
// Calculate age in years from a date-of-birth string (YYYY-MM-DD)
export function calcAge(dob: string): number

// Get the minimum guardian age for a U.S. state
// Returns 21 for Mississippi, 19 for Alabama/Nebraska, 18 for all others
export function getGuardianMinAge(state: string): number

// Returns null if valid, or an error message string if invalid
export function validateGuardianAge(dob: string, state: string): string | null

// Returns null if valid (age 3–21), or an error message string if invalid
export function validateStudentAge(dob: string): string | null
```

**Test coverage:** `server/ageValidation.test.ts` — 35 tests covering all edge cases.

---

## 4. New & Updated Server Procedures

### `admin.ts` — New Procedures

| Procedure | Description |
|---|---|
| `admin.getEmailServiceHealth` | Overall email status (ok/warning/error/unconfigured), active provider details, 7-day delivery stats |
| `admin.getEmailDeliveryStats` | Daily delivery counts (sent/failed/skipped) for last N days; used for sparkline chart |
| `admin.getSidebarBadgeCounts` | Returns `{ flaggedQuestions, demoRequests, suppressionList, suppressionBreakdown: { bounced, complained, manual } }` |

### `admin.ts` — Updated Procedures

| Procedure | Change |
|---|---|
| `admin.updateCourse` | Input schema now accepts optional `minAgeRequirement: z.number().min(3).max(21).nullable()` |

### `onboarding.ts` — Updated Schemas

| Procedure | Change |
|---|---|
| `onboarding.saveStudentProfile` | `dateOfBirth` is now required; server validates age 3–21 using `shared/ageValidation.ts` |
| `onboarding.saveParentProfile` | `dateOfBirth` + `state` are now required; server validates age-of-majority using `getGuardianMinAge(state)` |

### `server/db.ts` — Updated Helpers

| Helper | Change |
|---|---|
| `getAllUsers` | Joins `userProfiles`; returns `dateOfBirth` and `state` per user |
| `updateCourse` | Accepts `minAgeRequirement` |
| `updateCourseWithStatus` | Accepts `minAgeRequirement` |
| `requiresCoppaConsentByAge` | New helper: DOB age < 13 check first, grade-level fallback |

---

## 5. Admin Portal Overhaul — Sidebar Navigation

### Before

23-tab horizontal `<Tabs>` bar — unusable on small screens, no grouping.

### After

Left sidebar navigation in `client/src/pages/AdminDashboard.tsx`:

| Category | Sections |
|---|---|
| Dashboard | Overview |
| Users & Access | Users, RBAC |
| Content | Courses, CMS, Grades, Course Requests |
| Finance | Subscriptions, Coupons, Payment Analytics |
| Email | Email Logs, Suppression List, Email Settings |
| Compliance & Safety | Inactivity Monitor, Gamification, Flagged Questions, Demo Requests |
| System | Audit Log, District Transfer, System Health |

**Key implementation details:**

- `ADMIN_NAV_GROUPS` — typed configuration array at the top of `AdminDashboard.tsx`
- `AdminSidebar` — component within `AdminDashboard.tsx`; accepts `activeSection`, `setActiveSection`, `badgeCounts`, `onClose`
- `getBadge(section, badgeCounts)` — returns badge count for a given section key
- `getSidebarBadgeCounts` query: `refetchInterval: 60_000`, `staleTime: 30_000`
- Suppression List item: renders `<Tooltip>` with breakdown text when `suppressionBreakdown` is present
- Demo Requests item: renders `<Popover>` with 3 newest "new" requests + "Mark as contacted" mutation button
- Mobile: hamburger button opens slide-over overlay with backdrop dismiss

---

## 6. Compliance & Age Verification System

### Guardian Age-of-Majority Enforcement

**Client-side** (`client/src/pages/ParentOnboarding.tsx`): inline error message with specific minimum age for the selected state; Continue button disabled while age is insufficient; green "Age verified" banner when eligible.

**Server-side** (`server/routers/onboarding.ts` `saveParentProfile`): throws `BAD_REQUEST` with a state-specific message.

**State-specific minimums:**
- Mississippi: 21 years
- Alabama, Nebraska: 19 years
- All other U.S. states: 18 years (default)

### Student Age Range Enforcement

- Client-side: `client/src/pages/StudentOnboarding.tsx` — inline red error with icon
- Server-side: `server/routers/onboarding.ts` `saveStudentProfile` — throws `BAD_REQUEST`
- Valid range: 3–21 years

### COPPA Gate Enhancement

Updated `requiresCoppaConsentByAge` helper in `server/db.ts`:

```
Priority:
1. If userProfile.dateOfBirth exists → compute age → gate if age < 13
2. If no DOB → fall back to grade-level check (K–5 = COPPA)
3. If consent exists in parentalConsents → allow through
```

### Age-Based Course Gating

- **Admin:** `AdminCoursesTab.tsx` CourseDetail Overview tab has a number input (1–25, nullable) with Save button. Amber `ShieldAlert` badge on course cards and CourseDetail header when set.
- **Student:** `CourseSwitcher.tsx` fetches student profile, computes age, disables Enrol button with tooltip if underage.
- **⚠️ Gap:** `enrollSelf` procedure does not yet enforce `minAgeRequirement` server-side. See Section 13.

---

## 7. Email Infrastructure Overhaul

### Provider Abstraction

`server/services/email/factory.ts` — two-tier fallback:
1. Active DB provider (from `emailSettings` table; AES-256-GCM decrypted)
2. `RESEND_API_KEY` + `RESEND_FROM_EMAIL` env var fallback

Supported providers: `resend`, `smtp`, `sendgrid`

### Bootstrap Procedure

`server/services/email/bootstrap.ts` runs at server startup. Seeds a default Resend provider row if no active provider exists. Ensures email works immediately after deployment.

### Mail Service Health Dashboard

Admin → Email Settings tab (top card):
- Status banner: green (Operational), amber (Needs Attention), red (Connection Error), gray (Not Configured)
- Stat tiles: emails sent (7d), failed (7d), failure rate
- 7-day stacked bar chart (Recharts `BarChart`)
- Auto-refreshes every 30 seconds; manual Refresh button

Powered by `admin.getEmailServiceHealth` and `admin.getEmailDeliveryStats`.

---

## 8. Student-Side Age Gate on Enrolment

`client/src/components/CourseSwitcher.tsx` rewritten to:

1. Fetch student profile via `trpc.onboarding.getProfile.useQuery()` to get `dateOfBirth`
2. Compute `studentAge = calcAge(dateOfBirth)` from `shared/ageValidation.ts`
3. Per course card: if `course.minAgeRequirement && studentAge < course.minAgeRequirement` → amber `ShieldAlert` badge + disabled Enrol button with tooltip

---

## 9. New UI Features

### Admin Users Table

**File:** `client/src/components/admin/AdminUsersTab.tsx`

- **DOB / Age column** between Role and Actions: formatted date + calculated age. Shows "—" when no DOB.
- **COPPA indicator:** amber baby icon with title tooltip for users under 13.
- **Age filter chips:** "All Ages", "Under 13 (COPPA)", "Underage Guardians" (uses state-specific minimums).
- **colSpan** updated to 9.

### Admin Courses Tab

**File:** `client/src/components/admin/AdminCoursesTab.tsx`

- `minAgeRequirement` field in CourseDetail Overview tab (number input 1–25, nullable, Save button).
- Age-requirement badge on course list cards and CourseDetail header.
- Helper text explains recommended thresholds.

### Demo Requests Quick-Action Popover

**File:** `client/src/pages/AdminDashboard.tsx` (within `AdminSidebar`)

When Demo Requests badge > 0, clicking the sidebar item opens a `<Popover>` showing:
- Up to 3 newest "new" requests with name, email, timestamp
- "Mark as contacted" button per request (calls `trpc.admin.updateDemoRequest.useMutation()`)
- "View all" link navigates to Demo Requests section

### Suppression List Badge Tooltip

Hover tooltip on the Suppression List sidebar badge shows:
- Hard bounces: N
- Spam complaints: N
- Manual: N

---

## 10. Current Test Suite

| Metric | Value |
|---|---|
| Total test files | 34 |
| Total tests | 960 |
| Passing | 960 (100%) |
| TypeScript errors | 0 |
| Applied migrations | 44 |
| Total commits | 137 |

**New test files in this sprint:**
- `server/ageValidation.test.ts` — 35 tests for `shared/ageValidation.ts`

```bash
# Run all tests
cd /home/ubuntu/educhamp && pnpm test

# TypeScript check
npx tsc --noEmit
```

---

## 11. Known Issues & Limitations

| Issue | Severity | Status |
|---|---|---|
| `enrollSelf` does not enforce `minAgeRequirement` server-side | **Medium** | Pending — client-side gate only |
| No public `/pricing` page | Low | Pending |
| Seasonal challenges leaderboard UI is a placeholder | Low | Pending |
| `enrollmentContexts` and `masteryRecords` procedures are stubs | Low | Pending |
| No offline/PWA support | Low | Pending |
| Safari Private Browsing blocks Manus OAuth session cookies | Low | By design |
| Admin Users table age filter is client-side only | Low | Pending |

---

## 12. Pending Tasks

From `todo.md` (items marked `[ ]`):

- `[ ]` Server-side age enforcement in `enrollSelf` procedure
- `[ ]` Public `/pricing` page with Stripe Checkout integration
- `[ ]` Seasonal challenges leaderboard UI in Gamification Hub
- `[ ]` Full `enrollmentContexts` and `masteryRecords` procedure implementation
- `[ ]` COPPA consent email HTML template with EduChamp branding
- `[ ]` Admin Users table server-side age filter
- `[ ]` Scheduled daily email delivery report (Heartbeat job)
- `[ ]` PWA / offline support (Vite PWA plugin + Workbox)

---

## 13. Recommended Next Steps

**P0 — Security / Correctness**

1. **Server-side age enforcement in `enrollSelf`** — Fetch `userProfile.dateOfBirth` for the student, compute age with `calcAge()`, throw `BAD_REQUEST` if `age < course.minAgeRequirement`. Closes the API bypass gap.

**P1 — Revenue / Growth**

2. **Public `/pricing` page** — Build a `/pricing` route with three tier cards. The `payment.ts` router already has `createCheckoutSession`. Add a `getPlans` public procedure returning plan names and prices from `server/stripe.ts`.

**P2 — Engagement**

3. **Seasonal challenges leaderboard** — `seasonalChallenges` and `userSeasonalProgress` tables are populated. Build the leaderboard in `GamificationHub.tsx` using a new `gamification.getSeasonalLeaderboard` procedure.

**P3 — Operations**

4. **Daily email delivery report (Heartbeat job)** — Scheduled job at 08:00 UTC calling `getEmailServiceHealth` and sending a digest via `notifyOwner()`. See `references/periodic-updates.md` for Heartbeat setup.

5. **Admin Users table server-side age filter** — Add `ageFilter: 'all' | 'coppa' | 'underage_guardian'` to `listUsers` input schema; apply in `getAllUsers` helper.

**P4 — Compliance**

6. **COPPA consent email HTML template** — Replace plain-text consent email with branded HTML template using `sendEmail()`.

---

## 14. Sprint History (v2 → v3)

| Checkpoint | Description |
|---|---|
| `323fd835` | Mail Service Reconfiguration: provider abstraction factory, AES-256-GCM encrypted config, bootstrap procedure, Mail Service Health dashboard, `getEmailServiceHealth` and `getEmailDeliveryStats` procedures |
| `9ecd9360` | Compulsory DOB & State-Aware Age-of-Majority: `shared/ageValidation.ts`, server-side validation in `saveStudentProfile` and `saveParentProfile`, updated onboarding UI, 35 new Vitest tests |
| `0bb374a5` | Admin Portal UX Overhaul: 21-section left sidebar, DOB/Age column in Users table with COPPA indicator, COPPA gate enhanced to DOB-first logic, `minAgeRequirement` column on courses (migration 0043) |
| `a57807fc` | Age-Gated Enrolment UI + Users Age Filter + Sidebar Badge Counters: `minAgeRequirement` field in admin courses edit form, age-requirement badge on course cards, three age filter chips in Users table, `getSidebarBadgeCounts` with suppression breakdown, red pill badges on sidebar items |
| *(current)* | Student Age Gate in CourseSwitcher, Suppression badge tooltip with breakdown, Demo Requests quick-action popover, Product Feature Document and this Handoff Document committed to `/reports` |

---

## 15. Environment Variables

All injected by the Manus platform. Refer to `server/_core/env.ts` for typed access. Do not hardcode or commit `.env` files.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing secret |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL (frontend) |
| `OWNER_OPEN_ID`, `OWNER_NAME` | Platform owner identity |
| `BUILT_IN_FORGE_API_URL` | Manus built-in APIs (LLM, storage, etc.) |
| `BUILT_IN_FORGE_API_KEY` | Server-side bearer token for Manus APIs |
| `VITE_FRONTEND_FORGE_API_KEY` | Frontend bearer token for Manus APIs |
| `RESEND_API_KEY` | Default email provider API key |
| `RESEND_FROM_EMAIL` | Default sender address |
| `STRIPE_SECRET_KEY` | Stripe server-side key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe frontend key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature secret |

---

## 16. Deployment

Hosted on Manus infrastructure (Cloud Run, 1 vCPU, 512 MiB RAM, 180s request timeout, min-instances=0).

**To deploy:**
1. `pnpm test` — all 960 tests must pass
2. `npx tsc --noEmit` — must exit 0
3. `webdev_save_checkpoint` — creates a checkpoint
4. Click **Publish** in the Manus Management UI

Do not deploy via `git push` to external hosting providers.

---

*Generated from EduChamp codebase checkpoint `a57807fc` — May 31, 2026.*  
*Previous handoffs: `educhamp_handoff_v1.md` (Sprint 60) · `educhamp_handoff_v2.md` (Sprint 37).*
