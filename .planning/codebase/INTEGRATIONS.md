# External Integrations

**Analysis Date:** 2026-04-06

## APIs & External Services

**Google Cloud:**
- Google Cloud Secret Manager - Secret and credential management
  - SDK: `@google-cloud/secret-manager` 5.0.1
  - Auth: Application Default Credentials (ADC) or service account key
  - Usage: Load Supabase credentials and database URL
  - Implementation: `packages/api/src/lib/simple-secrets.ts`
  - Secret naming: `seatkit-{env}-{secret-name}` (e.g., `seatkit-prod-database-url`)
  - Fallback: `.env` file in development

**GitHub:**
- GitHub Actions - CI/CD automation
  - Repository: seatkit (SeatKit open source)
  - Workflows: `.github/workflows/ci.yml`, `.github/workflows/release.yml`
  - Triggers: Pull requests to main, push to main
  - Services: Lint, type check, test, build, E2E, release (changesets)

## Data Storage

**Databases:**

- **Supabase PostgreSQL** (Production/Development)
  - Type: PostgreSQL 16 (managed)
  - Connection: `DATABASE_URL` environment variable
  - Format: `postgresql://[user]:[password]@[host]:[port]/[database]`
  - Pooling: Supabase Session Pooler recommended
  - Client: `postgres` 3.4.5 (Node.js driver)
  - ORM: Drizzle ORM 0.36.4
  - Schema location: `packages/api/src/db/schema/`
  - Credentials stored in: Google Cloud Secret Manager (`seatkit-{env}-database-url`)

- **PostgreSQL 16** (Local Testing)
  - Used in: Local development, GitHub Actions CI service container
  - Docker: Official `postgres:16` image
  - Credentials: `postgres:postgres` (CI only)
  - Database: `seatkit_test` (CI)

**File Storage:**
- Not configured - Local filesystem only (future integration point)

**Caching:**
- **TanStack React Query** (Client-side)
  - Caches API responses
  - Automatic staleness management
  - Location: `packages/web/src/lib/api-client.ts`
- No server-side cache configured (Redis/Memcached not integrated)

## Authentication & Identity

**Auth Provider:**
- Not implemented - Custom placeholder (TODO)
- Supabase integration imported but not used:
  - SDK: `@supabase/supabase-js` 2.48.0
  - Credentials: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
  - Implementation location (reserved): `packages/api/src/lib/`
  - Status: Credentials loaded but no auth middleware active

**Current State:**
- API routes are **unprotected** - No authentication required
- Next phase: Implement authentication using Supabase Auth or custom JWT
- Session management: Table schema reserved in domain model

## Monitoring & Observability

**Error Tracking:**
- Not configured - No error tracking service
- Future: Sentry/Rollbar integration point

**Logging:**
- **Fastify built-in logging**
  - Level: 'debug' in development, 'info' in production
  - Format: Pino JSON logs (Fastify default)
  - Location: Console output, no file persistence configured

- **Application logging:**
  - Console-based (`console.log`, `console.error`)
  - Custom context: Emoji prefixes for visibility (🔐, 🚀, ✅, ❌, ⚠️)
  - Location: `packages/api/src/lib/simple-secrets.ts`

**Metrics:**
- Not configured - No metrics collection (Prometheus/DataDog)
- Performance monitoring: Browser DevTools only (frontend)

## CI/CD & Deployment

**Hosting:**
- Not configured - No active deployment service
- Future options: Google Cloud Run, Vercel (Next.js), AWS Lambda, etc.
- Platform target: Any Node.js-compatible environment

**CI Pipeline:**
- **GitHub Actions** (`.github/workflows/ci.yml`)
  - Triggers: Pull requests and push to main
  - Concurrency: Cancel in-progress runs
  - Jobs:
    1. **Lint & Type Check** (no database)
       - ESLint on all packages
       - TypeScript type checking
       - No caching needed
    
    2. **Test** (requires PostgreSQL)
       - PostgreSQL 16 service container
       - Database migration with Drizzle
       - Vitest unit/integration tests
       - Google Cloud authentication for secrets
       - Env: `NODE_ENV=test`, `TEST_DATABASE_URL=postgresql://...`
    
    3. **Build** (depends on lint & test)
       - All packages compiled
       - Turborepo caching enabled
       - Output: `dist/`, `.next/`
    
    4. **E2E Tests** (depends on test & build)
       - Playwright multi-browser (Chromium only in CI)
       - Next.js dev server auto-started
       - Base URL: `http://localhost:3000`
       - API server optional (`API_SERVER_AVAILABLE=false`)
       - Artifacts: Playwright report, screenshots, videos on failure

  - Configuration:
    - Node.js 22.x
    - pnpm 9.12.3
    - Secrets: `GCP_SERVICE_ACCOUNT_KEY`, `GCP_PROJECT_ID`

- **Release Pipeline** (`.github/workflows/release.yml`)
  - Tool: Changesets
  - Triggers: Manual or automated from main branch
  - Publishes to npm registry

## Environment Configuration

**Required env vars (Production):**
- `GOOGLE_CLOUD_PROJECT` - GCP project ID for Secret Manager
- `NODE_ENV` - Set to "production"
- Secrets auto-loaded from Google Cloud Secret Manager:
  - `seatkit-prod-database-url`
  - `seatkit-prod-supabase-url`
  - `seatkit-prod-supabase-publishable-key`
  - `seatkit-prod-supabase-secret-key`

**Required env vars (Development):**
- `.env` file with:
  - `DATABASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `GOOGLE_CLOUD_PROJECT` (optional, defaults to "seatkit-dev")
- `NODE_ENV` - Set to "development"

**Required env vars (Testing):**
- `TEST_DATABASE_URL` - PostgreSQL test database connection
- `NODE_ENV` - Set to "test"
- `GOOGLE_CLOUD_PROJECT` - For GCP authentication in CI

**Optional env vars:**
- `PORT` - API server port (default: 3001)
- `HOST` - API server host (default: 0.0.0.0)
- `NEXT_PUBLIC_API_URL` - Frontend API endpoint (default: http://localhost:3001)

**Secrets location:**
- **Production:** Google Cloud Secret Manager
  - Project: Specified by `GOOGLE_CLOUD_PROJECT` env var
  - Naming pattern: `seatkit-prod-*`
  - Access: Application Default Credentials (ADC) or service account
  
- **Development:** `.env` file (not in git)
  - Location: Repository root
  - Credentials: Local database, test secrets

- **CI/CD:** GitHub Secrets
  - `GCP_SERVICE_ACCOUNT_KEY` - GCP service account JSON (base64 encoded)
  - `GCP_PROJECT_ID` - GCP project ID for Secret Manager access

## Webhooks & Callbacks

**Incoming Webhooks:**
- Not configured - No webhook endpoints
- Future: Stripe webhooks, calendar integrations

**Outgoing Webhooks:**
- Not configured - No outgoing webhook calls
- Real-time updates: Will use WebSocket (`@fastify/websocket` imported but unused)

**Third-party Callbacks:**
- None currently configured

## API Client Integration

**Frontend API Client:**
- Custom implementation: `packages/web/src/lib/api-client.ts`
- Fetch-based with Zod validation
- Features:
  - Type-safe requests with optional Zod schema validation
  - Error parsing and custom `ApiError` class
  - Support for GET, POST, PUT, DELETE methods
  - Request cancellation (AbortSignal)
  - JSON serialization with Date handling
  
- Configuration: `packages/web/src/lib/api-config.ts`
  - Base URL: `NEXT_PUBLIC_API_URL` or default to `http://localhost:3001`
  - Endpoints: `/api/reservations`, `/api/reservations/:id`

**Backend API Server:**
- Fastify server: `packages/api/src/index.ts`
- Router: `packages/api/src/routes/reservations.ts`
- Request/response validation: Fastify Zod type provider
- Serialization: Custom Date serializer converts Date objects to ISO strings
- Error handling: `@fastify/sensible` HTTP error objects
- Health check: `GET /health`

## Data Format Standards

**JSON Serialization:**
- Dates: Serialized as ISO 8601 strings (e.g., `2026-04-06T12:34:56.789Z`)
  - Custom Fastify serializer handles Date → ISO string conversion
  - Unified handling across API, database, and UI layers
  
- Validation: Zod schemas as single source of truth
  - Location: `packages/types/src/schemas/`, `packages/api/src/schemas/`
  - Applied to: API input validation, type definitions, database queries

**Database Format:**
- PostgreSQL native types:
  - Dates: TIMESTAMP (no timezone)
  - Numbers: NUMERIC for precise calculations
  - UUIDs: UUID type for IDs
- Drizzle ORM mapping: TypeScript types match database columns

---

*Integration audit: 2026-04-06*
