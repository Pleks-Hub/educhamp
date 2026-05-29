# EduChamp Code Review Findings

**Reviewer:** ASA  
**Date:** May 29, 2026  
**Reviewed:** Production-Readiness-Report.md + full codebase context  
**Build:** d61d10a8 (Sprint 21 complete)  

---

## Summary

**Status:** Feature-complete and deployment-ready on technical features. Six P0 security/operational blockers must be fixed before handling real student data.

**Test Coverage:** 72/72 passing. TypeScript: 0 errors.

**Time to Launch:** 4–8 hours (1 focused sprint) if all P0 items are addressed sequentially.

---

## Critical Path (P0 — MUST FIX)

### 1. Suspended User Auth Bypass

**File:** `server/_core/sdk.ts` lines 280–309  
**Risk:** High — Compromised account lockout  
**Fix:** 3 lines

```typescript
// In authenticateRequest(), after fetching user:
if (user.status === "suspended") throw ForbiddenError("Your account has been suspended.");
if (user.status === "deleted" || user.status === "archived") throw ForbiddenError("Account not found.");
```

**Why:** Admin writes `status = "suspended"` via the Users tab. Auth layer ignores this and allows the suspended user to continue making API calls with a valid cookie. This breaks admin enforcement of account lockouts.

---

### 2. Missing HTTP Security Headers (Helmet)

**File:** `server/_core/index.ts` lines 36–54  
**Risk:** High — Clickjacking, MIME-sniffing, XSS escalation  
**Fix:** 2 lines

```bash
pnpm add helmet
```

```typescript
import helmet from "helmet";
app.use(helmet({ contentSecurityPolicy: false }));
```

**Why:** No CSP, X-Frame-Options, X-Content-Type-Options, or HSTS headers. Behind Cloud Run + HTTPS, the app is exposed to browser-level attacks.

---

### 3. No Rate Limiting on Public Endpoints

**File:** `server/_core/index.ts`, `server/routers/landing.ts`  
**Risk:** Critical — LLM budget exhaustion, brute-force invite enumeration  
**Fix:** 5 lines

```bash
pnpm add express-rate-limit
```

```typescript
import rateLimit from "express-rate-limit";
const globalLimiter = rateLimit({ windowMs: 60_000, max: 120 });
const chatLimiter = rateLimit({ windowMs: 60_000, max: 10 });
app.use("/api/trpc", globalLimiter);
app.use("/api/trpc/landing.chat", chatLimiter);
```

**Why:** Landing chatbot calls paid LLM on every request with no limits. Token-lookup endpoints have no transport-layer protection (invite tokens are 6-digit codes, enumerable in seconds).

---

### 4. RBAC Permissions Not Enforced Server-Side

**Files:** `server/routers/admin.ts` lines 59–64, `server/_core/trpc.ts` lines 55–70  
**Risk:** High — Privilege escalation  
**Fix:** Medium

The RBAC system is fully built (8 roles, granular permissions) but every admin procedure only checks `ctx.user.role !== "admin"`. The granular permissions table is never consulted.

**What works:** Admin Console UI correctly displays role-specific UI.  
**What's broken:** A "Content Manager" can still call `admin.deleteUser` or `admin.updateCourse` at the API level because the server doesn't validate their specific permissions.

**Fix approach:**
1. Add `checkAdminPermission(userId, resource, action)` helper in `server/db.ts`
2. Query `adminRoleAssignments` and `rolePermissions` tables
3. Apply to five critical procedures before launch:
   - `admin.deleteUser`
   - `admin.updateUserRole`
   - `admin.publishCmsContent`
   - `admin.assignRole`
   - `admin.updatePlatformSetting`
4. Full per-procedure coverage can follow in Sprint 1 post-launch

**Estimated effort:** 2–3 hours

---

### 5. Invite-Expiry & Grade-Promotion Heartbeat Crons Not Registered

**File:** Post-publish configuration  
**Risk:** High — Expired invites remain valid, grades not promoted  
**Fix:** 1 CLI command per cron

After publishing to Cloud Run, register both scheduled jobs:

```bash
manus-config schedule create \
  --name invite-expiry \
  --route /api/scheduled/invite-expiry \
  --cron "0 2 * * *" \
  --timeout 60

manus-config schedule create \
  --name grade-promotion \
  --route /api/scheduled/grade-promotion \
  --cron "0 3 * * *" \
  --timeout 60
```

**Why:** The code is written, but Cloud Run (or Vercel) doesn't automatically register scheduled endpoints. Without this, expired invites stay in the database and grade promotion logic never runs.

---

### 6. Resend Sender Domain Not Verified

**File:** Resend dashboard configuration  
**Risk:** High — Invites fail to send  
**Fix:** 2 steps

1. Go to Resend dashboard → Sender Domains
2. Add and verify `educhamp.app`
3. Set `RESEND_FROM_EMAIL=noreply@educhamp.app` in the Secrets panel

**Why:** Invites are sent from the email set in `RESEND_FROM_EMAIL`. If the domain is not verified, emails are rejected or go to spam.

---

## High Priority (P1 — Week 1)

| # | Issue | File(s) | Effort |
|---|---|---|---|
| 7 | Missing DB indexes on 10 high-traffic columns | `drizzle/schema.ts` | 1 migration |
| 8 | Raw stack traces shown to users on errors | `client/src/components/ErrorBoundary.tsx` | 10 lines |
| 9 | `listUsers` server search ignored | `server/db.ts` | Small |
| 10 | Tutor session history grows unbounded | `server/routers.ts` | Small |
| 11 | No `robots.txt` for SEO | `client/public/robots.txt` | 10 lines |
| 12 | CMS table empty, not wired to landing page | `server/db.ts`, landing | Medium |

**Impact:** Database queries will be slow (7) without indexes. Error messages leak internal details (8). CMS feature doesn't work (12).

---

## Medium Priority (P2)

- No error monitoring (Sentry integration)
- No welcome email on registration
- Admin user search is client-side only
- No dedicated 403 Access Denied page
- Body parser limit is 50 MB (DoS risk — reduce to 1 MB)
- No Content-Security-Policy header scoping

---

## Launch Checklist

**Before clicking "Publish":**
- [ ] Item 1: Suspended user auth bypass fixed
- [ ] Item 2: Helmet added
- [ ] Item 3: Rate limiting configured
- [ ] Item 4: RBAC enforcement added (critical 5 procedures minimum)
- [ ] Item 6: Resend domain verified + env var set
- [ ] Item 7: DB index migration applied
- [ ] Item 8: Error boundary sanitized

**Immediately after publish:**
- [ ] Item 5: Register both heartbeat crons via CLI
- [ ] P1 items 9–12: Address in week 1

---

## Recommended Sequence

**Day 1 — Security Hardening (4 hours)**
1. Fix suspended user auth (15 min, 3 lines)
2. Add Helmet (15 min, 2 lines)
3. Add rate limiting (30 min, 5 lines)
4. Verify Resend domain (15 min, manual)

**Day 1–2 — Server-Side RBAC (2–3 hours)**
5. Write `checkAdminPermission` helper
6. Apply to critical 5 procedures
7. Test with non-admin users

**Day 2 — Performance & Cleanup (1 hour)**
8. Generate DB index migration
9. Add `robots.txt`
10. Sanitize ErrorBoundary

**Post-Publish (same day)**
11. Register heartbeat crons

**Week 1 — P1 Follow-Up (4 hours)**
12. Remaining P1 items (search, CMS wiring, email)

---

## Notes

- The codebase is well-structured and type-safe. These are not architectural issues.
- No changes to the data model, API contract, or UI are required for launch.
- All fixes are isolated, low-risk, and can be reviewed/tested independently.
- Post-launch, prioritize error monitoring (Sentry) and CMS wiring to unblock content creation workflows.

---

_Review completed: 2026-05-29 17:30 CDT_
