# Domain Pitfalls

**Domain:** Restaurant reservation and sales management system — brownfield TypeScript rewrite of KoenjiApp (production iOS Swift app)
**Researched:** 2026-04-06
**Confidence:** HIGH for real-time and migration pitfalls (direct evidence from production codebase + literature), MEDIUM for open-source deployment (ecosystem patterns)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or production outages.

---

### Pitfall 1: Silent Lost Updates in Real-Time Collaboration

**What goes wrong:** Two staff members open the same reservation simultaneously. Staff A edits the party size; Staff B edits the time. Both save. One overwrites the other with no warning, no merge, no conflict. The last write wins — silently. The restaurant ends up with a reservation that has the wrong party size or wrong time, and no one knows.

**Why it happens:** The API as currently built does a simple PUT that replaces the entire record. The web client holds state in TanStack Query with a 5-minute stale time. There is no version column, no `updatedAt` check, no WebSocket push to invalidate other clients' caches. The KoenjiApp had this problem too — Firebase's real-time listeners provided a partial safety net, but KoenjiApp's CONCERNS.md explicitly flags fire-and-forget Tasks and listener cleanup as fragile.

**Consequences:**
- Reservation data silently diverges from reality during peak service (when collaboration pressure is highest)
- Staff lose trust in the system; fall back to paper
- Impossible to audit who made the last change without a full audit log

**Prevention:**
- Add a `version` integer column to the `reservations` table (start at 1, increment on every UPDATE)
- PUT endpoint rejects updates where `request.version !== db.version` with HTTP 409 Conflict
- Client retries with fresh data on 409, surfaces conflict to user
- Real-time invalidation (SSE or WebSocket) pushes version bumps to all connected clients so stale caches self-heal

**Warning signs:**
- Staff report "my change disappeared"
- `updatedAt` timestamps cluster — two updates within seconds to same reservation
- Missing `version` column in Drizzle schema

**Phase mapping:** Must be addressed before the real-time collaboration milestone. The optimistic locking version column can be added as part of the engine package implementation, before any collaborative UI is built. Do not ship the Gantt/timeline view without it.

**Sources:** Optimistic locking with version columns is well-established for PostgreSQL; the approach is: `UPDATE reservations SET ..., version = version + 1 WHERE id = $1 AND version = $2` — zero affected rows means conflict.

---

### Pitfall 2: Timestamp Corruption During Firestore-to-PostgreSQL Migration

**What goes wrong:** Firestore stores timestamps as `Timestamp` objects (seconds + nanoseconds, always UTC). A naive migration dumps these to ISO strings and inserts them into a PostgreSQL `TIMESTAMP WITHOUT TIME ZONE` column. If the migration script runs on a machine whose locale is not UTC, or if PostgreSQL's default timezone is not UTC, every timestamp shifts by the server's UTC offset. A 19:30 dinner reservation becomes 17:30 or 21:30 — off by hours. The bug is invisible in logs; the data looks valid.

**Why it happens:** PostgreSQL has two timestamp types: `TIMESTAMP WITH TIME ZONE` (stores UTC, displays in session timezone) and `TIMESTAMP WITHOUT TIME ZONE` (stores the literal value as-is, no timezone). If the migration script serializes Firestore Timestamps as local strings rather than explicit UTC ISO-8601 strings, and the target column is `WITHOUT TIME ZONE`, the offset is baked into the stored value permanently.

KoenjiApp uses SQLite alongside Firestore. SQLite has no native datetime type — dates are stored as strings or integers. These two formats must both be normalized to UTC before insertion into PostgreSQL, or the migration silently produces corrupt data.

**Consequences:**
- Every historical reservation displays at the wrong time
- Availability calculations during cutover are wrong — overbooking risk
- Bug is discovered only when staff compare with paper records or KoenjiApp, potentially months after migration

**Prevention:**
- Use `TIMESTAMPTZ` (timestamp with time zone) for all datetime columns in Drizzle schema — this is already done (`timestamp('...', { withTimezone: true })`), which is correct; do not change it
- Migration script must explicitly emit UTC ISO-8601 strings: `new Date(firestoreTimestamp.toDate()).toISOString()` — never `toString()`
- Add a post-migration verification step: compare the 10 most recent reservations' times between Firestore export and PostgreSQL, display side-by-side for manual review
- Test the migration script locally with `TZ=America/New_York` and `TZ=Asia/Tokyo` environment variables to catch locale-sensitivity

**Warning signs:**
- Migration produces timestamps ending in `+00:00` — good; bare `2024-11-15T19:30:00` with no timezone — danger
- Any `TIMESTAMP WITHOUT TIME ZONE` column added in a future migration (flag in code review)
- Post-migration reservation times off by round numbers of hours (1, 2, 9, etc.)

**Phase mapping:** Migration script phase. Implement the verification step before cutting over any production data. The migration must be a standalone idempotent script with a dry-run mode that outputs a diff report without inserting anything.

---

### Pitfall 3: NoSQL-to-Relational Schema Mismatch: Embedded Arrays Become Orphan Data

**What goes wrong:** Firestore documents in KoenjiApp embed related data — for example, `tables` stored as a JSON array inside a reservation document, or denormalized customer info on every reservation. When migrating, these embedded structures are either (a) copied verbatim into a JSONB column (loses relational integrity) or (b) normalized into separate tables (requires a join strategy that isn't obvious). Either choice made hastily leads to data that is hard to query or validate.

The KoenjiApp CONCERNS.md confirms this: `CustomerInfo` stored as JSONB in SeatKit's current schema has no database-level validation. Old or corrupt data with missing fields will break the frontend at runtime.

**Why it happens:** Document databases encourage embedding for read performance. Relational databases encourage normalization for integrity. Translating between models requires deliberate design decisions that a migration script cannot make automatically. Teams under time pressure pick JSONB as a shortcut, then discover they can't run `WHERE customer_name LIKE '%tanaka%'` without a full table scan.

**Consequences:**
- Full-text customer search becomes a table scan (no index on JSONB internals without explicit GIN index)
- Old Firestore documents with different schema shapes (from KoenjiApp's evolution) cause runtime panics when parsed
- Staff can't find reservations by customer name without a dedicated search endpoint

**Prevention:**
- Audit the Firestore export before writing migration code — catalog every unique document shape variation (KoenjiApp evolved; not all documents have identical fields)
- For `CustomerInfo`: keep it as JSONB but add a GIN index on the column immediately, and validate shape on read in the repository layer using Zod before returning to the caller
- For `tables` array on reservations: decide during engine package design whether tables are first-class entities with a join table, or configuration embedded in restaurant settings — do not let the migration script make this architectural decision implicitly
- Write a schema validation pass as step 1 of the migration: read all Firestore documents, run them through the current Zod schemas, log every document that fails validation. Fix schemas before inserting a single row.

**Warning signs:**
- Migration script uses `.catch(() => {})` on individual document inserts (masking malformed documents)
- JSONB columns in schema without a corresponding Zod parse on the read path
- `customerInfo?.name ?? 'Unknown'` defensive code in the frontend — symptom of untrusted data shape

**Phase mapping:** Migration planning phase, before the migration script is written. The schema audit output (which document shapes exist, which fail Zod validation) is an input to the migration script design, not a byproduct.

---

### Pitfall 4: The Generalization Trap — Building for Hypothetical Restaurants Before Koenji Works

**What goes wrong:** The codebase accumulates configuration options, `restaurantId` scoping on every query, multi-tenant table design, and per-restaurant feature flags — before the system reliably handles the one restaurant it was built for. The result is a system that is flexible enough for any restaurant but not proven enough for this one. The first production user (Koenji) is blocked waiting for features while the platform adds abstraction layers.

**Why it happens:** Open-source projects attract contributors who want general solutions. Solo developers anticipate future users. The PROJECT.md explicitly lists multi-restaurant support as an active requirement — but it is in the same tier as authentication, which suggests it is being built in parallel with foundational features. Configuration abstraction compounds: every feature added must now be configurable per restaurant, doubling the design surface.

**Consequences:**
- MVP delayed by months building infrastructure that serves zero confirmed additional customers
- Configuration explosion: restaurant working hours, reservation slot sizes, table layout units, category definitions — each configurable, each a source of bugs for the initial user
- Koenji-specific behaviors (e.g., 14-seat maximum, lunch/dinner service split, Japanese-Venetian category labels) get abstracted into config options that no one else will use in v1

**Prevention:**
- Phase rule: Koenji must be able to use the system end-to-end before any multi-restaurant feature is added
- Use a single `restaurant_id` column on all tables from day one (so the schema is multi-tenant-ready) but do not implement the configuration UI or tenant isolation until a second restaurant exists
- Identify which behaviors are truly configurable vs. which are universal restaurant rules. "A reservation must have a start time" is universal. "Reservation slots are 30 minutes apart" is configurable. Build the universal rules first; make the configurable ones hardcoded constants in a single file that can be moved to config later.
- Flag every `TODO: make configurable` comment in code review. If the comment exists and no second restaurant is on the roadmap, delete the indirection and hardcode the value.

**Warning signs:**
- Restaurant configuration schema has more fields than the reservation schema
- PR titles start with "Add support for X per restaurant" before the core X feature works for one restaurant
- CORS whitelist hardcoded as `['https://your-domain.com']` — the system has never been deployed for real (this is currently in `packages/api/src/index.ts`)

**Phase mapping:** This pitfall must be flagged at every phase planning meeting. The constraint is: "Koenji works correctly before generalizing." Build the multi-restaurant schema structure early (one migration), but defer all configuration surface area.

---

## Moderate Pitfalls

Mistakes that cause significant rework or user-facing bugs, but can be recovered from.

---

### Pitfall 5: API Contract Drift Between Web Client and iOS Rewrite

**What goes wrong:** The REST API evolves to serve the web frontend. New fields are added, old fields are renamed, response shapes change. The iOS rewrite team (or future self) builds against what they believe the API looks like. When they integrate, the iOS app crashes or silently drops data because the contract drifted without formal versioning.

**Why it happens:** Web and iOS are developed at different velocities. Without a formal contract — OpenAPI spec, integration tests that run against the actual endpoint response shapes, or a versioning policy — the API evolves informally. A field renamed from `startTime` to `start_at` in one PR breaks the iOS app that hasn't been updated.

**Consequences:**
- iOS rewrite team must reverse-engineer the live API instead of building to a spec
- Breaking changes require coordinating both deployments simultaneously
- Staff using the iOS app see errors after a web deployment that changed the API

**Prevention:**
- Generate and commit an OpenAPI spec from the Fastify routes (use `fastify-openapi-glue` or `@fastify/swagger` + `@fastify/swagger-ui`) — the spec becomes the contract
- Add at least one integration test per endpoint that asserts the exact response shape (field names, types, nullability) — this test will fail if a field is accidentally renamed
- Adopt a simple versioning policy: non-breaking additions are fine without a version bump; any field removal or rename requires `/api/v2/...` and a deprecation notice in the old version
- The iOS rewrite reads from the OpenAPI spec, not from the web source code — they should never need to read `packages/api/src/routes/`

**Warning signs:**
- No `@fastify/swagger` in `packages/api/package.json`
- Response shape only tested via `res.statusCode === 200`, not field-level assertions
- Field names in Drizzle schema use snake_case while Zod schemas use camelCase with no explicit mapping

**Phase mapping:** OpenAPI spec generation should be added during the CRUD endpoints stabilization phase, before the iOS rewrite starts consuming the API. Integration tests with field-level assertions belong in the same phase.

---

### Pitfall 6: Drizzle Migration Accidents — Column Drops and Renames in One Step

**What goes wrong:** A developer renames a column in the Drizzle schema file. `drizzle-kit generate` emits a migration that drops the old column and creates a new one. The new column has no data — the old column's data is gone. Known Drizzle bug: when a column is renamed AND its type changes in the same migration, the rename is emitted but the type change is silently dropped (GitHub issue #3826).

**Why it happens:** Drizzle's migration generator infers intent from schema diffs, but column renames are ambiguous (is this a rename or a drop-and-add?). Drizzle does ask interactively, but CI runs non-interactively and may pick the wrong choice. Developers who generate migrations locally and commit the SQL file may not notice the destructive diff.

**Consequences:**
- Production data loss on a rename if the migration is not reviewed before applying
- Silent type mismatch if a rename+type-change migration is only partially generated
- Irreversible without a backup — Drizzle does not auto-generate rollback migrations

**Prevention:**
- Treat every generated migration SQL file as requiring mandatory code review — never apply unreviewed migrations
- Enforce the sequence for any rename: (1) add new column as nullable, (2) backfill with `UPDATE`, (3) add NOT NULL constraint, (4) drop old column in a separate migration after verifying data integrity
- Never drop a column in the same migration that removes it from application code — deploy the code change first, wait for it to be stable, then drop the column
- Run `SELECT COUNT(*) FROM reservations WHERE new_column IS NULL` after backfill and before adding NOT NULL — zero rows is the go/no-go gate

**Warning signs:**
- Migration SQL file contains `DROP COLUMN` without a corresponding `INSERT INTO` or `UPDATE` backfill above it
- Migration SQL file contains `ALTER COLUMN ... RENAME TO` without a preceding nullable add
- No manual review step in the CI pipeline before `drizzle-kit migrate` runs against production

**Phase mapping:** Must be established as a process before any schema migration touches production data. Add a migration checklist to the PR template.

---

### Pitfall 7: Ghost Sessions and Stale Presence Indicators

**What goes wrong:** Staff member opens the reservation editor on their phone. The app shows "Matteo is editing Table 5." Matteo closed his browser tab 10 minutes ago but the session was never cleaned up. Staff avoid editing the reservation because they think someone else is working on it. This is the "ghost session" problem.

**Why it happens:** Session management requires both a heartbeat mechanism (the client periodically confirms it is still alive) and a cleanup mechanism (the server expires sessions that miss heartbeats). The KoenjiApp CONCERNS.md confirms session management is not tested. SeatKit's CONCERNS.md confirms there is no session management at all.

**Consequences:**
- False locks block legitimate edits during service
- Staff lose trust in presence indicators and ignore them — defeating their purpose
- Ghost sessions accumulate in the database, causing false "who's editing" displays indefinitely

**Prevention:**
- Sessions must have a `lastSeen` timestamp updated every 30 seconds via a cheap background request
- Server-side job (or Postgres trigger) marks sessions as expired if `lastSeen` is older than 90 seconds
- Presence indicators only show non-expired sessions
- On page unload, send a synchronous `navigator.sendBeacon` DELETE request to invalidate the session immediately

**Warning signs:**
- Session table has no `lastSeen` or `expiresAt` column
- No periodic heartbeat call in the web client
- No cleanup job or TTL mechanism on session rows

**Phase mapping:** Implement the heartbeat-and-expiry pattern at the same time as the session table is created. Do not ship the "who's editing" UI without the cleanup mechanism — incomplete presence is worse than no presence.

---

### Pitfall 8: Big-Bang Cutover Risk — Parallel Systems Diverge

**What goes wrong:** KoenjiApp continues running in production (the restaurant cannot stop taking reservations while SeatKit is built). SeatKit is developed against a copy of the production data. By the time SeatKit is ready, the live Firestore has accumulated new reservations, updated records, and deleted entries that the development database does not have. The migration script was tested against the old snapshot. The cutover runs against current data and hits edge cases not seen in testing.

**Why it happens:** The brownfield constraint — a production system that cannot go down — means the migration target moves. Edge cases accumulate: a reservation added with a new emoji field not in the original schema, a cancellation that left a partially updated record, a sales entry from the past year that has a different money format than current records.

**Consequences:**
- Cutover migration fails partway through, leaving the restaurant with a partially-migrated database and no working system during service
- Rollback means discarding all SeatKit work and returning to KoenjiApp — but now the Firestore data diverged from the PostgreSQL state

**Prevention:**
- Run the migration script against a fresh Firestore export every week during development — not just once at the start
- The migration script must be idempotent: running it twice produces the same result (use `INSERT ... ON CONFLICT DO NOTHING` or upserts)
- Define a cutover window during off-peak hours (Sunday morning before lunch service) and rehearse it at least twice against real data exports before the real cutover
- For the 24 hours before cutover, KoenjiApp switches to read-only mode (disable the add/edit reservation buttons) so Firestore data is frozen at a known state

**Warning signs:**
- Migration script has never been run against a Firestore export taken more than a week ago
- Migration script uses `INSERT` without conflict handling
- No defined cutover rehearsal date on the project timeline

**Phase mapping:** The migration script should be written and run against weekly Firestore exports starting from the sprint it is built, not just in the cutover sprint. Add a weekly "migration health check" to the development process.

---

## Minor Pitfalls

Smaller issues that cause friction but not fundamental problems.

---

### Pitfall 9: Gantt/Timeline View Performance at Minute Granularity

**What goes wrong:** The timeline view renders every minute slot as a column across a 6-hour service window (360 columns). With 20 reservations, each spanning multiple columns, the React reconciliation on scroll or on a real-time update re-renders the entire grid. On a low-end phone (the primary device for restaurant staff), this drops below 30fps and the view feels laggy.

**Prevention:**
- Use virtualized rendering — only render the visible time window, not the full day
- Debounce real-time updates: batch incoming reservation changes into a 500ms window before re-rendering the grid
- Use `React.memo` aggressively on reservation blocks; the key must be stable (reservation ID, not index)
- Minute-level granularity for a 6+ hour window is 360+ columns — consider 15-minute slots as the base unit with minute-level detail shown only on hover

**Warning signs:**
- Timeline renders all time slots as DOM nodes regardless of scroll position
- `useEffect` with a real-time subscription triggers `setState` on every incoming message without batching

**Phase mapping:** Design the data structure and rendering strategy before implementation. Performance decisions are much cheaper to make at design time than after the component is built.

---

### Pitfall 10: JSONB CustomerInfo Without GIN Index Blocks Customer Search

**What goes wrong:** Staff need to find "the Tanaka party from last Tuesday." Without a GIN index on the `customer` JSONB column or a generated column for `customer->>'name'`, the query `WHERE customer->>'name' ILIKE '%tanaka%'` performs a full sequential scan across all reservations. With 18 months of historical data (KoenjiApp has been running 9+ months), this is 5,000+ reservations and will be slow.

**Prevention:**
- Add a generated column: `ALTER TABLE reservations ADD COLUMN customer_name TEXT GENERATED ALWAYS AS (customer->>'name') STORED`
- Index it: `CREATE INDEX ON reservations (customer_name)`
- Or add a GIN index on the full JSONB column for flexible querying: `CREATE INDEX ON reservations USING GIN (customer)`
- Do not wait until search is slow to add the index — add it in the same migration that creates the column

**Warning signs:**
- No index on the `customer` column in the Drizzle schema
- Search endpoint uses `ILIKE` directly on JSONB extraction without explaining the query plan

**Phase mapping:** Add the index when the search endpoint is implemented (the missing feature flagged in CONCERNS.md). Not before — no need to index a column that is not searched.

---

### Pitfall 11: Console.log Pollution Masking Real Errors in Production

**What goes wrong:** 51 `console.log` / `console.error` / `console.warn` calls (confirmed in SeatKit CONCERNS.md) produce noise that makes it impossible to distinguish "debug info printed during development" from "actual error condition." When something goes wrong in production, the signal is buried.

**Prevention:**
- Replace all `console.*` calls in `packages/api/` with `fastify.log.*` (Fastify's pino-based structured logger)
- For non-Fastify code (`packages/utils/`, `packages/engine/`), use a lightweight structured logger passed in as a dependency, not imported globally
- Set log level to `warn` in production; `debug` in development via `LOG_LEVEL` env var
- Add an ESLint rule `no-console` to the shared ESLint config — this prevents recurrence

**Warning signs:**
- `packages/api/src/lib/simple-secrets.ts` logs every secret load operation
- Any `console.log(result)` dumping full database rows

**Phase mapping:** Fix as a cleanup task before any phase that adds production deployment. This is not blocking feature work but is blocking a stable production system.

---

### Pitfall 12: TanStack Query Stale Time Too Long for Collaborative Environments

**What goes wrong:** Default `staleTime` of 5 minutes means two staff members on different devices can see reservation states that are 5 minutes apart. During busy service, a reservation could be seated, updated, and completed before the other staff member's view refreshes. Their stale view shows `pending` and they try to seat the party again.

**Prevention:**
- Reduce `staleTime` to 30 seconds for reservation queries
- Once SSE/WebSocket is implemented, set `staleTime` to `Infinity` and invalidate via push events — this is the correct final state
- Add `refetchOnWindowFocus: true` so switching browser tabs triggers a fresh fetch

**Warning signs:**
- `queryClient` default config has `staleTime: 5 * 60 * 1000` unchanged from initial setup
- No `refetchOnWindowFocus` explicitly set

**Phase mapping:** Fix stale time configuration before the real-time collaboration milestone. The 30-second interim is a safe bridge; SSE/WebSocket push is the permanent solution.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Engine package: conflict detection | Pitfall 1 (lost updates) | Add `version` column in same PR as first engine function |
| Migration script: Firestore export | Pitfall 2 (timestamp corruption) | Explicit UTC ISO-8601 serialization, TZ-invariant test |
| Migration script: schema design | Pitfall 3 (JSONB orphan data) | Schema audit pass before any INSERT |
| Multi-restaurant support | Pitfall 4 (generalization trap) | Koenji first, generalize second — no exceptions |
| iOS API integration | Pitfall 5 (API contract drift) | OpenAPI spec generated from routes, integration tests |
| Any schema migration | Pitfall 6 (Drizzle rename bugs) | Review SQL file, additive-only pattern |
| Session management | Pitfall 7 (ghost sessions) | Heartbeat + TTL expiry built together |
| Migration cutover | Pitfall 8 (parallel divergence) | Weekly migration rehearsals against fresh export |
| Timeline/Gantt UI | Pitfall 9 (60fps at minute granularity) | Virtualization strategy before implementation |
| Customer search | Pitfall 10 (JSONB full scan) | Index when search endpoint is built |
| Production deployment | Pitfall 11 (console.log noise) | ESLint `no-console` rule, structured logging |
| Before real-time | Pitfall 12 (stale TanStack cache) | 30s stale time, refetchOnWindowFocus |

---

## Sources

- Traba Engineering: Firestore to Postgres migration lessons (engineering.traba.work)
- Supabase: Migrating from Firestore to Supabase PostgreSQL (supabase.com/docs/guides/platform/migrating-to-supabase/firestore-data)
- Medium: "Functionally migrating from Firestore to PostgreSQL" — Valentin Mouret
- GitHub Drizzle ORM Issue #3826: Column rename + type change produces incomplete migration SQL
- Medium: "8 Drizzle ORM Patterns for Clean, Fast Migrations" — additive migration sequences
- microservices.io: "STOP hurting yourself by doing big bang modernizations" (2024)
- Reintech: "Implementing Optimistic Locking in PostgreSQL" — version column pattern
- Baeldung CS: "The Lost Update Problem in Concurrency Control"
- First Resonance Engineering: "Optimistic updates with concurrency control"
- Marmelab: "Real-Time Resource Locking Using Websockets" — ghost session patterns
- Smashing Magazine: "Using SSE Instead Of WebSockets For Unidirectional Data Flow"
- SeatKit codebase CONCERNS.md (2026-04-06 audit)
- KoenjiApp codebase CONCERNS.md (2026-04-06 audit)
- PostgreSQL documentation: Chapter 13, Concurrency Control (MVCC)
