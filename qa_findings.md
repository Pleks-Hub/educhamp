# QA/UAT Testing Findings - June 2, 2026

## Phase 1: Test Suite & TypeScript
- All 1,121 tests pass
- TypeScript: 0 errors
- One non-blocking Vitest warning about un-awaited assertion in admin-portal.test.ts (line 277)

## Phase 2: Server-Side Code Audit
- No TODO/FIXME/HACK comments in production code
- Stripe webhook properly handles test events
- All 6 heartbeat handlers properly registered
- SQL queries use parameterized Drizzle ORM (safe from injection)
- The single raw SQL execute uses parameterized template literals (safe)
- No critical hardcoded URLs that would break functionality
- Old devserver.log error about adminDeleteCard export was transient (function exists and exports correctly)

## Phase 3: Visual UI/UX Audit

### Pages Verified Working
- Landing page: OK
- Dashboard (Home): OK
- Curriculum: OK (loads after skeleton)
- Profile: OK (email notifications section present)
- Billing: OK
- Settings/Notifications: OK
- Referrals: OK
- Parent Dashboard: OK (data loads correctly in table)

### Critical Bugs Found

#### BUG-1: Progress Page Crashes (ErrorBoundary triggered)
- **Page:** /progress
- **Severity:** CRITICAL — page is completely unusable
- **Root Cause:** React hooks (`trpc.certificate.checkEligibility.useQuery` at line 135 and `trpc.certificate.issue.useMutation` at line 139) are called AFTER early returns (lines 78, 90, 101). This violates React's rules of hooks — hooks must be called in the same order every render. When the component renders with data loaded, it tries to call hooks that weren't called on previous renders.
- **Fix:** Move all hook calls to the top of the component, before any conditional returns. Use `enabled` flag to conditionally execute them.

### UI Issues

#### UI-1: Parent Dashboard student cards show "X/565 units"
- The sidebar student cards show "Grade 9 · 2/565 units" which appears to be showing total lessons instead of total units (12). Minor cosmetic issue.
