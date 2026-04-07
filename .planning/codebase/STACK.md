# Technology Stack

**Analysis Date:** 2026-04-06

## Languages

**Primary:**
- TypeScript 5.6.3 - Entire codebase, strict mode enabled
- JavaScript (ESM) - Configuration files, Node.js scripts
- HTML/CSS - Next.js templates and Tailwind styling

**Secondary:**
- SQL - PostgreSQL database schemas and migrations via Drizzle

## Runtime

**Environment:**
- Node.js 22.x (monorepo requirement: `>=22.0.0`)
- Node.js 20.x (API package: `>=20.0.0`)
- Browser: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari (via Playwright)

**Package Manager:**
- pnpm 9.12.3 (locked in root package.json)
- Monorepo workspaces with pnpm
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- **Fastify** 5.1.0 - REST API backend server
  - Type provider: `fastify-type-provider-zod` 4.0.2 for Zod integration
  - Location: `packages/api/src/index.ts`

- **Next.js** 15.0.3 - Web frontend framework
  - React 19.0.0 - UI component framework
  - Tailwind CSS 3.4.15 - Utility-first CSS
  - Location: `packages/web/`

**Database:**
- **Drizzle ORM** 0.36.4 - Type-safe database layer
  - PostgreSQL dialect
  - Migrations: `packages/api/src/db/migrations/`
  - Config: `packages/api/drizzle.config.ts`
  - Database client: `postgres` 3.4.5

**State Management (Frontend):**
- **TanStack React Query (React Query)** 5.62.3 - Data fetching, caching, synchronization
  - Dev tools: `@tanstack/react-query-devtools` 5.62.3
  - Usage: `packages/web/src/lib/api-client.ts` for API integration
  
- **Zustand** 5.0.2 - Lightweight UI state management
  - Stores location: `packages/web/src/stores/`

**Validation & Schema:**
- **Zod** 3.23.8 - Runtime schema validation across all packages
  - Schemas location: `packages/types/`, `packages/api/src/schemas/`
  - Used for: API request/response validation, Fastify type safety

**Build & Development:**
- **Turbo** 2.2.3 - Monorepo build orchestration
  - Config: `turbo.json`
  - Cached tasks: build, lint, typecheck, test
  - Parallel execution with `NODE_ENV`, `TEST_DATABASE_URL`, `GOOGLE_CLOUD_PROJECT` environment passing

- **tsup** 8.3.5 - TypeScript build tool
  - Config: `packages/api/tsup.config.ts`
  - Output: ESM format, tree-shaking enabled
  
- **tsx** 4.19.2 - TypeScript Node.js executor
  - Used for: Database migrations, setup scripts

- **Prettier** 3.3.3 - Code formatting
  - Config: `.prettierrc.js`
  - Opinionated: tabs, single quotes, trailing commas, 80-char width

- **ESLint** 9.15.0 - Code linting
  - Config: `eslint.config.js` (flat config)
  - Custom config package: `@seatkit/eslint-config`
  - Shared across monorepo

**Testing:**
- **Vitest** 4.0.3 (root), 2.1.4 (API) - Unit/integration test framework
  - Config: `packages/api/vitest.config.ts`, `packages/web/vitest.config.ts`
  - Shared config: `vitest.shared.ts`
  - Coverage: `@vitest/coverage-v8` 4.0.3
  - Libraries: `@testing-library/react` 16.3.0, `@testing-library/jest-dom` 6.9.1
  - DOM: `jsdom` 27.0.1

- **Playwright** 1.49.0 - E2E testing
  - Config: `packages/web/playwright.config.ts`
  - Multi-browser: Chromium, Firefox, WebKit
  - Mobile: Pixel 5, iPhone 12
  - Test location: `packages/web/e2e/`

## Key Dependencies

**Critical:**

- **@fastify/sensible** 6.0.3 - Standardized HTTP error handling
  - Used for: Consistent error responses across API
  
- **@fastify/cors** 10.0.1 - CORS middleware
  - Config: Wildcard in dev, restricted origin in production
  
- **@fastify/helmet** 12.0.1 - Security headers
  - Protection: XSS, clickjacking, MIME type sniffing

- **@fastify/rate-limit** 10.1.1 - Rate limiting
  - Limit: 100 requests per minute

- **@fastify/env** 5.0.1 - Environment variable schema validation

- **@fastify/websocket** 11.0.1 - WebSocket support
  - Future use: Real-time collaboration features

**Infrastructure:**

- **@google-cloud/secret-manager** 5.0.1 - Secrets management
  - Service: Google Cloud Secret Manager
  - Usage: Load Supabase credentials, database URL in production
  - Location: `packages/api/src/lib/simple-secrets.ts`

- **@supabase/supabase-js** 2.48.0 - Supabase client (imported but not actively used)
  - Placeholder for future authentication/real-time features

- **postgres** 3.4.5 - PostgreSQL driver
  - Used by: Drizzle ORM and connection pooling
  - Supabase Session Pooler connection string format

**Frontend Libraries:**

- **@radix-ui/** - Headless UI components (via shadcn/ui dependency tree)
- **autoprefixer** 10.4.20 - PostCSS plugin for vendor prefixes
- **postcss** 8.4.49 - CSS transformation tool

## Configuration

**Environment:**

**Development:**
- Loaded from `.env` file (local fallback)
- Environment variables:
  - `NODE_ENV`: Set to "development"
  - `GOOGLE_CLOUD_PROJECT`: Defaults to "seatkit-dev"
  - `PORT`: Defaults to 3001 (API)
  - `HOST`: Defaults to 0.0.0.0
  - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL` (from Google Secret Manager or .env)
  - `NEXT_PUBLIC_API_URL`: Frontend API endpoint (defaults to http://localhost:3001)

**Production:**
- Secrets loaded from Google Cloud Secret Manager
- Environment: `seatkit-prod-*` secret naming convention
- Fail-fast if secrets unavailable
- CORS origin restricted to production domain

**Testing:**
- `TEST_DATABASE_URL`: PostgreSQL test database
- `NODE_ENV`: Set to "test"
- Auto-detected by Turbo config

**Build:**

- TypeScript compilation:
  - Target: ES2022 (browser), Node 20 (API)
  - Strict mode: Enabled
  - Module: ESNext with Node resolution
  - Output: TypeScript declaration files (.d.ts)

- Next.js build:
  - Strict TypeScript checking enabled
  - Strict ESLint during builds
  - Typed routes enabled
  - Output: `.next/` directory

- Drizzle Migrations:
  - Dialect: PostgreSQL
  - Schema location: `packages/api/src/db/schema/*`
  - Migrations output: `packages/api/src/db/migrations/`
  - Strict mode enabled

## Platform Requirements

**Development:**
- Node.js 22.x
- pnpm 9.x
- PostgreSQL 16 (for local testing or Docker)
- Google Cloud SDK (optional, for local secrets management)

**Production:**
- Node.js 20.x or 22.x
- Google Cloud Project (for Secret Manager)
- Supabase PostgreSQL instance (Session Pooler recommended)
- HTTPS/SSL certificate for domain
- Reverse proxy (nginx/Cloudflare) recommended for API

**CI/CD:**
- GitHub Actions (workflows in `.github/workflows/`)
- PostgreSQL 16 service container for tests
- Google Cloud authentication via service account key
- Playwright browser binaries (chromium only in CI for speed)

---

*Stack analysis: 2026-04-06*
