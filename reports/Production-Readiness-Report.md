# EduChamp — Production Readiness Report

**Prepared by:** Manus AI  
**Date:** May 27, 2026  
**Build version:** d61d10a8 (Sprint 21 complete)  
**Deployment:** educhamp.app · www.educhamp.app · educhamp.manus.space  
**Stack:** React 19 · Tailwind 4 · Express 4 · tRPC 11 · Drizzle ORM · MySQL/TiDB  
**Test status:** 72/72 passing · TypeScript: 0 errors

---

## Executive Summary

EduChamp is functionally complete across all four portals (Student, Parent, Admin, Landing) and is technically deployable today. The platform has a solid foundation: end-to-end type safety via tRPC, transactional email with retry logic, a 9-tab Admin Console, a full RBAC data model, and a daily heartbeat handler. However, a structured review of the codebase identified **six blocking issues** and **twelve non-blocking improvements** that should be addressed before the platform handles real student data at scale. The blocking issues are primarily in security enforcement and operational configuration; none require architectural changes.

---

## Severity Classification

| Severity | Meaning |
|---|---|
| **P0 — Blocker** | Must be fixed before launch; poses security, data, or operational risk |
| **P1 — High** | Should be fixed in the first week of production; degrades user experience or reliability |
| **P2 — Medium** | Address within the first month; technical debt that compounds over time |
| **P3 — Low** | Nice-to-have polish; no immediate risk |

---

## P0 — Blocking Issues (Fix Before Launch)

### 1. Suspended/Archived/Deleted Users Can Still Log In

**File:** `server/_core/sdk.ts` lines 280–309

The `authenticateRequest` method fetches the user from the database and returns them without checking the `status` column. A user with `status = "suspended"` or `status = "deleted"` — set by an admin via the Users tab — can still make authenticated API calls with a valid session cookie. The admin action writes to the database, but the auth layer never reads it back.

**Fix required:** In `authenticateRequest`, after fetching the user, add:

```ts
if (user.status === "suspended") throw ForbiddenError("Your account has been suspended.");
if (user.status === "deleted" || user.status === "archived") throw ForbiddenError("Account not found.");
```

This is a single three-line change in `server/_core/sdk.ts` and is the highest-priority fix in this report.

---

### 2. No HTTP Security Headers (No Helmet)

**File:** `server/_core/index.ts` lines 36–54

The Express server has no security headers middleware. There is no `helmet`, no explicit `Content-Security-Policy`, no `X-Frame-Options`, no `X-Content-Type-Options`, and no `Strict-Transport-Security`. On Cloud Run behind HTTPS, the absence of these headers leaves the app vulnerable to clickjacking, MIME-type sniffing, and cross-site scripting escalation.

**Fix required:** Install and mount `helmet` as the first middleware:

```bash
pnpm add helmet
```

```ts
import helmet from "helmet";
app.use(helmet({ contentSecurityPolicy: false })); // CSP can be tuned separately
```

This is a one-line change that closes a broad class of browser-level attacks.

---

### 3. No Rate Limiting on Public Endpoints

**File:** `server/_core/index.ts`, `server/routers/landing.ts`

The public landing chatbot (`landing.chat`) and the token-lookup endpoints (`onboarding.lookupParentInvite`, `onboarding.lookupStudentInvite`) have no rate limiting. The chatbot invokes a paid LLM API on every call. A single malicious actor could exhaust the LLM budget or enumerate invite tokens in seconds. The `resendParentInvite` procedure has a per-student application-level rate limit (10/24h), but this is not enforced at the transport layer and can be bypassed by creating multiple accounts.

**Fix required:** Install `express-rate-limit` and apply a global limiter plus a stricter one on the `/api/trpc/landing.chat` path:

```bash
pnpm add express-rate-limit
```

```ts
import rateLimit from "express-rate-limit";
app.use("/api/trpc", rateLimit({ windowMs: 60_000, max: 120 }));
app.use("/api/trpc/landing.chat", rateLimit({ windowMs: 60_000, max: 10 }));
```

---

### 4. Granular RBAC Data Exists But Is Not Enforced

**Files:** `server/routers/admin.ts` lines 59–64, `server/_core/trpc.ts` lines 55–70

The RBAC system (8 system roles, `rolePermissions` table, `adminRoleAssignments` table) was built in Sprint 18 and is fully functional in the Admin Console UI. However, every admin procedure is gated by a single coarse check — `ctx.user.role !== "admin"` — and the granular permissions stored in the database are never consulted server-side. An admin assigned only the "Content Manager" role can still call `admin.deleteUser` or `admin.updateCourse` because the server does not check their specific permissions.

**Fix required:** Add a `checkAdminPermission(userId, resource, action)` helper in `server/db.ts` that queries `adminRoleAssignments` and `rolePermissions`, then call it inside the relevant admin procedures. At minimum, wrap destructive operations (user deletion, role assignment, CMS publishing) before launch. Full per-procedure enforcement can be phased in over the first sprint post-launch.

---

### 5. Invite-Expiry Heartbeat Cron Is Not Registered

**File:** `server/scheduled/inviteExpiry.ts`, `references/periodic-updates.md`

The handler at `POST /api/scheduled/invite-expiry` is mounted and working (confirmed by code review), but `manus-config schedule status` returns `{}` — no scheduled jobs are registered. The handler will never run in production until it is explicitly registered. Parent invite tokens will silently expire without notifying students, and the `userNotifications` table will remain empty.

**Fix required (post-publish, one command):**

```bash
manus-config schedule create \
  --name "invite-expiry-daily" \
  --path "/api/scheduled/invite-expiry" \
  --method POST \
  --cron "0 2 * * *"
```

This must be run after the site is published. The grade-promotion heartbeat (`/api/scheduled/grade-promotion`) is also unregistered and should be scheduled at the same time.

---

### 6. `RESEND_FROM_EMAIL` Sender Domain Is Not Verified

**File:** `server/_core/env.ts` line 11, `server/emailService.ts`

The `RESEND_FROM_EMAIL` environment variable defaults to `"EduChamp <invites@educhamp.app>"`. If the `educhamp.app` domain is not verified in the Resend dashboard with the required DNS records (SPF, DKIM, DMARC), all transactional emails will either be rejected by Resend or delivered to spam. The `emailLogs` table will show `status: "failed"` for every invite email sent to real users.

**Fix required:**
1. In the Resend dashboard, navigate to **Domains → Add Domain** and add `educhamp.app`.
2. Add the three DNS records (SPF TXT, DKIM TXT, DMARC TXT) to the domain's DNS provider.
3. Wait for verification (typically 5–30 minutes).
4. Set `RESEND_FROM_EMAIL` in the Secrets panel to `EduChamp <invites@educhamp.app>`.

---

## P1 — High Priority (First Week of Production)

### 7. No Database Indexes on High-Traffic Query Columns

**File:** `drizzle/schema.ts`

A review of the full schema shows that only five indexes exist across the entire database: the `openId` unique on `users`, `skillId` unique on `skills`, `questionId` unique on `diagnosticQuestions`, `course_unit_unique` on `units`, and the two RBAC uniques. The following columns are queried on every page load and have no index:

| Table | Column | Query pattern |
|---|---|---|
| `unitProgress` | `userId` | Every dashboard load |
| `lessonProgress` | `userId`, `unitId` | Every lesson page |
| `quizAttempts` | `userId` | Dashboard + parent portal |
| `diagnosticAttempts` | `userId`, `courseId` | Diagnostic gate check |
| `userMastery` | `userId` | Every mastery panel |
| `parentChildren` | `parentId`, `childId` | Every parent portal load |
| `parentInviteTokens` | `studentId`, `status` | Invite banner polling (30s) |
| `userNotifications` | `userId`, `isRead` | Notification bell polling (30s) |
| `emailLogs` | `toEmail`, `status` | Admin email logs tab |
| `tutorSessions` | `userId` | Every tutor session |

With a small user base this is invisible, but at 1,000+ concurrent students the `parentInviteTokens` and `userNotifications` tables — both polled every 30 seconds — will cause full table scans. These indexes should be added in a migration before public launch.

---

### 8. Raw Stack Traces Exposed to End Users on Runtime Errors

**File:** `client/src/components/ErrorBoundary.tsx` lines 24–55

The global React error boundary renders `this.state.error?.stack` in a `<pre>` tag visible to the end user. In production, this exposes internal file paths, function names, and framework internals to anyone who triggers a client-side crash. It also provides no recovery path beyond a page reload.

**Fix required:** Replace the `<pre>{error.stack}</pre>` with a generic user-facing message in production, and optionally send the error to a monitoring service (see item 13 below). The fix is a 10-line change to `ErrorBoundary.tsx`.

---

### 9. `listUsers` Search Parameter Is Ignored

**File:** `server/db.ts` line 1103, `server/routers/admin.ts` line 84

The `admin.listUsers` procedure accepts a `search` input parameter (validated by Zod), but `getAllUsers` ignores it entirely and returns all users ordered by `createdAt`. The Admin Users tab sends `limit: 1000` and filters client-side with JavaScript. This means the server always returns up to 1,000 user rows on every keystroke in the search box, and the search only works as long as all users fit in the first 1,000 rows.

**Fix required:** Add a `search` parameter to `getAllUsers` and apply a `LIKE` filter on `name` and `email` using Drizzle's `or(like(...), like(...))` pattern. This is a straightforward DB helper change.

---

### 10. Tutor Session Message History Grows Without Bound in the Database

**File:** `server/routers.ts` lines 754–759

The tutor chat procedure appends every message pair to the full `history` array and writes the entire array back to the `tutorSessions.messages` JSON column. The `recentHistory.slice(-20)` only limits what is sent to the LLM; the database column continues to grow indefinitely. A student who uses the tutor for a full semester could accumulate thousands of messages in a single JSON column, causing slow reads and eventually hitting MySQL's JSON column size limits.

**Fix required:** Cap the stored history at a reasonable limit (e.g., 200 messages) in the `updateTutorSessionMessages` call, or archive old sessions to a separate `tutorSessionArchives` table.

---

### 11. No `robots.txt` or `sitemap.xml`

**File:** `client/public/`

The `client/public/` directory contains only `favicon.ico`. There is no `robots.txt` to control search engine crawling of authenticated routes (e.g., `/admin`, `/parent`, `/diagnostic`), and no `sitemap.xml` to guide indexing of the public landing page and course catalog. Without `robots.txt`, search engine bots may attempt to crawl and index protected pages, generating noise in server logs and potentially exposing route structure.

**Fix required:** Add a `client/public/robots.txt` that disallows crawling of `/admin`, `/parent`, `/diagnostic`, `/quiz`, `/tutor`, and `/onboarding`, while allowing the landing page and course catalog.

---

### 12. CMS Table Is Empty — No Default Content Seeded

**File:** `drizzle/schema.ts` (`cmsContent` table), `server/db.ts`

The CMS system (Admin Console → CMS tab) was built in Sprint 18 with a full draft/publish/history workflow. However, the `cmsContent` table has no seed data. The CMS tab shows an empty state in production, and no frontend page currently reads from the CMS — the landing page and FAQ are hardcoded in React components. This means the CMS feature is built but not connected to the live site.

**Fix required (two steps):**
1. Seed default CMS entries for the key content blocks (hero title, hero subtitle, FAQ items, announcement banner) via a migration or a one-time seed script.
2. Update the landing page and FAQ components to fetch their content from `trpc.admin.cms.listContent` with a fallback to the hardcoded defaults, so admins can edit live copy without a code deploy.

---

## P2 — Medium Priority (First Month)

### 13. No Error Monitoring or Alerting

The platform has no integration with an error tracking service (e.g., Sentry, Datadog, or even a simple webhook to the owner notification system). Server-side `try/catch` blocks log to `console.error`, which is visible in Cloud Run logs but requires manual inspection. Client-side crashes are caught by `ErrorBoundary` but not reported anywhere. In production, silent failures in the email service, heartbeat handler, or LLM calls will go undetected until a user reports them.

**Recommended fix:** Integrate Sentry (free tier covers the expected traffic). Add `@sentry/node` on the server and `@sentry/react` on the client. The `ErrorBoundary` can call `Sentry.captureException(error)` before rendering the fallback UI.

---

### 14. No Welcome Email for New Student or Parent Registrations

The email service and Resend integration are fully operational, but only parent invite emails are sent. New students who complete onboarding and new parents who accept an invite receive no confirmation email. A welcome email with the student's course name, a link to the diagnostic test, and EduBot's introduction would significantly improve activation rates and reduce first-session drop-off.

**Recommended fix:** Add a `sendWelcomeEmail` call inside `completeOnboarding` (for students) and `acceptParentInvite` (for parents), using the same `sendEmail` helper and a new `welcomeStudent`/`welcomeParent` template.

---

### 15. Admin Users Tab Search Is Client-Side Only

Related to item 9, the Admin Users tab currently loads up to 1,000 users on mount and filters them in the browser. This is a UX issue (slow initial load) and a scalability issue (breaks at 1,001 users). The fix described in item 9 (server-side search) also resolves this.

---

### 16. No Dedicated 403 Access-Denied Page

**File:** `client/src/App.tsx`

There is a polished 404 page (`NotFound.tsx`), but there is no equivalent 403 page. Admin-only pages that detect a non-admin user render an inline "Access Denied" card within the page layout, which looks inconsistent. A dedicated `/403` route with the same visual language as the 404 page would provide a cleaner experience.

---

### 17. `50mb` Body Parser Limit Is Excessive

**File:** `server/_core/index.ts` lines 39–40

The JSON and URL-encoded body parsers are configured with a `50mb` limit. This was likely set for a file upload use case, but EduChamp does not currently accept file uploads through the tRPC API (files go through the storage proxy). A `50mb` JSON body limit means a single malicious request can consume 50 MB of server memory before being rejected, which is a denial-of-service vector on a 512 MiB Cloud Run instance.

**Fix required:** Reduce the limit to `1mb` for the tRPC route and `10mb` for the storage proxy route specifically.

---

### 18. No `Content-Security-Policy` for the Frontend

Even after adding `helmet` (item 2), the `contentSecurityPolicy: false` option should be replaced with a properly scoped CSP that allows only known origins (the Manus OAuth server, Resend, the built-in Forge API, and Google Fonts). This prevents XSS attacks from loading arbitrary external scripts.

---

## P3 — Low Priority (Polish)

### 19. Diagnostic Page Has Low Responsive Coverage

**File:** `client/src/pages/Diagnostic.tsx`

The Diagnostic page has only 4 responsive class variants (`sm:`, `md:`, `lg:`), compared to 13 in `ParentDashboard.tsx` and 20+ in `Home.tsx`. The question header and answer grid may overflow on screens narrower than 375px (iPhone SE). A targeted responsive pass on the question card layout is recommended.

---

### 20. No `<meta>` Description or Open Graph Tags on the Landing Page

**File:** `client/index.html`

The `<head>` of `index.html` has no `<meta name="description">`, no Open Graph tags (`og:title`, `og:description`, `og:image`), and no Twitter card tags. When the site URL is shared on social media or appears in search results, it will show a blank preview. Adding these tags to `index.html` (or dynamically via `react-helmet-async`) is a 10-minute task with outsized marketing impact.

---

## Summary Table

| # | Issue | Severity | Effort | File(s) |
|---|---|---|---|---|
| 1 | Suspended users can still log in | **P0** | 3 lines | `server/_core/sdk.ts` |
| 2 | No HTTP security headers (Helmet) | **P0** | 2 lines | `server/_core/index.ts` |
| 3 | No rate limiting on public endpoints | **P0** | 5 lines | `server/_core/index.ts` |
| 4 | RBAC permissions not enforced server-side | **P0** | Medium | `server/routers/admin.ts` |
| 5 | Invite-expiry heartbeat cron not registered | **P0** | 1 CLI command | Post-publish config |
| 6 | Resend sender domain not verified | **P0** | DNS + Secrets panel | Resend dashboard |
| 7 | Missing DB indexes on 10 high-traffic columns | **P1** | 1 migration | `drizzle/schema.ts` |
| 8 | Raw stack traces shown to users | **P1** | 10 lines | `client/src/components/ErrorBoundary.tsx` |
| 9 | `listUsers` search is ignored server-side | **P1** | Small | `server/db.ts` |
| 10 | Tutor session history grows unbounded in DB | **P1** | Small | `server/routers.ts` |
| 11 | No `robots.txt` | **P1** | 10 lines | `client/public/robots.txt` |
| 12 | CMS table empty, not connected to frontend | **P1** | Medium | `server/db.ts`, landing page |
| 13 | No error monitoring (Sentry) | **P2** | Small | New integration |
| 14 | No welcome email for new registrations | **P2** | Small | `server/routers/onboarding.ts` |
| 15 | Admin user search is client-side only | **P2** | Small | `server/db.ts` |
| 16 | No dedicated 403 page | **P2** | Small | `client/src/pages/` |
| 17 | Body parser limit is 50mb (DoS risk) | **P2** | 2 lines | `server/_core/index.ts` |
| 18 | No Content-Security-Policy | **P2** | Small | `server/_core/index.ts` |
| 19 | Diagnostic page low responsive coverage | **P3** | Small | `client/src/pages/Diagnostic.tsx` |
| 20 | No Open Graph / meta description tags | **P3** | 10 lines | `client/index.html` |

---

## Recommended Launch Sequence

The following order minimises risk and can be completed in a single focused sprint before going live:

**Day 1 — Security hardening (P0 items 1–3):**  
Fix the suspended-user auth bypass, add Helmet, and add rate limiting. These are collectively fewer than 20 lines of code and close the most critical attack surfaces.

**Day 1 — Email configuration (P0 item 6):**  
Verify the `educhamp.app` sender domain in Resend and set `RESEND_FROM_EMAIL` in the Secrets panel. This is a prerequisite for any real user receiving an invite email.

**Day 2 — Database indexes (P1 item 7):**  
Generate and apply a single migration that adds indexes to the 10 high-traffic columns. This is the most impactful performance change and takes under an hour.

**Day 2 — ErrorBoundary fix + robots.txt (P1 items 8, 11):**  
Both are small, isolated changes with no risk of regression.

**Day 3 — RBAC enforcement (P0 item 4):**  
Add a `checkAdminPermission` helper and apply it to the five most sensitive admin procedures (deleteUser, updateUserRole, publishCmsContent, assignRole, updatePlatformSetting). Full per-procedure coverage can follow in the next sprint.

**Post-publish (same day as publish) — Heartbeat cron (P0 item 5):**  
Run the `manus-config schedule create` command for both `/api/scheduled/invite-expiry` and `/api/scheduled/grade-promotion` immediately after clicking Publish.

**Week 1 — P1 remaining items (9, 10, 12):**  
Fix server-side user search, cap tutor session history, and seed CMS defaults. These improve reliability and unlock the CMS feature for real use.

---

*This report reflects the state of the codebase at checkpoint `d61d10a8`. All findings are based on direct code inspection of the files listed in the Key Files section of the project context.*
