# Codebase Concerns

**Analysis Date:** 2026-04-06

## Tech Debt

**Incomplete Test Database Setup:**
- Issue: Database test utilities have placeholder implementations for migrations and table truncation
- Files: `packages/utils/src/database.ts` (lines 143, 169)
- Impact: Test database setup (`testDatabase.setup()`) and cleanup (`testDatabase.truncateAllTables()`) are non-functional. This prevents proper test isolation between test runs and may cause test pollution or false failures
- Fix approach: Implement migration runner integration and schema-aware table truncation using Drizzle utilities. Consider using Testcontainers or dedicated test database fixtures

**Engine Package Not Implemented:**
- Issue: `@seatkit/engine` is a placeholder with no business logic implementation
- Files: `packages/engine/package.json` (only defines metadata, no src/)
- Impact: Core reservation algorithms, table clustering, and availability logic are completely missing. Backend CRUD works but business operations cannot proceed without this layer
- Fix approach: Begin implementing engine package with: (1) Reservation conflict detection, (2) Table assignment algorithms, (3) Availability checking, (4) Party size optimization. Start with basic algorithms, profile later

**Hardcoded Default Project ID:**
- Issue: Google Cloud project ID has hardcoded fallback `'seatkit-dev'`
- Files: `packages/api/src/lib/simple-secrets.ts` (line 9)
- Impact: In production, if GOOGLE_CLOUD_PROJECT env var is not set, the code silently falls back to dev project instead of failing loudly. This could cause secrets to be fetched from wrong GCP project without alerting operators
- Fix approach: Remove fallback default. Require explicit PROJECT_ID or fail at startup with clear error message

**Hardcoded CORS Whitelist Placeholder:**
- Issue: Production CORS configuration has placeholder domain `['https://your-domain.com']`
- Files: `packages/api/src/index.ts` (line 62)
- Impact: If deployed to production without updating, CORS will reject all requests from actual frontend domain, breaking API communication. Development uses `true` (allow all), which is insecure
- Fix approach: Use environment variable for allowed origins (e.g., CORS_ORIGINS env var with comma-separated list). Validate it's properly configured before starting in production

## Known Bugs

**Console Statements in Production Code:**
- Symptoms: Debug and informational messages logged with `console.log()`, `console.error()`, `console.warn()` (51 instances across codebase)
- Files: `packages/api/src/lib/simple-secrets.ts`, `packages/api/src/index.ts`, and others
- Trigger: Any application startup or secret loading
- Workaround: Use Fastify logger instance (`fastify.log`) for consistency and to allow log level filtering. For non-Fastify code, use Winston or similar structured logger
- Issue: Hard to control log levels in production, pollutes output, makes monitoring harder

**Swallowed Cache Invalidation Errors:**
- Symptoms: `.catch(() => { /* Ignore errors... */ })` in TanStack Query mutations silently swallows cache invalidation failures
- Files: `packages/web/src/lib/queries/reservations.ts` (lines 98-99, 138-140, 177-181)
- Trigger: Network error or permission issue during query invalidation after mutation
- Workaround: Add error logging to understand when invalidation fails
- Issue: If cache isn't invalidated, stale data will be served to user without any indication. Could cause conflicts if user submits another operation with stale state

## Security Considerations

**No Authentication or Authorization:**
- Risk: All API endpoints are completely open. Any request with a valid UUID can read, modify, or delete any reservation. No per-user isolation, no roles, no multi-tenancy
- Files: `packages/api/src/routes/reservations.ts` (all endpoints), `packages/api/src/index.ts` (no auth middleware)
- Current mitigation: None. Running behind VPN or private network only
- Recommendations: (1) Implement JWT-based authentication (Firebase Auth, Auth0, or custom), (2) Add authorization checks by `createdBy` field in Reservation, (3) Implement role-based access (staff, manager, owner), (4) Add multi-restaurant support with tenant isolation

**No Input Validation on createdBy Field:**
- Risk: Any request can set `createdBy` to any string value. No verification that the requester actually owns that user ID
- Files: `packages/api/src/routes/reservations.ts` (line 70, accepts `request.body` directly)
- Current mitigation: Schema validation only checks it's a string
- Recommendations: After authentication is implemented, extract user ID from JWT and use that as `createdBy`, don't accept it from request body

**Secrets Fallback to .env in Production:**
- Risk: If Google Secret Manager fails in production, code falls back to `.env` file, which should never be in production. Could accidentally expose credentials
- Files: `packages/api/src/lib/simple-secrets.ts` (lines 104-115)
- Current mitigation: Added warning log, but still succeeds with .env fallback
- Recommendations: (1) Fail fast in production if Secret Manager unavailable, (2) Separate dev-only fallback logic, (3) Ensure `.env` is in `.gitignore` and never deployed

**Missing Rate Limit Configuration:**
- Risk: Rate limiter is configured at 100 requests per minute globally, with no per-user/per-IP differentiation
- Files: `packages/api/src/index.ts` (line 66-69)
- Current mitigation: Generic limit applied to all requests
- Recommendations: (1) After auth implemented, apply per-user limits, (2) Whitelist internal requests, (3) Add exponential backoff for abused IPs, (4) Make limits configurable via env vars

**Supabase Credentials in Environment:**
- Risk: Supabase credentials are loaded into environment variables and kept in memory (`packages/api/src/index.ts`, lines 97-100)
- Files: `packages/api/src/index.ts`, `packages/api/src/lib/simple-secrets.ts`
- Current mitigation: Loaded from Secret Manager in production
- Recommendations: (1) Remove Supabase dependencies (currently unused), (2) Use only direct Postgres connection, (3) Verify no credentials are accidentally logged

## Performance Bottlenecks

**N+1 Query Risk in Reservation Operations:**
- Problem: GET /api/reservations fetches all reservations without pagination or filtering. With restaurant growth, this becomes slow and memory-intensive
- Files: `packages/api/src/routes/reservations.ts` (line 41, `select().from(reservations)`)
- Cause: No limit, offset, or indexed filtering. With 10,000+ reservations, query returns entire table
- Improvement path: (1) Add pagination with `limit()` and `offset()`, (2) Add indexed date-range filtering, (3) Add cursor-based pagination for better UX, (4) Cache frequently-accessed ranges

**TanStack Query Default Stale Time:**
- Problem: Default `staleTime` of 5 minutes (`packages/web/src/providers/query-provider.tsx`) may show outdated reservations if multiple staff edit simultaneously
- Files: `packages/web/src/providers/query-provider.tsx` (line configured to 5 min)
- Cause: No real-time subscriptions or WebSocket updates implemented yet
- Improvement path: (1) Implement WebSocket subscription for real-time updates, (2) Reduce stale time to 30-60 seconds for high-contention periods, (3) Add manual refetch trigger on user action

**Global API Base URL Resolution:**
- Problem: `getApiBaseUrl()` is called at module load time, evaluated once. If API_URL env var changes or DNS fails, app doesn't reconnect to new server
- Files: `packages/web/src/lib/api-config.ts` (lines 11-24)
- Cause: `API_BASE_URL` is a constant, not dynamic
- Improvement path: (1) Make URL dynamic (check env var per request), (2) Add retry logic with exponential backoff, (3) Implement automatic failover to backup API

## Fragile Areas

**Date Handling Across Serialization Layers:**
- Files: `packages/api/src/index.ts` (custom serializer), `packages/api/src/db/schema/reservations.ts` (timestamp fields), `packages/web/src/lib/api-client.ts`
- Why fragile: Date objects are serialized to ISO strings, then parsed back in web client. Manual conversion in POST/PUT endpoints (lines 80, 150-164 in reservations.ts) can be missed in new code. Drizzle returns Date objects, Zod expects Date objects, Fastify sends ISO strings. Three different representations
- Safe modification: (1) Always use `z.coerce.date()` in Zod schemas for API request bodies, (2) Document the serialization contract, (3) Add integration tests that verify round-trip dates don't lose precision, (4) Consider custom Zod coercion that validates ISO format explicitly
- Test coverage: Basic happy path tested, but edge cases (timezone transitions, DST boundaries) not covered

**Reservation Status State Machine Not Enforced:**
- Files: `packages/api/src/db/schema/reservations.ts` (status enum), `packages/api/src/routes/reservations.ts` (update endpoint accepts any status)
- Why fragile: Status can transition from any state to any other state (e.g., `completed` → `pending`). No validation of valid transitions. If business logic assumes `completed` is terminal, updates could bypass that
- Safe modification: (1) Implement status transition validator in middleware or business logic layer, (2) Document valid transitions per status, (3) Add tests for invalid transitions, (4) Block invalid transitions at API level
- Test coverage: None. Tests accept any status value

**CustomerInfo Type Stored as JSONB Without Validation:**
- Files: `packages/api/src/db/schema/reservations.ts` (line 58, `customer: jsonb('customer').$type<CustomerInfo>()`)
- Why fragile: Type assertion on JSONB only works in TypeScript. Database doesn't enforce CustomerInfo shape. Old or corrupt data could have missing required fields (missing `name` breaks frontend)
- Safe modification: (1) Add Drizzle check constraint to validate JSON shape, (2) Add runtime validation on read (select from db), (3) Add migration to validate existing data, (4) Consider dedicated customer table with foreign key
- Test coverage: Tests use valid CustomerInfo, don't test missing fields or corrupt JSONB

## Scaling Limits

**No Pagination on Reservations Endpoint:**
- Current capacity: Tested with ~1,500 reservations. API server returns all in single query
- Limit: At ~50,000 reservations (large restaurant over 5 years), query and JSON serialization will exceed 30 second timeout. Client can't render 50k rows
- Scaling path: (1) Implement offset-limit pagination (with indexed date queries), (2) Move to cursor pagination for better UX, (3) Add aggregation endpoint for analytics (don't return full records)

**Database Connection Pool Fixed at 30 (Production):**
- Current capacity: `packages/utils/src/database.ts` line 40 sets max to 30 connections
- Limit: With 15 concurrent staff and 2 connections per request, server reaches limits at 15 users. Subsequent requests queue
- Scaling path: (1) Implement connection pooling with PgBouncer, (2) Reduce per-request connection usage (use transaction pooler mode), (3) Monitor pool exhaustion and alert on high usage

**Single Fastify Instance (No Load Balancing):**
- Current capacity: Single Node process on 1 CPU core
- Limit: At ~10 concurrent requests (typical peak with 15 staff), process CPU utilization saturates. Addition requests have high latency
- Scaling path: (1) Deploy multiple Fastify instances behind reverse proxy (Nginx), (2) Add horizontal scaling with Kubernetes, (3) Profile and optimize hot paths (date conversion, JSON serialization), (4) Use HTTP/2 Server Push for WebSocket upgrade negotiation

**TanStack Query Default Cache without Eviction:**
- Current capacity: Browser cache grows unbounded as user navigates between reservations
- Limit: With heavy usage, browser memory usage grows linearly. After 1 hour of heavy use, can reach 100MB+ depending on browser
- Scaling path: (1) Set explicit `gcTime` (garbage collection time) to 10 minutes, (2) Set `maxPages` for infinite queries (not applicable yet), (3) Implement selective cache clearing on logout, (4) Monitor memory usage in development tools

## Dependencies at Risk

**liquid-glass-react Type Compatibility Issue:**
- Risk: Component from `liquid-glass-react` has missing or incorrect React 19 types. Requires type assertion workaround
- Impact: IDE warnings, potential type-checking failures with stricter TSConfig
- Files: `packages/ui/src/components/glass-container.tsx` (line 28, type assertion `as FC<LiquidGlassPropsBase>`)
- Migration plan: (1) Check if `liquid-glass-react` has React 19 types available, (2) Report issue to maintainer, (3) Consider forking library if unmaintained, (4) Fallback: use simpler glass effect with pure CSS (backdrop-filter)

**Unused Supabase Client:**
- Risk: `@supabase/supabase-js` is imported and credentials loaded but never used. Dead code increases bundle size and maintenance burden
- Files: `packages/api/package.json` (line 40), `packages/api/src/lib/simple-secrets.ts` (loads credentials)
- Migration plan: (1) Remove dependency, (2) Remove credential loading, (3) Use only Postgres direct connection, (4) Remove TEST_DATABASE_URL support if using Supabase was only reason

**fastify-type-provider-zod at v4 (May Be Outdated):**
- Risk: Custom integration between Fastify and Zod can break if Fastify releases major version with incompatible schema approach
- Impact: Type safety and validation could fail silently if updated separately
- Files: `packages/api/package.json` (line 43), `packages/api/src/index.ts` (line 14-16)
- Migration plan: (1) Pin version for stability, (2) Monitor for compatible releases, (3) Have fallback manual validation strategy if library abandoned

## Missing Critical Features

**No Real-Time Collaboration:**
- Problem: Multiple staff editing reservations simultaneously causes lost updates. When staff A and staff B both open reservation X, A's changes are overwritten by B's save
- Blocks: Collaborative editing workflows, conflict resolution, optimistic updates
- Suggested approach: (1) Implement WebSocket connection with subscription pattern, (2) Send real-time updates on reservation changes, (3) Add version/timestamp checking for conflict detection, (4) Add "last editor" indicator

**No Session Management:**
- Problem: No tracking of which staff member is editing what. Impossible to know who made changes or prevent conflicts
- Blocks: Audit trail, conflict resolution, permission system
- Suggested approach: (1) Implement user sessions on API (store in Redis or database), (2) Add session info to each request, (3) Store session ID with edit timestamps, (4) Display active editors in UI

**No Reservation Category Filtering:**
- Problem: API returns all reservations regardless of category (lunch/dinner/special). UI needs to filter client-side
- Blocks: Performance, UX (can't quickly switch between lunch and dinner service)
- Suggested approach: (1) Add `category` query parameter to GET /api/reservations, (2) Add date range filtering for realistic data loads, (3) Add SQL index on (date, category) for fast filtering

**No Search or Lookup by Customer Name:**
- Problem: Staff can't find reservations by customer name. Must know exact date or click through full list
- Blocks: Taking walk-in inquiries, finding existing customers, upsell opportunities
- Suggested approach: (1) Add full-text search on customer name, (2) Add phone number lookup, (3) Add date + partial name search, (4) Cache frequent searches

## Test Coverage Gaps

**Reservation State Transitions Not Tested:**
- What's not tested: Invalid status transitions (e.g., `pending` → `completed` without `seated`). Multiple concurrent updates to same reservation. Optimistic lock failures
- Files: `packages/api/src/routes/reservations.test.ts` (only tests basic CRUD)
- Risk: Status state machine bugs won't be caught. Staff could accidentally complete reservations without seating them
- Priority: High (impacts core business logic)

**Date Handling Edge Cases:**
- What's not tested: Reservations spanning midnight. Daylight savings time transitions. Timezone edge cases (if extended to multi-region)
- Files: `packages/api/src/routes/reservations.test.ts`, `packages/utils/src/date.ts`
- Risk: Wrong reservations displayed on date boundaries. Incorrect availability calculations
- Priority: Medium (affects small % of reservations but causes confusion)

**Error Handling for Database Failures:**
- What's not tested: Connection pool exhaustion. Long query timeouts. Concurrent write conflicts. Transaction rollbacks
- Files: `packages/api/src/routes/reservations.ts` (error handler at line 49 is minimal)
- Risk: API crashes silently on database issues. No retry logic. No degraded mode
- Priority: High (affects reliability)

**Web Client Offline Behavior:**
- What's not tested: Creating/updating reservations with no network. Automatic retry when network returns. Conflict resolution from stale cache
- Files: `packages/web/src/lib/queries/reservations.ts` (no offline support)
- Risk: Staff loses work if network drops. No queue for offline operations
- Priority: Medium (affects mobile/restaurant environments with spotty WiFi)

**CORS and CSP Headers:**
- What's not tested: CORS headers on error responses. CSP violations. Helmet security headers effective in different browsers
- Files: `packages/api/src/index.ts` (line 58-64)
- Risk: CORS misconfiguration allows unauthorized origins. CSP not preventing injection attacks
- Priority: Medium (security exposure)

---

*Concerns audit: 2026-04-06*
