---
plan: 02-05
phase: 02-authentication-and-configuration
status: complete
completed_at: 2026-04-07
wave: 3
self_check: PASSED
subsystem: web
tags: [auth, better-auth, nextjs, middleware, login, react]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [AUTH-01, AUTH-02, AUTH-03, AUTH-05]
  affects: [packages/web]
tech_stack:
  added:
    - better-auth@1.6.0 (packages/web — React client)
    - better-auth-invite-plugin@0.4.1 (packages/web — invite client plugin)
  patterns:
    - Better Auth React client with adminClient + inviteClient plugins
    - Next.js Edge middleware using getSessionCookie() (Edge-safe cookie check)
    - Login page as Client Component with full interaction contract per UI-SPEC
    - shadcn CSS variable token system wired into tailwind.config.ts + globals.css
key_files:
  created:
    - packages/web/src/lib/auth-client.ts
    - packages/web/src/middleware.ts
    - packages/web/src/app/login/page.tsx
  modified:
    - packages/web/package.json
    - packages/web/tailwind.config.ts
    - packages/web/src/app/globals.css
    - pnpm-lock.yaml
decisions:
  - "Cast inviteClient() to BetterAuthClientPlugin on the web side — same $ERROR_CODES type incompatibility as server side (02-02 deviation #2); better-auth-invite-plugin@0.4.1 was built against better-auth ^1.4.13"
  - "Added shadcn CSS variable definitions to globals.css and tailwind.config.ts in packages/web — @seatkit/ui is not a dependency of packages/web so its styles cannot be imported; tokens must be defined locally"
metrics:
  duration_minutes: 25
  completed_date: 2026-04-07
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 4
---

# Phase 02 Plan 05: Better Auth Web Client, Middleware, and Login Page Summary

## What Was Built

Better Auth React client installed in `packages/web` with adminClient + inviteClient plugins. Next.js Edge middleware created using `getSessionCookie()` for route protection (redirects unauthenticated users to `/login`, redirects authenticated users away from `/login`). Login page built per UI-SPEC with the full interaction contract: loading state, credential error, network error, client-side email validation on blur, accessible labels with `aria-describedby`, `min-h-[44px]` touch target, exact copywriting. shadcn CSS variable token system wired into the web package's Tailwind config and globals.css.

## Commits

- `5cb1572` — feat(02-05): install better-auth in web, create auth-client.ts and middleware.ts
- `98ec228` — feat(02-05): build login page per UI-SPEC with full interaction contract

## Key Files Created/Modified

- `packages/web/src/lib/auth-client.ts` — Better Auth React client exporting `authClient`, `useSession`, `signIn`, `signOut`; adminClient + inviteClient plugins registered
- `packages/web/src/middleware.ts` — Next.js Edge middleware using `getSessionCookie()` (Edge-safe); matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `api/`
- `packages/web/src/app/login/page.tsx` — Client Component login page: `SeatKit` heading, `Sign in to continue` subheading, email + password fields with validation, loading spinner, credential error (`Incorrect email or password. Please try again.`), network error (`Unable to connect. Check your connection and try again.`), no forgot-password or register links
- `packages/web/tailwind.config.ts` — Extended with shadcn CSS variable color tokens (background, foreground, primary, destructive, ring, input, muted, etc.) and borderRadius tokens
- `packages/web/src/app/globals.css` — Added `@layer base` with `:root` and `.dark` CSS variable definitions (sourced from `@seatkit/ui/src/styles.css` theme)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] inviteClient() type incompatibility in packages/web**
- **Found during:** Task 1 typecheck
- **Issue:** `inviteClient()` from `better-auth-invite-plugin@0.4.1` has `$ERROR_CODES` typed as `Record<string, string>` but better-auth 1.6.0 expects `Record<string, RawError>` on the client-side `BetterAuthClientPlugin` interface. Same root cause as server-side deviation #2 in 02-02.
- **Fix:** Cast `inviteClient()` to `BetterAuthClientPlugin` via `as unknown as BetterAuthClientPlugin` with explanatory comment.
- **Files modified:** `packages/web/src/lib/auth-client.ts`
- **Commit:** `5cb1572`

**2. [Rule 2 - Missing functionality] shadcn CSS variable tokens missing from packages/web**
- **Found during:** Task 2 (creating login page)
- **Issue:** Login page uses Tailwind classes like `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-destructive`, `ring-ring`, `border-input` — all rely on shadcn CSS variables. The web package's `tailwind.config.ts` had no color token mappings and `globals.css` had no `:root` CSS variable definitions. Without these, the Tailwind classes would silently produce no styling.
- **Fix:** Extended `tailwind.config.ts` with the full shadcn color token map (`hsl(var(--*))` references) and added `@layer base` CSS variable definitions to `globals.css`, sourced from `packages/ui/src/styles.css` (the canonical theme source). `@seatkit/ui` is not a dependency of `packages/web` so cannot be imported — tokens must be defined in the web package itself.
- **Files modified:** `packages/web/tailwind.config.ts`, `packages/web/src/app/globals.css`
- **Commit:** `98ec228`

### Pre-existing Issues (Out of Scope)

- `packages/web/src/lib/api-client.ts` — Two TypeScript errors (`Property 'errors' does not exist on type 'ZodError<T>'`, parameter implicitly `any`) caused by Zod v3→v4 rename of `.errors` to `.issues`. Present in base commit `c3d11d2` before this plan. Logged to deferred-items.

## Known Stubs

None. All files are fully wired. The login page calls `signIn.email()` from the real auth client, which connects to the Fastify API's `/api/auth/sign-in/email` endpoint installed in plan 02-02.

## Threat Flags

None. The threat model in the plan covers all security-relevant surface introduced:
- T-02-05-01: Middleware cookie check is a UX redirect only (security validation at API layer) — accepted
- T-02-05-02: Single error message prevents username enumeration — mitigated (implemented)
- T-02-05-03: sameSite=lax + CORS protect against CSRF — mitigated (Better Auth handles)
- T-02-05-04: Rate limiting at API layer — mitigated (plan 04)
- T-02-05-05: httpOnly cookie prevents XSS session theft — mitigated (Better Auth sets httpOnly)

## Self-Check

- `packages/web/src/lib/auth-client.ts` — FOUND
- `packages/web/src/middleware.ts` — FOUND
- `packages/web/src/app/login/page.tsx` — FOUND
- commit `5cb1572` — FOUND
- commit `98ec228` — FOUND

## Self-Check: PASSED
