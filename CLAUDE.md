# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

EduChamp is a K–12 adaptive learning platform: standards-aligned courses, diagnostics, mastery tracking, an AI tutor, gamification, parent dashboards, billing, and an admin console. It is a single Node.js process (Express) that serves the tRPC API, an SSE tutor stream, OAuth/Stripe/Resend webhooks, scheduled-job endpoints, and the Vite-built React SPA.

**Stack:** React 19 + Wouter + TanStack Query + Tailwind 4 + shadcn/ui (frontend) · Express 4 + tRPC 11 + superjson (backend) · Drizzle ORM on MySQL/TiDB (data) · pnpm (package manager).

## Commands

```bash
pnpm dev                      # Dev server (tsx watch, NODE_ENV=development, Vite middleware)
pnpm build                    # vite build + esbuild bundle server → dist/
pnpm start                    # Production (serves dist/, NODE_ENV=production)
pnpm check                    # Type-check only (tsc --noEmit) — there is no ESLint; this is the lint gate
pnpm format                   # Prettier write across repo
pnpm test                     # Vitest run (all server/*.test.ts)
pnpm db:push                  # drizzle-kit generate + migrate (requires DATABASE_URL)
```

Run a single test file or test:

```bash
pnpm vitest run server/sprint64.test.ts          # one file
pnpm vitest run server/sprint64.test.ts -t "name" # one test by name
pnpm vitest watch server/sprint64.test.ts         # watch mode
```

Tests run in the `node` environment (see `vitest.config.ts`) and only match `server/**/*.test.ts`. Most tests hit a real database and need `DATABASE_URL` set; without it many will skip or fail at the `getDb()` call.

## The build loop (where features live)

A feature change almost always touches this chain — work it in order:

1. **`drizzle/schema.ts`** — add/modify tables (104 tables, all `mysqlTable`). Then `pnpm db:push` to generate a numbered migration into `drizzle/` and apply it.
2. **`server/db.ts`** — add query helpers here. This is a ~177KB monolith holding ~237 exported helpers that return raw Drizzle rows. **All database access goes through `server/db.ts`** — do not scatter Drizzle queries across routers.
3. **`server/routers.ts`** (or a modular router under `server/routers/`) — expose a tRPC procedure. Pick the right procedure type (see below).
4. **`client/src/pages/*` / `client/src/components/*`** — consume with `trpc.*.useQuery/useMutation`. Register routes in `client/src/App.tsx`.
5. **`server/*.test.ts`** — add a Vitest spec; run `pnpm test`.

## Backend architecture

### tRPC procedure types (`server/_core/trpc.ts`)

Choose deliberately — the middleware enforces real policy:

- `publicProcedure` — no auth.
- `protectedProcedure` — requires `ctx.user`.
- `studentProcedure` — requires a user, **rejects `accountType === "parent"`**, and enforces the **COPPA gate** (students under 14 with pending/denied/expired parental consent are blocked with `COPPA_CONSENT_*` error messages). Use for anything that takes quizzes/diagnostics or accumulates mastery.
- `adminProcedure` — requires `ctx.user.role === 'admin'`.

`ctx.user` is built in `server/_core/context.ts` from the session cookie; admin-revoked sessions are forced to unauthenticated even with a valid JWT.

### Router layout

- `server/routers.ts` — the large root router: curriculum, quizzes, diagnostics, tutor sessions, auth (`auth.me`, `auth.logout`). Mounts all sub-routers.
- `server/routers/*.ts` — domain routers (`admin`, `parent`, `coParent`, `payment`, `gamification`, `studentAuth`, `coppa`, `certificate`, `focusMode`, `weeklyChallenges`, etc.). Add new feature areas here as their own router rather than growing `routers.ts`.

### Dual authentication

There are two auth paths that both resolve to the same `users` table and session cookie (`COOKIE_NAME`):

- **Manus OAuth** (parents/admins) — `/api/oauth/callback` in `server/_core/oauth.ts`, validated via `sdk.authenticateRequest`.
- **Local student auth** (`server/routers/studentAuth.ts`) — parent-enrolled students get bcrypt email+password login and email setup tokens (reuses the `passwordResetTokens` table). 2FA is TOTP via `speakeasy`.

### Other backend subsystems

- **AI tutor** — streamed over SSE at `/api/tutor/stream` (`server/tutorStream.ts`), not tRPC. LLM calls go through `invokeLLM()` in `server/_core/llm.ts`; the tutor system prompt is built in `server/educhamp-helpers.ts`.
- **Gamification** (`server/gamification/`) — `xp`, `levels`, `badges`, `quests`, `streaks`, `houses`. Defaults (badges/quests/houses) and RBAC roles are **auto-seeded idempotently on every server start** in `server/_core/index.ts`.
- **Email** (`server/services/email/`) — multi-provider abstraction (Resend default, plus SendGrid/SMTP) bootstrapped on startup; `server/emailService.ts` is the send entry point; HTML templates live in `server/emailTemplates/`. Bounce/complaint webhooks land at `/api/email/webhook` and `/api/resend/webhook`.
- **Payments** — Stripe. `registerStripeWebhook` is mounted **before `express.json`** in `index.ts` (it needs the raw body); same for the email webhooks. Don't reorder these.
- **Scheduled jobs** (`server/scheduled/` + `server/scheduledHandlers.ts`) — each is a POST endpoint under `/api/scheduled/*` triggered by platform heartbeat crons. They authenticate via `sdk.authenticateRequest` and only accept `isCron` requests.
- **Rate limiting & security** — `helmet` (CSP disabled — the Manus platform injects inline scripts and handles edge security), plus `express-rate-limit` tiers in `index.ts` (general API 300/min, chatbot 20/5min, 2FA 10/15min).

## Frontend architecture

- **Routing** is Wouter in `client/src/App.tsx`. Public/auth routes (landing, sign-in, consent, certificate, admin console) render standalone; app routes are wrapped in `DashboardLayout`. Nearly every page is `lazy()`-loaded for code-splitting.
- **Data** — only `trpc.*.useQuery/useMutation`; never add Axios/fetch wrappers. Auth state via `useAuth()` (`client/src/_core/hooks/useAuth.ts`); never touch cookies manually.
- **UI** — shadcn/ui in `client/src/components/ui/*`; feature components in `client/src/components/` (incl. `admin/`, `parent/`, `billing/` subfolders). Global theme tokens + customized Tailwind base in `client/src/index.css`.

## Path aliases

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*` (shared constants/types/validation used by both client and server, e.g. `COOKIE_NAME`, age/COPPA validation)

These are defined in `tsconfig.json` and mirrored in both `vite.config.ts` and `vitest.config.ts` — keep all three in sync if you add one.

## Conventions & boundaries

- **`server/_core/` is framework plumbing** (OAuth, tRPC init, context, Vite bridge, SDK, LLM, env). Avoid editing unless intentionally extending infrastructure.
- **Env vars** are read only through `server/_core/env.ts` (the `ENV` object). System envs (`DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `STRIPE_*`, `RESEND_*`, `BUILT_IN_FORGE_API_*`) are platform-injected — never commit `.env` files or hardcode them.
- **Prettier** config: double quotes, semicolons, 80-col, 2-space, `arrowParens: avoid`, `trailingComma: es5`. Run `pnpm format` before committing.
- **No media in `client/public/` or `client/src/assets/`** — large local assets break deployment. Only small config files (favicon, robots.txt, manifest). Upload media to storage and reference the returned path.
- A patched dependency (`wouter`) is pinned in `package.json` → `pnpm.patchedDependencies`; use `pnpm` so patches apply.

## Content seeding

Curriculum/question content is loaded via standalone Node scripts, **not** migrations:

- `server/seed-*.mjs` — large course/diagnostic/quiz seed banks.
- `scripts/*.mjs` — content generation, audits, crosswalk/standards tooling, Stripe product setup.

Run with `node server/seed-courses.mjs` (needs `DATABASE_URL`). These are large generated files — read before re-running, and prefer the existing audit scripts (`scripts/audit-*.mjs`, `scripts/quick-audit.mjs`) to inspect content state.

## Key references for deeper context

- `README.md` — the underlying template's full frontend/animation/LLM guidelines.
- `docs/CURRENT_STATE.md` — architecture and data-model audit (domain-by-domain table reference).
- `docs/` also holds standards-crosswalk reports, question-bank health, and migration plans.
