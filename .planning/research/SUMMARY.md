# Research Summary

**Project:** SeatKit
**Synthesized:** 2026-04-06
**Research files:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Overall confidence:** HIGH

---

## Executive Summary

SeatKit is a brownfield TypeScript rewrite of a production-proven iOS reservation system (KoenjiApp), targeting small high-turnover restaurants that need real-time collaborative table management. The domain model is battle-tested after 9+ months of daily production use at Koenji restaurant, which means the feature set is not speculative — it is a known, validated body of work that must be faithfully ported to the web before any generalization occurs. The core stack is locked in and functioning (Fastify, Next.js 15, Drizzle ORM, Supabase PostgreSQL, TanStack Query, Zustand) with a working CI pipeline. What remains is implementing the three critical gaps: business logic engine, authentication, and real-time collaboration — plus the Firestore-to-PostgreSQL data migration.

The recommended architecture separates business logic into a pure `@seatkit/engine` package (no I/O, fully unit-testable), keeps Fastify routes thin, and uses PostgreSQL LISTEN/NOTIFY via `pg-listen` for real-time event sourcing with `@fastify/websocket` as the WebSocket transport. Authentication should be implemented with Better Auth 1.x — the current community consensus choice after Auth.js merged into it and Lucia was deprecated. Deployment uses Docker Compose with nginx as a reverse proxy. This configuration avoids vendor lock-in, preserves self-hosting as a first-class requirement, and introduces no infrastructure beyond what already exists.

The biggest risk is not technical — it is sequencing. Real-time collaboration must not be shipped without optimistic locking (version columns). The data migration must be idempotent and rehearsed weekly against live Firestore exports before cutover. Koenji restaurant must be able to use the system end-to-end before multi-restaurant generalization begins. These three constraints, if respected, prevent the rewrites and data loss scenarios that plague brownfield projects of this type.

---

## Key Findings

### From STACK.md

**Core stack is stable — three gaps to close:**

| Technology | Role | Status |
|------------|------|--------|
| TypeScript 5.6.3 + Node.js 22 | Language + runtime | Locked in |
| Fastify 5.1.0 + Zod 3.x | REST API + validation | Locked in |
| Next.js 15 + React 19 | Web frontend | Locked in |
| Drizzle ORM (upgrade to 0.45.x) | ORM + migrations | Locked in, minor upgrade needed |
| TanStack Query 5 + Zustand 5 | State management | Locked in |
| Vitest 4 + Playwright 1.49 | Testing | Locked in |

**Gap resolutions:**

- **Real-time:** `@fastify/websocket` + `pg-listen` (PostgreSQL LISTEN/NOTIFY). No custom protocol, no extra infrastructure. Clients subscribe via WebSocket; `pg-listen` broadcasts database change events to all connected clients, which then invalidate TanStack Query caches.
- **Authentication:** Better Auth 1.x with `fastify-better-auth` plugin. Auth.js merged into Better Auth (September 2025). Lucia deprecated (March 2025). Supabase Auth rejected (cloud dependency violates self-hosting). RBAC via Better Auth's built-in role/permission system (staff / manager / owner).
- **Deployment:** Docker Compose with three services (nginx, api, web). Next.js standalone output mode. Supabase PostgreSQL is external — not a Docker Compose service. GCP Secret Manager must become optional; `DEPLOYMENT_MODE` flag determines secret loading strategy.

**Critical version issues:**
- `fastify-type-provider-zod` 4.0.2 is far behind (current: 6.1.0). Upgrade requires Zod 4 migration — plan as a dedicated task.
- `@supabase/supabase-js` is loaded but unused — remove after Better Auth is in place.

### From FEATURES.md

**Non-negotiable table stakes (must work before launch):**

- Reservation CRUD with full status lifecycle (pending / showedUp / canceled / noShow / late / toHandle)
- Reservation types: inAdvance, walkIn (auto-detected), waitingList
- Acceptance flag: confirmed / toConfirm
- Availability checking with no-overlap enforcement
- Automatic table assignment preferring contiguous blocks (configurable priority order)
- Timeline / Gantt view — the primary ops interface
- List view with search, filtering, sorting, and grouping
- Soft-delete with recovery (audit trail preserved)
- Sales data entry (daily, per service period) with manager-gated totals
- Restaurant configuration (tables, capacity, service hours)
- Authentication with session isolation

**KoenjiApp behaviors that must be preserved exactly:**

- Walk-in auto-classification (zero friction, no manual type selection)
- Per-date, per-category layout snapshots that copy forward without overwriting future defaults
- Waiting list → confirmed flow that re-runs table assignment in one action
- Sales breakdown with restaurant-specific categories (yami, yamiPulito, bento, cocai)
- Reservation color derived from UUID (stable across devices, no assignment needed)
- Manager-gated sales totals

**Defer to post-MVP:**
- Visual table layout drag-to-move (high complexity; timeline + list cover daily ops)
- Cluster visualization (depends on layout view)
- Image attachment per reservation
- ±7-day preload cache optimization
- Advanced sales breakdown (bento, cocai, yamiPulito) — ship basic fields first

**Anti-features (explicitly out of scope):**
- Customer-facing booking portal
- SMS / email confirmation automation
- POS integration or online payment
- Multi-tenancy SaaS model
- React Native mobile app
- Complex RBAC beyond staff / manager

### From ARCHITECTURE.md

**Major components and responsibilities:**

| Package | Responsibility | Key constraint |
|---------|---------------|----------------|
| `@seatkit/types` | Zod schemas + TS types, single source of truth | No upstream dependencies |
| `@seatkit/utils` | Date/UTC ops, money, DB pooling, test helpers | No business logic |
| `@seatkit/engine` | Pure business rules: availability, clustering, conflicts, sales | No I/O — testable without database |
| `@seatkit/api` | Fastify routes, auth middleware, Drizzle persistence | Thin orchestrator — delegates to engine |
| `@seatkit/ui` | shadcn/ui design system, React components | No API calls |
| `@seatkit/web` | Next.js frontend, TanStack Query, Zustand, WebSocket client | Browser-only |

**Key patterns:**
- Engine-first: routes call engine functions, then persist. Never the reverse.
- Restaurant-scoped everything: `restaurant_id` on every table, extracted from JWT, enforced via PostgreSQL RLS.
- Shared types as contract: Drizzle schema, Fastify validation, and OpenAPI spec derived from the same Zod schemas in `@seatkit/types`.
- Optimistic updates with version rollback: `version` integer on every mutable entity; `409 Conflict` on mismatch; client rolls back and shows server state.
- OpenAPI 3.1 as iOS contract: `@fastify/swagger` generates spec from Fastify routes; `swift-openapi-generator` generates Swift client code from spec.

**Firestore migration architecture:**
- Idempotent script in `packages/api/src/scripts/import-koenji.ts`
- Firebase Admin SDK extracts Firestore data → Zod validation pass → Drizzle INSERT with `ON CONFLICT DO NOTHING`
- SQLite used as cross-reference for verification
- Must run weekly against fresh Firestore exports throughout development

### From PITFALLS.md

**Top 5 pitfalls with prevention:**

| # | Pitfall | Prevention | Blocks |
|---|---------|------------|--------|
| 1 | Silent lost updates in real-time collaboration | Add `version` integer column; PUT rejects stale version with 409 | Real-time UI milestone |
| 2 | Timestamp corruption in migration | Use `TIMESTAMPTZ`; emit explicit UTC ISO-8601 in migration script; test with `TZ=Asia/Tokyo` | Migration cutover |
| 3 | JSONB embedded arrays become orphan data | Schema audit pass before any INSERT; GIN index on customer JSONB; Zod validation on read path | Migration design |
| 4 | Generalization trap | Koenji works end-to-end before any multi-restaurant feature is added | Every phase |
| 5 | Ghost sessions stale after tab close | Session `lastSeen` heartbeat every 30s; server expiry TTL at 90s; `navigator.sendBeacon` on unload | Session management phase |

**Additional pitfalls to schedule:**
- API contract drift between web and iOS — OpenAPI spec must be generated from routes before iOS integration starts
- Drizzle migration accidents — every generated SQL file is mandatory code review; additive-only pattern for renames
- Big-bang cutover risk — weekly migration rehearsals against fresh Firestore export
- Gantt/timeline performance — virtualized rendering strategy decided at design time, not after implementation
- TanStack Query stale time — set to 30s before real-time is implemented; `Infinity` once WebSocket push is live

---

## Critical Conflict: Real-Time Sync Strategy

**Conflict:** STACK.md recommends `@fastify/websocket + pg-listen`. ARCHITECTURE.md recommends Supabase Realtime (postgres_changes + presence).

**Resolution: Use `@fastify/websocket + pg-listen`. Reject Supabase Realtime.**

**Rationale:**

SeatKit's defining constraint is self-hosting. A self-hoster running their own PostgreSQL instance (not Supabase's managed cloud) cannot use Supabase Realtime — it is a cloud service that reads Supabase's own PostgreSQL logical replication slot, not an open-source component that can be self-deployed alongside any PostgreSQL database. Accepting Supabase Realtime would make self-hosting a lie: the system would require Supabase's cloud for real-time to function.

Better Auth was chosen over Supabase Auth for exactly this reason (auth must not require Supabase's cloud). The same logic applies to Supabase Realtime vs. pg-listen. The Stack researcher explicitly listed "Supabase Realtime: Vendor lock-in; adds cloud dependency for self-hosted" as the reason for rejection. The Architecture researcher's diagram was built assuming Supabase is always the host — that assumption does not hold for the project's stated goals.

`@fastify/websocket` is already installed. `pg-listen` adds one small library. PostgreSQL LISTEN/NOTIFY works on any PostgreSQL instance. This is the correct path.

**Presence tracking:** The Architecture document describes Supabase Realtime's presence channel for tracking who is editing. With `@fastify/websocket`, presence is implemented via the WebSocket connection itself: the server maintains an in-memory map of `{ userId, editingReservationId }` per connected client and broadcasts presence state changes over the same WebSocket channel that carries reservation change events. This is straightforward and does not require Supabase.

---

## Implications for Roadmap

Research strongly suggests the following phase structure, derived from the dependency graph in ARCHITECTURE.md and the pitfall-to-phase mappings in PITFALLS.md.

### Suggested Phase Structure

**Phase 1: Business Logic Engine**
- Build `@seatkit/engine` as a pure-function package
- Availability checking, table assignment (contiguous-block preference), conflict detection
- Add `version` integer column to reservations table in the same phase (prevents Pitfall 1)
- Wire engine into existing reservation CRUD routes — routes become thin orchestrators
- Add GIN index on `customer` JSONB column (prevents Pitfall 10)
- Rationale: nothing in the roadmap can deliver correct behavior without availability checking and conflict resolution. Engine must exist before UI can be built.
- Research flag: LOW — engine architecture is well-specified from KoenjiApp reference. Standard patterns apply.

**Phase 2: Authentication and Restaurant Scoping**
- Implement Better Auth 1.x via `fastify-better-auth` plugin
- Role-based access: staff, manager, owner
- Better Auth schema migrated via Drizzle (not Better Auth's own migration tool)
- Extract `restaurantId` from JWT claims in middleware — remove `createdBy` trust from request body
- Add `restaurant_id` column and RLS policies to all tables (enables future multi-restaurant without SaaS rewrite)
- Replace `@supabase/supabase-js` unused dependency with Better Auth
- Fix `console.*` calls — replace with Fastify's pino logger (prevents Pitfall 11)
- Rationale: authentication gates all production use. RLS on `restaurant_id` is a prerequisite for the WebSocket real-time channel (clients must be authenticated before they can receive scoped events). Must complete before any production deployment.
- Research flag: MEDIUM — Better Auth Drizzle schema integration pattern needs implementation-time validation. Fastify plugin is documented but not battle-tested at scale.

**Phase 3: Remaining API Routes + OpenAPI Spec**
- Complete CRUD routes: tables, rooms, sales, sessions, profiles, restaurants
- Generate OpenAPI 3.1 spec from routes via `@fastify/swagger`
- Add field-level integration tests per endpoint (prevents Pitfall 5 — API contract drift)
- Session management with heartbeat + TTL expiry (prevents Pitfall 7 — ghost sessions)
- Restaurant configuration API (tables, hours, categories)
- Rationale: frontend cannot render complete data until these routes exist. OpenAPI spec must be committed before iOS integration begins. Session management must be built alongside session creation — not retrofitted.
- Research flag: LOW — standard Fastify patterns, well-documented.

**Phase 4: Real-Time Collaboration**
- Add `pg-listen` to `@seatkit/api`; wire up PostgreSQL NOTIFY triggers on reservation writes
- Implement WebSocket endpoint in Fastify (`@fastify/websocket`)
- Client WebSocket hook in `@seatkit/web` that invalidates TanStack Query on change events
- In-memory presence map on server: broadcast `{ userId, editingReservationId }` state changes
- Reduce TanStack Query stale time to `Infinity` once WebSocket push is live (previously: 30s bridge)
- Rationale: multi-device use requires real-time. Staff cannot use the system collaboratively without it. Version column from Phase 1 is a prerequisite.
- Research flag: MEDIUM — pg-listen reconnection behavior and production reliability under Supabase Pooler needs validation. nginx WebSocket upgrade header config requires environment testing.

**Phase 5: Reservation Management UI**
- Timeline / Gantt view with virtualized rendering (prevents Pitfall 9 — 60fps at minute granularity)
- List view with search (customer name via generated column index), filtering, sorting, grouping
- Reservation form: CRUD + status lifecycle + category + type
- Walk-in auto-detection, waiting list promote flow, recovery from soft-delete
- TanStack Query integration with WebSocket-driven cache invalidation
- Rationale: this is the primary staff interface. All backend infrastructure must be stable before building the most complex UI component (timeline/Gantt).
- Research flag: MEDIUM — Gantt virtualization strategy for minute-level granularity in React should be researched before implementation begins.

**Phase 6: Sales and Reporting**
- Sales data entry UI (daily, per service period)
- Daily / monthly / yearly rollup views
- Manager-gated totals (role check from Phase 2 auth)
- Restaurant-specific sales categories (yami, yamiPulito, bento, cocai, letturaCassa, fatture)
- Average lunch spend calculation
- Rationale: end-of-shift workflow is required for Koenji operations but not the primary UI. Ships after core reservation management is solid.
- Research flag: LOW — well-specified from KoenjiApp source.

**Phase 7: KoenjiApp Data Migration**
- Write `packages/api/src/scripts/import-koenji.ts`
- Schema audit pass first: catalog all Firestore document shape variations before writing inserts
- Idempotent: `INSERT ... ON CONFLICT DO NOTHING` keyed on Firestore document IDs
- UTC timestamp verification test (run with `TZ=Asia/Tokyo`)
- SQLite cross-reference for count verification
- Dry-run mode that outputs diff report without inserting
- Weekly rehearsals against fresh Firestore exports starting from the phase this is built
- Cutover plan: Sunday off-peak, KoenjiApp read-only 24h prior, final pass, human-reviewed verification report
- Rationale: can run in parallel with Phases 5 and 6 (migration script is standalone). Must be complete before production cutover.
- Research flag: LOW — migration architecture is fully specified. Main risk is execution discipline (weekly rehearsals).

**Phase 8: Deployment and Self-Hosting**
- Docker Compose: nginx + api + web services
- Next.js `output: 'standalone'` configuration
- nginx: WebSocket upgrade headers, streaming buffer disabled for Next.js App Router
- `DEPLOYMENT_MODE=gcp|selfhosted` flag to control secret loading (GCP Secret Manager vs .env)
- Drizzle version upgrade to 0.45.x
- Documentation: self-hosting guide, environment variable reference, first-run configuration
- Rationale: deployment is the gate for open-source adoption. Self-hosting docs make or break external contributor willingness.
- Research flag: LOW — Docker Compose patterns are well-documented. nginx streaming buffer requirement is documented; needs environment validation.

**Post-MVP (deferred):**
- Visual table layout drag-to-move
- Cluster visualization
- `fastify-type-provider-zod` upgrade to 6.x + Zod 4 migration
- iOS Swift app API integration (can start from OpenAPI spec in Phase 3)
- Multi-restaurant configuration UI (schema structure added in Phase 2; UI deferred)
- Advanced analytics and reporting

### Cross-Cutting Constraints (apply to every phase)

1. **Koenji first:** No multi-restaurant feature is built until Koenji can run end-to-end on SeatKit (prevents Pitfall 4).
2. **Additive migrations only:** Every Drizzle migration SQL file gets mandatory code review. No `DROP COLUMN` without a preceding backfill (prevents Pitfall 6).
3. **No generalization without a second customer:** Every `TODO: make configurable` comment is a red flag until a real second restaurant exists.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Core stack | HIGH | Running in CI, production-level verification |
| Feature set | HIGH | KoenjiApp production source code is the reference; 9+ months validated |
| Engine architecture | HIGH | Pattern is clear; pure-function design matches KoenjiApp's services layer |
| Real-time (pg-listen) | MEDIUM | Library is well-documented; production reliability under Supabase Session Pooler unverified |
| Better Auth integration | HIGH | v1.5.6 current; Fastify plugin documented; MEDIUM on Drizzle schema integration specifics |
| Migration (Firestore) | MEDIUM | Architecture is clear; data shape variations in live Firestore unknown until schema audit |
| Docker Compose deployment | HIGH | Next.js official self-hosting docs + multiple 2025 guides verified |
| nginx streaming config | MEDIUM | Requirement documented; exact config needs environment testing |
| Gantt/timeline UI performance | MEDIUM | Strategy defined; implementation specifics need upfront design research |

**Overall: HIGH** — the domain is fully specified, the stack is locked, and the three gaps (real-time, auth, deployment) have clear technical paths with strong rationale. The medium-confidence areas are implementation details, not architectural unknowns.

---

## Gaps to Address During Planning

1. **pg-listen under Supabase Session Pooler:** LISTEN/NOTIFY requires a persistent connection — Supabase's PgBouncer in session mode should support this, but it must be validated. If it doesn't, the fallback is a direct PostgreSQL connection (bypassing PgBouncer) for the pg-listen listener only.

2. **Firestore document shape audit:** The migration script cannot be designed until the range of document shape variations in live Firestore is known. The schema audit (run all documents through Zod, log failures) must be the first output of Phase 7.

3. **Gantt virtualization library decision:** The timeline component is the most complex UI piece. The decision between `react-virtual`, `@tanstack/react-virtual`, or a canvas-based approach should be made before Phase 5 implementation begins, not during it.

4. **Better Auth + Drizzle schema alignment:** Better Auth has its own session/user table schema. Integrating it via Drizzle migrations (instead of Better Auth's own migration tool) requires care. This pattern should be prototyped early in Phase 2 before the routes are built on top of it.

5. **nginx streaming buffer and WebSocket in the same config:** The nginx configuration must satisfy two simultaneous requirements (disable response buffering for Next.js streaming AND enable WebSocket upgrade for the API). These can conflict. The nginx config should be tested in a local Docker Compose environment before it is written into deployment documentation.

---

## Sources (Aggregated)

**Stack research:**
- Better Auth: https://better-auth.com, https://www.npmjs.com/package/better-auth
- Drizzle ORM: https://www.npmjs.com/package/drizzle-orm, https://orm.drizzle.team/roadmap
- pg-listen: https://github.com/andywer/pg-listen
- Next.js self-hosting: https://nextjs.org/docs/app/guides/self-hosting
- Vitest 4.0: https://vitest.dev/blog/vitest-4

**Features research:**
- KoenjiApp production source: `/Users/matteonassini/KoenjiApp` (PRIMARY — HIGH confidence)
- TouchBistro: https://www.touchbistro.com/blog/best-restaurant-reservation-systems/
- EatApp: https://restaurant.eatapp.co/blog/online-restaurant-reservation-systems
- Tableo: https://tableo.com/technology-innovation/restaurant-reservation-system-basics-2025/

**Architecture research:**
- Supabase Realtime: https://github.com/supabase/realtime (referenced but not recommended)
- Swift OpenAPI Generator: https://github.com/apple/swift-openapi-generator
- Optimistic locking in REST: https://sookocheff.com/post/api/optimistic-locking-in-a-rest-api/
- Firestore migration patterns: https://engineering.traba.work/firestore-postgres-migration
- KoenjiApp architecture: `/Users/matteonassini/KoenjiApp/.planning/codebase/ARCHITECTURE.md`

**Pitfalls research:**
- PostgreSQL MVCC: Chapter 13, PostgreSQL docs
- Drizzle migration bug: GitHub issue #3826
- Ghost sessions: Marmelab, "Real-Time Resource Locking Using Websockets"
- SeatKit CONCERNS.md (2026-04-06 audit)
- KoenjiApp CONCERNS.md (2026-04-06 audit)
