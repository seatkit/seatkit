# Technology Stack

**Project:** SeatKit
**Researched:** 2026-04-06
**Overall confidence:** HIGH (existing stack verified; gaps researched with current sources)

---

## Current Stack Status

The core stack is locked in and working. This document focuses on three unresolved gaps:

1. **Real-time sync** — what mechanism to use for multi-device collaboration
2. **Authentication** — what library to implement staff login and RBAC
3. **Deployment** — how self-hosting works in practice

---

## Recommended Stack

### Core Framework (LOCKED IN)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TypeScript | 5.6.3 | Language (strict mode) | Locked in — the right call |
| Node.js | 22.x | Runtime | Locked in — LTS, required for monorepo |
| pnpm | 9.12.3 | Package manager | Locked in — workspace support, fast |
| Turborepo | 2.2.3 | Monorepo orchestration | Locked in — works well, caching |
| Fastify | 5.1.0 | REST API server | Locked in — fast, type-safe with Zod |
| Next.js | 15.0.3 | Web frontend | Locked in — App Router, SSR capable |
| React | 19.0.0 | UI framework | Locked in — pairs with Next.js 15 |

### Database (LOCKED IN)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Drizzle ORM | 0.36.4 (upgrade to 0.45.x) | Type-safe ORM | Locked in — migration control, Postgres-native |
| Supabase PostgreSQL | 16 | Managed database | Locked in — Session Pooler, production-ready |
| postgres (driver) | 3.4.5 | Node.js PG driver | Locked in — used by Drizzle |

**Note on Drizzle version:** Current version is 0.36.4. Latest stable is 0.45.x (April 2026). Drizzle v1.0.0-beta.2 released February 2025 — do not upgrade to v1 beta until stable. Stay on 0.45.x for now. Confidence: HIGH (verified via npm).

### Validation & Schema (LOCKED IN)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zod | 3.23.8 | Runtime validation | Locked in — single source of truth for types |
| fastify-type-provider-zod | 4.0.2 (upgrade to 6.x) | Fastify/Zod integration | NEEDS UPGRADE — see below |

**Critical:** fastify-type-provider-zod 4.0.2 is outdated. Latest is **6.1.0** (October 2025), which requires `fastify ^5.5.0` and `zod >=4.1.5`. However: upgrading to Zod 4 is a significant migration. Recommended path: upgrade fastify-type-provider-zod to 6.x and Zod to 4.x together as a dedicated task. Until then, pin 4.0.2. Confidence: HIGH (verified via npm and GitHub releases).

### State Management (LOCKED IN)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TanStack Query | 5.62.3 | Server state (fetch, cache, sync) | Locked in — right choice over RTK Query |
| Zustand | 5.0.2 | UI/local state | Locked in — minimal, no boilerplate |

### Testing (LOCKED IN)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | 4.0.3 (root) | Unit/integration tests | Locked in — v4 is current stable (Oct 2025) |
| Playwright | 1.49.0 | E2E tests | Locked in — multi-browser, mobile |

---

## Gap 1: Real-Time Sync

**Decision: WebSockets via @fastify/websocket with PostgreSQL LISTEN/NOTIFY as the change source.**

### Recommendation

Use `@fastify/websocket` (already installed at 11.0.1, latest is 11.2.0) for the WebSocket transport. Use `pg-listen` to subscribe to PostgreSQL `NOTIFY` events triggered by database writes, then broadcast those events to connected WebSocket clients.

This pattern means: when any staff member saves a reservation, the database trigger fires `NOTIFY`, the server receives it via pg-listen, and broadcasts a lightweight change event to all connected WebSocket clients, which then invalidate their TanStack Query cache and refetch.

### Why WebSockets over SSE

- **Bidirectional needed:** Staff clients send presence updates ("user X is editing reservation Y"). SSE is server-to-client only.
- **Simpler broadcast pattern:** A single WebSocket endpoint can handle both sending updates and receiving presence signals.
- **Already installed:** `@fastify/websocket` 11.0.1 is in the codebase as a placeholder.
- **SSE trade-off:** SSE works through HTTP/1.1 proxies without configuration changes, but for this use case (collaborative editing with presence), WebSockets are more appropriate.

Confidence: HIGH (verified via official Fastify docs, npm, and multiple 2025 guides).

### Why PostgreSQL NOTIFY over application-level fan-out

- **Works across multiple API instances:** If you ever run two API pods, application-level Maps don't share state. NOTIFY/LISTEN uses the database as the coordination layer, which both instances already connect to.
- **Atomic with writes:** NOTIFY fires on commit only — no phantom updates from rolled-back writes.
- **No extra infrastructure:** No Redis, no message broker required for the v1 scale (15 staff, 1 restaurant).

### Limitations to know

- NOTIFY payload is limited to 8,000 bytes — send only `{ entity: 'reservation', id: '...', action: 'updated' }`, never full records.
- If the pg-listen connection drops, messages during the gap are lost. For a restaurant reservation system (not financial), this is acceptable — the client re-fetches on reconnect.
- pg-listen handles reconnection automatically. Confidence: MEDIUM (pg-listen repo verified, behavior documented in README).

### Libraries to add

| Library | Version | Purpose |
|---------|---------|---------|
| pg-listen | ^1.7.0 | PostgreSQL LISTEN/NOTIFY with auto-reconnect |

**Do NOT add:** Redis, socket.io, MQTT, or any external message broker. pg-listen + @fastify/websocket covers v1 requirements without new infrastructure.

### Client-side pattern

TanStack Query does not have native SSE/WebSocket support. The established pattern (verified via 2025 community examples):

1. Connect a `useEffect` WebSocket hook in the root layout.
2. On receiving a `{ entity: 'reservation', action: 'updated' }` event, call `queryClient.invalidateQueries({ queryKey: reservationKeys.all })`.
3. TanStack Query refetches automatically. No manual state splicing.

This keeps real-time logic out of individual query hooks and in a single global handler.

---

## Gap 2: Authentication

**Decision: Better Auth 1.x with email/password, role-based access (staff/manager/owner), and session tokens stored in the database.**

### Why Better Auth

- **Auth.js (NextAuth) team merged into Better Auth in September 2025.** Auth.js now only receives security patches; Better Auth is the recommended path for new projects. Confidence: HIGH (multiple sources confirm the merger).
- **Lucia Auth deprecated March 2025.** Do not use. Confidence: HIGH.
- **Supabase Auth** is excellent if you're all-in on Supabase's infrastructure, but SeatKit is self-hosted and Supabase Auth ties you to Supabase's platform. Better Auth is database-agnostic and works with any PostgreSQL instance.
- **Fastify integration exists:** `fastify-better-auth` plugin (GitHub: `flaviodelgrosso/fastify-better-auth`) registers auth routes under `/api/auth/*` automatically and provides session decoration on Fastify request objects.
- **RBAC built in:** Better Auth includes role/permission management. For SeatKit: `staff` (read, create reservations), `manager` (all + sales data + config), `owner` (all + multi-restaurant admin).
- **Self-hostable:** No third-party cloud dependency. Sessions stored in PostgreSQL (same database).

### Libraries to add

| Library | Version | Purpose |
|---------|---------|---------|
| better-auth | ^1.5.6 | Core auth framework (email/password, sessions, RBAC) |
| fastify-better-auth | ^0.x (latest) | Fastify plugin for route registration and request decoration |

**Do NOT use:**
- `@supabase/supabase-js` for auth — it's already an unused dependency; remove it after Better Auth is implemented.
- Lucia Auth — deprecated.
- Auth.js (NextAuth) — maintenance-only mode.
- Passport.js — too low-level for this stack, requires manual session management.
- `@fastify/jwt` alone — valid but you'd rebuild what Better Auth provides (password hashing, session management, refresh tokens, RBAC).

### Implementation notes

- Better Auth stores sessions in PostgreSQL — add the Better Auth schema via Drizzle migration, not Better Auth's own migration tool, to keep migrations in one place.
- Extract `userId` from the session in Fastify route hooks; never trust `createdBy` from request body (current security gap noted in CONCERNS.md).
- iOS app authenticates via the same `/api/auth/*` endpoints using email/password, receives a session token, and sends it as `Authorization: Bearer <token>` on subsequent requests.

Confidence: HIGH for library choice (verified Better Auth v1.5.6 current, Fastify integration documented). MEDIUM for Drizzle migration integration (pattern works, requires care to align schemas).

---

## Gap 3: Deployment (Self-Hosting)

**Decision: Docker Compose with three services (api, web, nginx) + Supabase managed PostgreSQL (external). No bundled PostgreSQL container in production.**

### Why this configuration

- **Supabase handles the database.** It's already the production database. Running a containerized PostgreSQL alongside it would be a second database for no reason.
- **Docker Compose is the right complexity level.** Kubernetes is overkill for a single-restaurant deployment (15 concurrent users). Docker Compose gives environment parity, restart policies, and health checks with minimal ops burden.
- **nginx as reverse proxy handles:** SSL termination, HTTP→HTTPS redirect, WebSocket upgrade headers, streaming response buffering disabled (critical for Next.js App Router streaming), and static asset caching.

### Service layout

```
docker-compose.yml
  ├── nginx     (port 80/443 → api:3001, web:3000)
  ├── api       (Fastify, port 3001, internal only)
  └── web       (Next.js standalone, port 3000, internal only)
```

PostgreSQL is NOT a Docker Compose service — it's Supabase (external). The `DATABASE_URL` is injected as an environment variable.

### Next.js standalone output

Next.js must be built with `output: 'standalone'` in `next.config.js`. This produces a minimal Docker image without the full `node_modules`. The image copies `.next/standalone`, `.next/static`, and `public`. Confidence: HIGH (Next.js docs, multiple 2025 guides verified).

### nginx requirements for this stack

Two non-obvious requirements:

1. **Disable response buffering for Next.js streaming:**
   ```
   proxy_buffering off;
   proxy_cache off;
   proxy_set_header X-Accel-Buffering no;
   ```
   Without this, React Suspense streaming (used in Next.js 15 App Router) causes blank pages or delayed renders.

2. **WebSocket upgrade headers for the API:**
   ```
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

### Environment variable strategy for self-hosters

Self-hosters need a simple env-based configuration story. Current GCP Secret Manager dependency must be optional:

- In production on GCP: secrets from Secret Manager (current behavior).
- In self-hosted mode: `DATABASE_URL` and other secrets from a `.env` file or environment variables directly.

The current code's fallback to `.env` is actually correct behavior for self-hosters — but the CONCERNS.md flags it as a risk (it should not silently fall back in GCP production). Solution: check `NODE_ENV` or a `DEPLOYMENT_MODE=gcp|selfhosted` variable to determine secret loading strategy. This should be designed in the deployment phase.

### Tools NOT to add

- **Kubernetes / Helm:** Overkill for v1. Revisit at 10+ restaurants or horizontal scaling needs.
- **Redis:** Not needed for v1. pg-listen + WebSockets handle real-time. Session storage is in PostgreSQL via Better Auth.
- **PM2:** Superseded by Docker's restart policies. Use `restart: unless-stopped` in Docker Compose.
- **Vercel:** Vendor lock-in contradicts self-hosted ethos. Next.js standalone mode plus a $10 VPS is simpler.

Confidence: HIGH for Docker Compose approach (verified multiple 2025 self-hosting guides and Next.js official docs). MEDIUM for nginx config specifics (streaming buffer requirement verified, exact config needs testing).

---

## Existing Dependencies to Clean Up

These are in the current codebase but should be removed or resolved:

| Dependency | Action | Reason |
|------------|--------|--------|
| `@supabase/supabase-js` | Remove after Better Auth implemented | Loaded but never used; adds bundle weight |
| `fastify-type-provider-zod` 4.0.2 | Upgrade to 6.x (with Zod 4 migration) | Major version behind; Zod 4 compatibility required |
| `drizzle-orm` 0.36.4 | Upgrade to 0.45.x | 9 minor versions behind; no breaking changes expected |
| `liquid-glass-react` | Evaluate or replace with CSS | React 19 type compatibility issue (CONCERNS.md) |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Real-time transport | @fastify/websocket + pg-listen | socket.io | socket.io adds 30KB+ and its own protocol; ws is sufficient |
| Real-time transport | @fastify/websocket + pg-listen | Supabase Realtime | Vendor lock-in; adds cloud dependency for self-hosted |
| Real-time transport | @fastify/websocket + pg-listen | SSE only | No bidirectional channel; can't send presence from client |
| Auth | Better Auth | Supabase Auth | Supabase Auth ties to Supabase cloud; Better Auth is DB-agnostic |
| Auth | Better Auth | Auth.js (NextAuth) | Now maintenance-only; team migrated to Better Auth |
| Auth | Better Auth | Lucia Auth | Deprecated March 2025 |
| Auth | Better Auth | Custom JWT (@fastify/jwt) | Too much to rebuild (password hashing, refresh tokens, RBAC) |
| Message broker | pg-listen (NOTIFY/LISTEN) | Redis pub/sub | Redis is extra infrastructure; pg covers v1 scale |
| Deployment | Docker Compose + nginx | Kubernetes | Overkill for <50 concurrent users; too complex for open source contributors |
| Deployment | Docker Compose + nginx | Vercel + Railway | Vendor lock-in; contradicts self-hosted goal |
| Deployment | Docker Compose + nginx | PM2 | Docker restart policies replace PM2; one fewer tool |

---

## Installation

### Real-time (add to @seatkit/api)

```bash
pnpm --filter @seatkit/api add pg-listen
```

### Authentication (add to @seatkit/api)

```bash
pnpm --filter @seatkit/api add better-auth
pnpm --filter @seatkit/api add fastify-better-auth
```

### Dependency upgrades (careful — breaking changes possible)

```bash
# Drizzle ORM (minor versions, low risk)
pnpm --filter @seatkit/api add drizzle-orm@^0.45.0

# fastify-type-provider-zod + Zod 4 (major — plan as dedicated task)
# Research migration guide before running:
# https://zod.dev/v4
# pnpm --filter @seatkit/api add fastify-type-provider-zod@^6.0.0 zod@^4.0.0
```

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Core stack (locked) | HIGH | All verified in codebase; running in CI |
| Drizzle version | HIGH | npm verified: 0.45.x current, v1 beta not production-ready |
| fastify-type-provider-zod | HIGH | npm verified: 6.1.0 current, Zod 4 required |
| WebSocket approach | HIGH | @fastify/websocket official, pg-listen well-documented |
| pg-listen behavior | MEDIUM | README reviewed; reconnect handling described, production reliability unverified by this team |
| Better Auth Fastify integration | HIGH | Official docs exist, v1.5.6 current as of April 2026 |
| Better Auth RBAC model | MEDIUM | Features documented; Drizzle schema integration pattern requires implementation-time validation |
| Docker Compose deployment | HIGH | Next.js official self-hosting docs + multiple 2025 production guides |
| nginx streaming config | MEDIUM | Requirement documented, exact config needs testing in environment |

---

## Sources

- Drizzle ORM npm: https://www.npmjs.com/package/drizzle-orm
- Drizzle ORM v1 roadmap: https://orm.drizzle.team/roadmap
- fastify-type-provider-zod npm: https://www.npmjs.com/package/fastify-type-provider-zod
- fastify-type-provider-zod releases: https://github.com/turkerdev/fastify-type-provider-zod/releases
- @fastify/websocket npm: https://www.npmjs.com/package/@fastify/websocket
- Better Auth npm: https://www.npmjs.com/package/better-auth
- Better Auth Fastify integration: https://better-auth.com/docs/integrations/fastify
- fastify-better-auth plugin: https://github.com/flaviodelgrosso/fastify-better-auth
- Better Auth 1.4 blog: https://better-auth.com/blog/1-4
- Auth.js → Better Auth migration: https://better-auth.com/docs/guides/supabase-migration-guide
- pg-listen: https://github.com/andywer/pg-listen
- PostgreSQL LISTEN/NOTIFY guide: https://oneuptime.com/blog/post/2026-01-25-use-listen-notify-real-time-postgresql/view
- Drizzle pg-notify example: https://github.com/grmkris/drizzle-pg-notify-audit-table
- Next.js self-hosting: https://nextjs.org/docs/app/guides/self-hosting
- Next.js Docker guide 2025: https://jb.desishub.com/blog/self-host-nextjs-and-postgres-with-docker
- leerob next-self-host reference: https://github.com/leerob/next-self-host
- TanStack Query SSE pattern: https://fragmentedthought.com/blog/2025/react-query-caching-with-server-side-events
- Vitest 4.0 release: https://vitest.dev/blog/vitest-4
