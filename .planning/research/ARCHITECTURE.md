# Architecture Research

**Domain:** Real-time collaborative restaurant reservation and sales management system
**Researched:** 2026-04-06
**Confidence:** HIGH (existing codebase + KoenjiApp reference + verified against official docs)

## System Overview

SeatKit has two concurrent client surfaces — a Next.js web app and a native Swift iOS app — both consuming the same Fastify REST API. The PostgreSQL database (via Supabase) is the single source of truth. Real-time collaboration is layered on top via Supabase Realtime (WebSocket-based, Postgres WAL streaming).

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                      │
│                                                                           │
│   ┌─────────────────────────────┐    ┌──────────────────────────────┐    │
│   │    @seatkit/web             │    │   iOS Swift App (SeatKit)    │    │
│   │  Next.js 15 + React 19      │    │  URLSession + async/await    │    │
│   │  TanStack Query + Zustand   │    │  Swift OpenAPI Generated     │    │
│   │  Supabase Realtime client   │    │  Supabase Realtime client    │    │
│   └──────────────┬──────────────┘    └──────────────┬───────────────┘    │
└──────────────────┼───────────────────────────────────┼────────────────────┘
                   │ REST HTTP /api/v1                  │ REST HTTP /api/v1
                   │ WebSocket (Supabase Realtime)      │ WebSocket (Supabase Realtime)
┌──────────────────┼───────────────────────────────────┼────────────────────┐
│                  ▼              API LAYER             ▼                    │
│   ┌───────────────────────────────────────────────────────────────┐       │
│   │                     @seatkit/api                              │       │
│   │   Fastify + Zod validation + @fastify/sensible                │       │
│   │   Auth middleware (JWT) + RBAC                                │       │
│   │   Routes: /reservations  /tables  /sales  /sessions  /config  │       │
│   └─────────────────────────────┬─────────────────────────────────┘       │
│                                 │                                          │
│   ┌─────────────────────────────▼─────────────────────────────────┐       │
│   │                    @seatkit/engine                            │       │
│   │   Availability checking  •  Table clustering                  │       │
│   │   Conflict resolution  •  Reservation validation              │       │
│   │   Session management  •  Sales calculation                    │       │
│   └─────────────────────────────┬─────────────────────────────────┘       │
└─────────────────────────────────┼──────────────────────────────────────────┘
                                  │ Drizzle ORM
┌─────────────────────────────────┼──────────────────────────────────────────┐
│                  ▼        DATA LAYER                                        │
│   ┌───────────────────────────────────────────────────────────────┐        │
│   │              Supabase PostgreSQL                              │        │
│   │   Tables: reservations, tables, rooms, sessions,             │        │
│   │           sales_daily, profiles, restaurants                  │        │
│   │   Row Level Security policies per restaurant_id              │        │
│   └─────────────────────────────┬─────────────────────────────────┘        │
│                                 │                                           │
│   ┌─────────────────────────────▼─────────────────────────────────┐        │
│   │              Supabase Realtime (Phoenix/Elixir)               │        │
│   │   Postgres WAL → JSON events → authorized channel clients     │        │
│   │   Channels: postgres_changes  broadcast  presence             │        │
│   └───────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                       SHARED FOUNDATION                                   │
│   @seatkit/types (Zod schemas + TS types)  ←── used by all packages      │
│   @seatkit/utils (date/UTC, money, DB pool, test helpers)                 │
│   @seatkit/ui (shadcn/ui components, design tokens)                       │
└───────────────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component | Responsibility | Communicates With | Notes |
|-----------|---------------|-------------------|-------|
| `@seatkit/types` | Domain schemas, Zod validation, Result type | All packages | Foundation — no upstream deps |
| `@seatkit/utils` | Date/UTC ops, money formatting, DB pooling, test helpers | `@seatkit/types`, DB | No business logic |
| `@seatkit/engine` | Business rules: availability, clustering, conflicts | `@seatkit/types`, `@seatkit/utils` | Pure functions, no I/O |
| `@seatkit/api` (db layer) | Drizzle ORM schema + migrations, connection pool | PostgreSQL | Schema is source of truth for DB shape |
| `@seatkit/api` (routes) | Fastify HTTP endpoints, auth middleware, validation | `@seatkit/engine`, db layer, Supabase | External boundary — versioned `/api/v1` |
| `@seatkit/ui` | shadcn/ui design system, React components | React, Tailwind | No API calls — pure UI |
| `@seatkit/web` | Next.js frontend, TanStack Query, Zustand, Supabase Realtime client | `@seatkit/api` REST, Supabase WS | Browser-only; calls REST for mutations, WS for live updates |
| iOS Swift App | Native UI, URLSession, Supabase Realtime Swift client | `@seatkit/api` REST, Supabase WS | Same API as web; OpenAPI-generated types |

### Dependency Graph (build order enforced by Turborepo)

```
@seatkit/types
    ├── @seatkit/utils
    │       └── @seatkit/api  (db + routes)
    ├── @seatkit/engine
    │       └── @seatkit/api  (routes use engine)
    ├── @seatkit/ui
    │       └── @seatkit/web
    └── @seatkit/web
```

## Data Flow

### Read Path (list reservations)

```
Staff taps "Today" on web or iOS
    │
    ▼
Client calls GET /api/v1/reservations?date=2026-04-06&restaurantId=xxx
    │
    ▼
Fastify route: validates JWT → extracts restaurantId → builds Drizzle query
    │
    ▼
Drizzle queries PostgreSQL → returns rows
    │
    ▼
Fastify serializes (Date → ISO string) → JSON response
    │
    ▼
Web: TanStack Query caches under ['reservations', 'list', { date, restaurantId }]
iOS: URLSession decodes into Swift Codable model
    │
    ▼
UI renders timeline / list view
```

### Write Path (create reservation)

```
Staff submits new reservation form
    │
    ▼
Optimistic update: TanStack Query (web) / local state (iOS) shows reservation immediately
    │
    ▼
Client calls POST /api/v1/reservations with reservation body
    │
    ▼
Fastify validates JWT + Zod schema → rejects 400 if invalid
    │
    ▼
engine.checkAvailability() → returns conflict or OK
    │  (if conflict → 409 Conflict with details)
    ▼
Drizzle INSERT → PostgreSQL
    │
    ▼
PostgreSQL writes to WAL → Supabase Realtime picks up change
    │
    ▼
Realtime broadcasts postgres_changes event to all subscribed clients
    │
    ▼
All clients: TanStack Query invalidates ['reservations'] cache → refetch
    │   OR
    │   Realtime event directly updates local cache without full refetch
    ▼
All connected devices see new reservation within ~1 second
```

### Real-Time Sync Flow

```
Supabase Realtime Architecture:
  PostgreSQL WAL
      │
      ▼
  Supabase Realtime (Elixir/Phoenix)
      │  reads logical replication slot
      ▼
  Postgres Changes events (INSERT/UPDATE/DELETE per table)
      │
      ▼
  Channel: "realtime:reservations"
      │  filtered by restaurant_id via RLS
      ▼
  WebSocket broadcast to subscribed clients (web + iOS)
      │
      ▼
  Client: merges event into local cache OR invalidates query
```

**Conflict resolution strategy: optimistic + version-based**
- All mutable rows carry a `version` integer column and `updated_at` timestamp
- On PUT/PATCH, client sends `If-Match: <version>` header or includes `version` in body
- API checks version before writing; if mismatch → `409 Conflict` with current record
- Client rolls back optimistic update, shows conflict UI
- This is the REST-native approach (ETag/If-Match) and avoids the complexity of CRDTs or OT for this domain

**Presence (who's editing what):**
- Use Supabase Realtime `presence` channel
- Each client publishes `{ userId, staffName, editingReservationId }` on join/update
- All clients see who else is online and what they're editing
- No reservation-level locks — presence is advisory only (show "X is editing this")

## Recommended Package Structure

### `@seatkit/engine` (not yet built)

```
packages/engine/src/
├── availability/
│   ├── check-availability.ts      # Is a slot open for N guests at T?
│   ├── find-open-slots.ts         # Return all open slots for a day
│   └── index.ts
├── clustering/
│   ├── cluster-reservations.ts    # Group reservations by time proximity
│   ├── assign-tables.ts           # Match party size to table capacity
│   └── index.ts
├── reservations/
│   ├── validate-reservation.ts    # Business rule validation (beyond Zod)
│   ├── calculate-duration.ts      # Default duration by category
│   └── index.ts
├── sales/
│   ├── calculate-totals.ts        # Daily/monthly aggregations
│   └── index.ts
└── index.ts
```

**Engine is pure functions — no I/O, no DB calls.** Routes call engine functions, then persist results via Drizzle. This is testable without a database and reusable by both API and future background jobs.

### `@seatkit/api` routes extension

```
packages/api/src/
├── routes/
│   ├── reservations.ts            # ✅ exists
│   ├── tables.ts                  # table CRUD + layout
│   ├── rooms.ts                   # room/floor plan config
│   ├── sales.ts                   # daily sales entry + reporting
│   ├── sessions.ts                # user session management
│   ├── profiles.ts                # user profile CRUD
│   ├── restaurants.ts             # restaurant config
│   └── auth.ts                    # login, token refresh, logout
├── middleware/
│   ├── auth.ts                    # JWT verification + user injection
│   ├── restaurant-scope.ts        # inject restaurantId from JWT claims
│   └── rate-limit.ts              # per-route rate limits
├── plugins/
│   ├── supabase.ts                # Supabase client singleton (for Realtime)
│   └── realtime.ts                # SSE fallback endpoint (optional)
├── openapi/
│   └── spec.yaml                  # OpenAPI 3.1 spec — contract for iOS client
└── scripts/
    ├── migrate.ts                 # ✅ exists
    ├── migrate-test.ts            # ✅ exists
    └── import-koenji.ts           # one-time migration script (new)
```

## iOS + Web API Contract Design

### Strategy: OpenAPI 3.1 as Shared Contract

Use OpenAPI specification as the source of truth for the API surface. Both web and iOS derive their client code from it.

**Web (TypeScript):** The existing Zod schemas in `@seatkit/types` already define the contract. The `apiClient` in `@seatkit/web` validates responses against these schemas. No additional codegen required.

**iOS (Swift):** Apple's `swift-openapi-generator` (actively maintained, introduced at WWDC 2023) generates type-safe Swift client code from an OpenAPI 3.0/3.1 document. This gives:
- Swift `Codable` models generated from OpenAPI schemas
- Type-safe method calls per endpoint
- Compile-time verification that iOS client matches API contract
- Regenerate automatically when API changes

**Workflow:**
1. OpenAPI spec lives at `packages/api/src/openapi/spec.yaml`
2. Fastify routes are driven from spec via `@fastify/swagger` + validation
3. iOS runs `swift-openapi-generator` as a Swift Package Manager build plugin
4. Both sides compile against the same contract — mismatches surface at build time

**Versioning:** URL-prefixed `/api/v1/`. Breaking changes → `/api/v2/`. Run at most two major versions simultaneously. Current plan: no versioning needed until first external consumer beyond internal iOS app.

### API Design Principles for Multi-Client

| Concern | Approach |
|---------|----------|
| Date/time | All ISO 8601 strings in UTC in JSON (`2026-04-06T19:30:00Z`) — clients parse to native types |
| IDs | UUID strings — both Swift and TypeScript handle these natively |
| Pagination | Cursor-based for list endpoints (`?cursor=<id>&limit=50`) — mobile-friendly |
| Filtering | Query params (`?date=2026-04-06&status=confirmed`) — simple, cacheable |
| Errors | Standard `{ error, message, details[] }` shape across all endpoints |
| Auth | `Authorization: Bearer <jwt>` header — works identically on web and iOS |
| Optimistic conflict | `version` field on all mutable entities; `409 Conflict` on version mismatch |

## Real-Time Sync Strategy

### Recommended: Supabase Realtime (postgres_changes + presence)

Supabase Realtime is already available as part of the existing Supabase hosting. It uses Postgres's logical replication (WAL) to stream row-level changes as JSON events over WebSockets. No additional infrastructure is needed.

**Three channel types:**

| Channel | Use in SeatKit | Details |
|---------|---------------|---------|
| `postgres_changes` | Primary sync | Stream INSERT/UPDATE/DELETE from `reservations`, `tables`, `sales_daily` |
| `presence` | Who's editing | Staff list, active device, `editingReservationId` per client |
| `broadcast` | Optional | UI notifications (e.g. "Service starting") — not required for v1 |

**Client subscription pattern (web):**
```typescript
// packages/web/src/lib/realtime.ts
const channel = supabase
  .channel('reservations')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'reservations',
      filter: `restaurant_id=eq.${restaurantId}` },
    (payload) => {
      // Invalidate TanStack Query cache — triggers refetch
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    }
  )
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    presenceStore.setState({ onlineStaff: state });
  })
  .subscribe();
```

**Authorization:** Supabase Realtime respects PostgreSQL RLS policies. A client subscribing to `reservations` only receives events for rows their JWT is authorized to read. This means: set `restaurant_id` as an RLS column and enforce it via policies — realtime isolation is automatic.

**Conflict with optimistic updates:**
- Web: TanStack Query `onMutate` applies optimistic update → `onError` rolls back → `onSettled` invalidates cache
- iOS: Local state update → network call → success commits / error reverts
- Version field on server prevents silent overwrite conflicts

**Fallback for v1:** If Supabase Realtime proves complex to integrate before auth is ready, use TanStack Query `refetchInterval: 5000` as a polling fallback for the same data. Swap to Realtime when auth is in place (RLS requires authenticated sessions).

### What NOT to build

**No custom WebSocket server.** The existing ARCHITECTURE.md notes `@fastify/websocket` as an option, but Supabase Realtime already handles this. Building a second WebSocket layer adds operational complexity with no benefit.

**No SSE endpoint.** SSE is one-way (server→client) and requires sticky sessions behind a load balancer. Supabase Realtime's WebSocket approach is strictly better for this use case.

## Firestore-to-PostgreSQL Migration Pattern

### Context

KoenjiApp stores data in:
- **Firestore** — reservations, sessions, sales, profiles, tables (primary + real-time)
- **SQLite** — local device backup mirror of Firestore collections

Migration target: SeatKit's PostgreSQL via Drizzle schema.

### Migration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    packages/api/src/scripts/import-koenji.ts    │
│                                                                 │
│  1. Extract from Firestore via Firebase Admin SDK               │
│     - Admin SDK requires service account JSON key               │
│     - Read each collection: reservations, tables, sales,        │
│       profiles, sessions                                        │
│                                                                 │
│  2. Transform to SeatKit schema                                 │
│     - Map Firestore document fields → Drizzle column types      │
│     - Convert Firestore Timestamps → Date objects               │
│     - Normalize nested objects → relational rows                │
│     - Validate each record through @seatkit/types Zod schemas   │
│     - Collect validation failures in error report (don't abort) │
│                                                                 │
│  3. Load into PostgreSQL                                        │
│     - Drizzle INSERT with ON CONFLICT DO NOTHING (idempotent)   │
│     - Use external UUID from Firestore doc ID as primary key    │
│     - Run inside transaction per collection                     │
│                                                                 │
│  4. Verify                                                      │
│     - Count rows per table vs Firestore collection counts       │
│     - Sample 10% random records, compare field values           │
│     - Print verification report — human reviews before cutover  │
└─────────────────────────────────────────────────────────────────┘
```

### Idempotency Design

The migration must be re-runnable without creating duplicates or overwriting intentional changes:

```typescript
// Use Firestore doc ID as PostgreSQL primary key UUID
// ON CONFLICT DO NOTHING = safe to re-run
await db.insert(reservations).values(record)
  .onConflictDoNothing({ target: reservations.id });
```

If a re-run is needed after partial failure, only missing records are inserted. Existing records are untouched.

### Schema Mapping

| Firestore Collection | PostgreSQL Table | Key Differences |
|---------------------|-----------------|-----------------|
| `reservations` | `reservations` | Timestamps from Firestore Timestamp → Date; nested `customer` object → flattened columns |
| `tables` | `tables` + `rooms` | KoenjiApp has room concept embedded in table; SeatKit separates Room entity |
| `sessions` | `sessions` | Firebase Realtime Database `isActive` paths → simple boolean + timestamp |
| `sales` | `sales_daily` | KoenjiApp monthly docs with day arrays → one row per service shift |
| profiles | `profiles` | Apple Sign-In UID maps to `external_auth_id`; no passwords |

### SQLite as Verification Source

KoenjiApp's local SQLite contains a mirror of Firestore data. Use it as a cross-reference during verification:
- Export SQLite via `sqlite3 koenji.db .dump > dump.sql`
- Compare reservation counts: SQLite vs Firestore vs PostgreSQL
- Flag discrepancies for manual review before cutover

### Cutover Plan

1. Run migration script against production Firestore → SeatKit PostgreSQL
2. Verify report passes human review
3. Deploy SeatKit to production
4. Run one final migration pass (catch any records created during deployment window)
5. Redirect staff to SeatKit web/iOS — KoenjiApp goes read-only
6. Monitor for 2 weeks, then decommission KoenjiApp Firebase project

## Architectural Patterns

### Pattern 1: Engine-First Business Logic

**What:** Business rules live in `@seatkit/engine` as pure functions before any route accesses them. Routes orchestrate: validate input → call engine → persist result.

**Why:** Engine functions can be unit-tested without a database. This mirrors KoenjiApp's `ReservationServices` layer but without the iOS-specific observable dependencies.

**Example:**
```typescript
// @seatkit/engine/src/availability/check-availability.ts
export function checkAvailability(
  existing: Reservation[],
  candidate: ReservationInput,
  tables: Table[]
): Result<TableAssignment, AvailabilityError> { ... }

// @seatkit/api/src/routes/reservations.ts
const existing = await db.select()...;
const result = checkAvailability(existing, body, tables);
if (!result.success) throw fastify.httpErrors.conflict(result.error.message);
await db.insert(reservations).values({ ...body, tableId: result.value.tableId });
```

### Pattern 2: Restaurant-Scoped Everything

**What:** Every database table has a `restaurant_id` UUID column. Every API request extracts `restaurantId` from the JWT claims via middleware. PostgreSQL RLS enforces isolation.

**Why:** Supports future multi-restaurant without a SaaS rewrite. Self-hosted instances with one restaurant still have the column — it's a no-op cost.

**Example RLS policy:**
```sql
CREATE POLICY "restaurant_isolation" ON reservations
  FOR ALL USING (restaurant_id = auth.jwt() ->> 'restaurant_id');
```

### Pattern 3: Shared Types as Contract

**What:** `@seatkit/types` Zod schemas are the single source of truth. Drizzle schema, Fastify route schema, API client validation, and OpenAPI spec all derive from or are kept in sync with these schemas.

**Why:** Prevents drift between database shape and API contract. Type errors surface at compile time across the monorepo.

### Pattern 4: Optimistic Updates with Version Rollback

**What:** Clients apply changes locally before the server confirms. A `version` integer on every mutable entity catches concurrent edits. On `409 Conflict`, clients discard their optimistic state and show the server's version.

**Why:** Restaurant staff need sub-second feedback. Network round-trips average 100-300ms on mobile. Optimistic UI feels instant.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Business Logic in Routes

**What goes wrong:** Route handlers directly compute availability, run clustering, or calculate totals instead of delegating to engine functions.

**Consequences:** Logic cannot be tested without a live Fastify server. Duplicated logic when iOS needs the same calculation. Cannot be reused by background jobs or migration scripts.

**Instead:** Routes are thin orchestrators. Engine functions do the math.

### Anti-Pattern 2: Embedding Real-Time in the API Server

**What goes wrong:** Adding WebSocket endpoints to Fastify for live updates instead of using Supabase Realtime.

**Consequences:** Need sticky sessions behind load balancer. Custom protocol for iOS client. Duplicate connection management code. Supabase Realtime already handles all of this with RLS authorization.

**Instead:** Use Supabase Realtime channels. Fastify stays stateless.

### Anti-Pattern 3: Hardcoding Koenji-Specific Config

**What goes wrong:** Operating hours, table count, category names, or business rules baked into code rather than restaurant configuration.

**Consequences:** Every new restaurant requires code changes. Open source adoption is impossible.

**Instead:** All restaurant-specific values live in the `restaurants` table. Engine functions accept configuration as arguments, not constants.

### Anti-Pattern 4: Migration as a One-Shot Manual Process

**What goes wrong:** Firestore export is a manual JSON dump that runs once and can't be re-run.

**Consequences:** If migration fails halfway, data is in unknown state. If new Firestore data arrives during migration window, it's lost.

**Instead:** Idempotent migration script using `ON CONFLICT DO NOTHING` keyed on Firestore document IDs. Safe to re-run as many times as needed.

## Scalability Considerations

SeatKit's target is a single restaurant (14-20 seats, ~15 concurrent staff). At this scale, the architecture is deliberately over-provisioned. Notes for when scale questions arise:

| Concern | At 1 restaurant (now) | At 10 restaurants | At 100+ restaurants |
|---------|----------------------|-------------------|--------------------|
| DB isolation | `restaurant_id` column + RLS | Same | Consider schema-per-tenant |
| Realtime channels | 1 channel per restaurant | ~10 channels — Supabase limit is 100/tenant | Upgrade Supabase plan or self-host Realtime |
| API instances | 1 Docker container | 2-3 containers + load balancer | Horizontal scaling, stateless by design |
| DB connections | Session pooler (PgBouncer) already in use | Same | Connection pool sizing |
| Engine | In-process function call | Same | Could extract to worker if CPU-bound |

## Suggested Build Order

Dependencies must be built before dependents. This sequence maps to phases:

```
1. @seatkit/engine
   └── Unlocks: availability checking, conflict detection in API routes
   └── Required before: any write endpoint can enforce business rules

2. Auth + Restaurant Scoping (in @seatkit/api)
   └── Unlocks: secure multi-staff access, RLS enforcement
   └── Required before: Supabase Realtime (needs authenticated JWT for RLS)

3. Complete CRUD routes (tables, rooms, sessions, profiles, restaurants)
   └── Unlocks: restaurant configuration UI, full domain coverage
   └── Required before: frontend can render complete data

4. Supabase Realtime integration (web + iOS)
   └── Unlocks: live multi-device collaboration
   └── Required before: real-time collaboration feature is live

5. Reservation management UI (@seatkit/web)
   └── Unlocks: timeline/Gantt view, list view with filtering
   └── Required before: staff can use web app for core operations

6. Table layout UI (@seatkit/web)
   └── Unlocks: visual table assignment
   └── Depends on: complete tables/rooms API, engine clustering

7. Sales entry + reporting (@seatkit/web)
   └── Unlocks: end-of-shift data entry, basic analytics

8. KoenjiApp data migration (import-koenji script)
   └── Can run in parallel with any of the above
   └── Required before: production cutover from Swift app

9. iOS Swift app API integration
   └── Requires stable /api/v1 contract + OpenAPI spec
   └── Can run in parallel with web UI development
```

## Sources

- Supabase Realtime architecture: [github.com/supabase/realtime](https://github.com/supabase/realtime), [Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes)
- Supabase Realtime RLS authorization: [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization)
- Supabase Firestore migration guide: [Migrate from Firestore to Supabase](https://supabase.com/docs/guides/platform/migrating-to-supabase/firestore-data)
- SSE vs WebSockets: [RxDB comparison](https://rxdb.info/articles/websockets-sse-polling-webrtc-webtransport.html), [Ably blog](https://ably.com/blog/websockets-vs-sse)
- Optimistic locking in REST: [Kevin Sookocheff](https://sookocheff.com/post/api/optimistic-locking-in-a-rest-api/)
- Apple Swift OpenAPI Generator: [swift.org announcement](https://www.swift.org/blog/introducing-swift-openapi-generator/), [GitHub](https://github.com/apple/swift-openapi-generator)
- OpenAPI + Fastify contract-first: [Evil Martians](https://evilmartians.com/chronicles/openapi-fastify-backend-let-the-contract-build-your-server)
- Firestore to PostgreSQL patterns: [Traba Engineering](https://engineering.traba.work/firestore-postgres-migration), [Valentin Mouret](https://medium.com/@ValentinMouret/functionally-migrating-from-firestore-to-postgresql-64947b5dff0d)
- Fastify SSE: [@fastify/sse npm](https://www.npmjs.com/package/@fastify/sse)
- KoenjiApp reference architecture: `/Users/matteonassini/KoenjiApp/.planning/codebase/ARCHITECTURE.md`
- SeatKit current architecture: `/Users/matteonassini/seatkit/.planning/codebase/ARCHITECTURE.md`
