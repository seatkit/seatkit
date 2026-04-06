# Architecture

**Analysis Date:** 2026-04-06

## Pattern Overview

**Overall:** Layered monorepo with strict separation of concerns across NPM packages

**Key Characteristics:**
- Pure ESM TypeScript with maximum strictness
- Dependency flow: types → utils/ui → api/web (enforced by Turborepo)
- API-driven separation: frontend communicates only via REST HTTP
- Runtime validation at boundaries using Zod schemas
- React 19 frontend with server-side state management (TanStack Query + Zustand)

## Layers

**Foundation (@seatkit/types):**
- Purpose: Single source of truth for domain types and runtime validation
- Location: `packages/types/src/`
- Contains: Zod schemas, TypeScript type definitions, Result type utilities, validation helpers
- Depends on: zod only
- Used by: All other packages - absolute dependency

**Utilities (@seatkit/utils):**
- Purpose: Shared domain utilities for date handling, formatting, database setup
- Location: `packages/utils/src/`
- Contains: Date/UTC utilities, money formatting, database connection pooling, test helpers
- Depends on: @seatkit/types, postgres, drizzle-orm
- Used by: @seatkit/api, @seatkit/web (for api-client)

**UI Design System (@seatkit/ui):**
- Purpose: shadcn/ui-based component library and styling utilities
- Location: `packages/ui/src/`
- Contains: React components (GlassContainer), styling utilities, status formatters
- Depends on: React, Tailwind CSS, class-variance-authority
- Used by: @seatkit/web only

**Database & ORM (@seatkit/api - db layer):**
- Purpose: Drizzle ORM schema and database instance management
- Location: `packages/api/src/db/`
- Contains: PostgreSQL schema definitions (tables, enums), migrations, connection pooling
- Depends on: @seatkit/types, drizzle-orm, postgres
- Used by: @seatkit/api routes only

**API Routes (@seatkit/api - routes layer):**
- Purpose: Fastify HTTP endpoints with Zod validation and error handling
- Location: `packages/api/src/routes/`
- Contains: CRUD endpoints, request/response validation, business logic integration
- Depends on: @seatkit/types, @seatkit/api/db, Fastify, Zod
- Used by: External HTTP clients (@seatkit/web, Playwright tests, etc.)

**Frontend (@seatkit/web):**
- Purpose: Next.js 15 web application with React 19
- Location: `packages/web/src/`
- Contains: Pages, components, API client, queries (TanStack Query hooks), stores (Zustand)
- Depends on: @seatkit/types, @seatkit/utils, @seatkit/ui, React, Next.js, TanStack Query
- Used by: End users (browsers)

## Data Flow

**HTTP Request Flow (Read):**

1. User interaction in React component (e.g., `packages/web/src/components/`)
2. Component calls hook from `packages/web/src/lib/queries/` (e.g., `useReservations()`)
3. Hook uses `apiGet()` from `packages/web/src/lib/api-client.ts`
4. apiClient fetches from API_BASE_URL to `/api/reservations`
5. Fastify route handler in `packages/api/src/routes/reservations.ts` receives request
6. Route queries database via Drizzle ORM instance (`packages/api/src/db/index.ts`)
7. Database returns rows, Fastify serializer converts Date objects to ISO strings
8. Response is validated against schema from `packages/api/src/schemas/`
9. TanStack Query caches response, component re-renders with new data

**HTTP Request Flow (Write):**

1. User submits form in React component
2. Component calls mutation hook (e.g., `useCreateReservation()`)
3. Mutation calls `apiPost()` with body data
4. Request body validated by Fastify against Zod schema
5. Date strings in body converted to Date objects
6. Drizzle inserts/updates/deletes in database
7. Database returns modified rows with timestamps
8. Response serialized (Dates → ISO strings) and sent
9. TanStack Query invalidates affected cache keys, UI updates

**State Management:**

- **Server State (API data):** TanStack Query manages fetching, caching, synchronization
  - Query keys: `['reservations', ...]` pattern with hierarchy
  - Stale time: 5 minutes, refetch on window focus disabled
  - Cache invalidation triggers automatic refetch
- **UI State (form inputs, modals, etc):** Zustand stores in `packages/web/src/stores/`
- **Theme/Configuration:** React Context (future)

## Key Abstractions

**Reservation Domain:**
- Purpose: Represents customer reservations with temporal and status tracking
- Examples: `packages/types/src/schemas/reservation.ts`, `packages/api/src/db/schema/reservations.ts`
- Pattern: Zod schema defines validation rules, Drizzle table reuses type inference, API routes validate requests
- Data model: date (when), duration (how long), customer (who), partySize (how many), status (pending/confirmed/seated/completed/cancelled), category (lunch/dinner/special/walk_in)

**API Client:**
- Purpose: Type-safe HTTP wrapper with automatic schema validation
- Examples: `packages/web/src/lib/api-client.ts`
- Pattern: Generic `apiRequest<T>()` with optional Zod validation, throws `ApiError` with response details
- Helpers: `apiGet()`, `apiPost()`, `apiPut()`, `apiDelete()`

**Result Type (Functional Error Handling):**
- Purpose: Avoid exceptions in domain logic, explicit error paths
- Examples: `packages/types/src/utils/result.ts`
- Pattern: `type Result<T, E> = { success: true; value: T } | { success: false; error: E }`
- Usage: Can be used in @seatkit/engine when business logic layer is implemented

**Date Handling:**
- Purpose: Unified approach to dates across all boundaries
- Pattern: Store as Date objects in TypeScript, validate with `z.coerce.date()`, serialize to ISO strings in HTTP responses
- Utilities: `packages/utils/src/date.ts` for UTC-aware operations
- Fastify has custom serializer that converts all Date instances to ISO strings automatically

**Query Key Factory:**
- Purpose: Organize TanStack Query cache keys hierarchically
- Example: `packages/web/src/lib/queries/reservations.ts` - `reservationKeys` object
- Pattern: Nested arrays (`['reservations', 'list', filters]`) enabling selective cache invalidation
- Benefit: Invalidate all reservations lists without invalidating detail queries

## Entry Points

**API Server:**
- Location: `packages/api/src/index.ts`
- Triggers: `npm run dev` (development via tsx watch), `npm run start` (production)
- Responsibilities: Boot Fastify server, register plugins (cors, helmet, rate-limit, sensible), setup Zod validation and Date serialization, load secrets from Google Secret Manager or .env, listen on HOST:PORT
- Configuration: PORT (default 3001), HOST (default 0.0.0.0), NODE_ENV (development/production), Google Cloud Project ID

**Web Application:**
- Location: `packages/web/src/app/layout.tsx` (root), `packages/web/src/app/page.tsx` (home)
- Triggers: `npm run dev` (Next.js dev server), `npm run build && npm run start` (production)
- Responsibilities: Setup React providers (QueryProvider wraps app with TanStack Query client), render root layout with ErrorBoundary, serve home page with navigation to features
- Environment: NEXT_PUBLIC_API_URL (defaults to http://localhost:3001)

**Database Migrations:**
- Location: `packages/api/src/scripts/migrate.ts` (production), `packages/api/src/scripts/migrate-test.ts` (tests)
- Triggers: `npm run db:migrate` in @seatkit/api
- Responsibilities: Load DATABASE_URL from environment, run Drizzle migrations against PostgreSQL
- Configuration: Migrations stored in `packages/api/src/db/migrations/`

**Testing:**
- Unit/Integration: Vitest (`npm run test` in each package)
- E2E: Playwright (`npm run test:e2e` in @seatkit/web)
- Test entry point for API: `packages/api/src/routes/reservations.test.ts` (Vitest with createServer())

## Error Handling

**Strategy:** Multi-layer approach with HTTP errors as public API contract

**HTTP Layer (Fastify Routes):**
- Throw `fastify.httpErrors.*()` for known conditions (404 notFound, 400 badRequest, 500 internalServerError)
- Fastify automatically catches thrown HTTP errors and converts to proper status code + JSON response
- Example: `throw fastify.httpErrors.notFound('Reservation not found')` → HTTP 404 with error payload
- No try-catch needed for HTTP error throws - framework catches them

**Input Validation:**
- Zod `safeParse()` used explicitly at request boundaries
- Fastify type provider validates request body/params against schema
- Invalid input rejected before route handler executes (400 Bad Request)

**Database Layer:**
- Database errors propagate up as exceptions
- Routes catch and throw HTTP errors instead
- Transaction rollback automatic on error

**Client Layer (Web):**
- `ApiError` class thrown on non-200 responses
- Contains status, statusText, error details (error, message, details)
- Caller handles with try-catch or logs via React Query error handler

## Cross-Cutting Concerns

**Logging:** 
- API uses Fastify's built-in logger (pino)
- Level: 'debug' in development, 'info' in production
- Routes log request lifecycle: `fastify.log.info()`, `fastify.log.error()`
- Database queries: implicit via drizzle-orm in development

**Validation:** 
- Zod at HTTP boundaries (request body/params)
- Type inference from schemas provides compile-time safety
- Runtime validation ensures untrusted input cannot corrupt domain state

**Authentication:**
- Not yet implemented
- Planned in Phase 2: JWT via headers
- All routes currently public
- Placeholder: `createdBy` field tracks user who created resource (manually passed)

**Error Responses:**
- Standard format: `{ error?: string, message: string, details?: string[] }`
- HTTP status codes: 200 (success), 201 (created), 404 (not found), 400 (bad request), 500 (server error)
- CORS: Allow all origins in development, restricted in production

---

*Architecture analysis: 2026-04-06*
