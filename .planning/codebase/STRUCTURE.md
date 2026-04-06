# Codebase Structure

**Analysis Date:** 2026-04-06

## Directory Layout

```
seatkit/
├── packages/
│   ├── types/              # Core type definitions and Zod schemas
│   │   ├── src/
│   │   │   ├── schemas/    # Zod validation schemas (reservation, table, etc)
│   │   │   └── utils/      # Result type, validation helpers
│   │   └── package.json
│   ├── utils/              # Shared utilities
│   │   ├── src/
│   │   │   ├── date.ts     # UTC-based date utilities
│   │   │   ├── format.ts   # Money and text formatting
│   │   │   └── database.ts # Database connection pooling, Drizzle instance creation
│   │   └── package.json
│   ├── eslint-config/      # Shared ESLint configuration
│   │   └── package.json
│   ├── ui/                 # Design system components
│   │   ├── src/
│   │   │   ├── components/ # shadcn/ui-based React components
│   │   │   ├── lib/        # Styling utilities (cn, formatStatus, getStatusColor)
│   │   │   └── styles.css  # Global component styles
│   │   └── package.json
│   ├── api/                # Backend API server
│   │   ├── src/
│   │   │   ├── index.ts    # Fastify server bootstrap
│   │   │   ├── db/         # Database layer
│   │   │   │   ├── index.ts         # Drizzle instance creation
│   │   │   │   ├── schema/          # Drizzle ORM table schemas
│   │   │   │   │   ├── reservations.ts
│   │   │   │   │   └── index.ts
│   │   │   │   └── migrations/      # Drizzle migration files
│   │   │   ├── routes/     # Fastify route handlers
│   │   │   │   ├── reservations.ts     # CRUD endpoints for reservations
│   │   │   │   └── reservations.test.ts
│   │   │   ├── schemas/    # API response schemas
│   │   │   │   ├── reservations.ts  # Response type definitions
│   │   │   │   ├── common.ts        # Common response fields
│   │   │   │   └── index.ts
│   │   │   ├── lib/        # Utilities
│   │   │   │   └── simple-secrets.ts # Google Secret Manager integration
│   │   │   └── scripts/    # Database and setup scripts
│   │   │       ├── migrate.ts       # Run migrations (production)
│   │   │       ├── migrate-test.ts  # Run migrations (test)
│   │   │       └── setup-simple-secrets.ts
│   │   └── package.json
│   ├── web/                # Frontend web application
│   │   ├── src/
│   │   │   ├── app/        # Next.js app directory (pages)
│   │   │   │   ├── layout.tsx         # Root layout with providers
│   │   │   │   ├── page.tsx           # Home page
│   │   │   │   ├── globals.css        # Global styles
│   │   │   │   └── reservations/      # Reservations page
│   │   │   │       └── page.tsx
│   │   │   ├── components/     # React components
│   │   │   │   ├── layout/       # Layout components
│   │   │   │   ├── reservations/ # Reservation-specific components
│   │   │   │   ├── test/         # Test utility components
│   │   │   │   └── error-boundary.tsx
│   │   │   ├── lib/        # Utilities and logic
│   │   │   │   ├── api-client.ts     # Type-safe HTTP client wrapper
│   │   │   │   ├── api-config.ts     # API base URL and endpoints config
│   │   │   │   ├── api-types.ts      # API response type schemas
│   │   │   │   ├── errors.ts         # Error utilities
│   │   │   │   ├── api-client.test.ts
│   │   │   │   └── queries/          # TanStack Query hooks
│   │   │   │       ├── reservations.ts  # useReservations, useCreateReservation, etc
│   │   │   │       └── reservations.test.tsx
│   │   │   ├── providers/      # React context providers
│   │   │   │   └── query-provider.tsx # TanStack QueryClient setup
│   │   │   ├── stores/         # Zustand state stores
│   │   │   ├── test/           # Test configuration
│   │   │   │   └── setup.ts    # Vitest setup with JSDOM
│   │   │   └── e2e/            # Playwright E2E tests
│   │   │       └── (test files)
│   │   ├── public/         # Static assets
│   │   ├── playwright.config.ts # E2E test configuration
│   │   ├── next.config.ts      # Next.js configuration
│   │   ├── tailwind.config.ts  # Tailwind CSS configuration
│   │   └── package.json
│   └── engine/             # Business logic (placeholder)
│       └── package.json
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md     # Architecture decisions (see CLAUDE.md)
│   ├── DOMAIN.md           # Business domain model
│   ├── FEATURES.md         # Feature specifications
│   ├── TECHNICAL_CONTEXT.md
│   ├── ADR-001.md          # Architecture decision records
│   └── swift-analysis/     # Analysis of original Swift app
├── .github/
│   └── workflows/          # GitHub Actions CI/CD
├── .planning/              # This file lives here
│   └── codebase/           # GSD codebase analysis documents
├── package.json            # Monorepo root
├── pnpm-workspace.yaml     # Workspace configuration
├── turbo.json              # Turborepo configuration
├── tsconfig.json           # Shared TypeScript configuration
├── eslint.config.js        # Root ESLint configuration
├── CLAUDE.md               # Project context for AI collaboration
└── README.md               # Project overview
```

## Directory Purposes

**packages/types:**
- Purpose: Single source of truth for domain types and validation
- Contains: Zod schemas for Reservation, Table, Room, Session, Sales, Profile, Restaurant; TypeScript type definitions; Result type for functional error handling
- Key files: `src/schemas/reservation.ts`, `src/utils/result.ts`, `src/utils/validation.ts`

**packages/utils:**
- Purpose: Shared utilities used across backend and frontend
- Contains: Date/UTC handling, money formatting with Intl.NumberFormat, database connection pooling, test helpers
- Key files: `src/database.ts` (createDatabaseInstance, testDatabase helpers), `src/date.ts`, `src/format.ts`

**packages/ui:**
- Purpose: Design system components based on shadcn/ui
- Contains: GlassContainer (custom component), styling utilities, status color mapping
- Key files: `src/components/glass-container.tsx`, `src/lib/utils.ts`, `src/styles.css`

**packages/api:**
- Purpose: RESTful backend server with Fastify and PostgreSQL
- Contains: HTTP routes, database ORM (Drizzle), migrations, environment secrets management
- Key files: `src/index.ts` (server), `src/routes/reservations.ts` (CRUD), `src/db/schema/reservations.ts` (table), `src/scripts/migrate.ts` (migrations)

**packages/web:**
- Purpose: Next.js 15 frontend application with React 19
- Contains: Pages, components, API client, TanStack Query hooks, Zustand stores, Playwright E2E tests
- Key files: `src/app/layout.tsx` (root), `src/lib/api-client.ts`, `src/lib/queries/reservations.ts`, `src/providers/query-provider.tsx`

**packages/engine:**
- Purpose: Business logic layer (reservations, table clustering, availability algorithms) - not yet implemented
- Status: Placeholder package reserved for future use

## Key File Locations

**Entry Points:**

- **API Server:** `packages/api/src/index.ts`
  - Boots Fastify, registers plugins, loads secrets, starts listening
  - Exports `createServer()` for testing

- **Web App:** `packages/web/src/app/layout.tsx`
  - Root layout wrapping application with QueryProvider and ErrorBoundary
  - Defines page metadata and global CSS

- **Home Page:** `packages/web/src/app/page.tsx`
  - Simple landing page with link to reservations

**Configuration:**

- **API Routes:** `packages/api/src/routes/reservations.ts`
  - GET /api/reservations (list all)
  - POST /api/reservations (create)
  - PUT /api/reservations/:id (update)
  - DELETE /api/reservations/:id (delete)

- **Database Schema:** `packages/api/src/db/schema/reservations.ts`
  - Drizzle ORM table definition with enums and columns

- **API Config:** `packages/web/src/lib/api-config.ts`
  - API_BASE_URL (from NEXT_PUBLIC_API_URL env var)
  - API_ENDPOINTS object mapping to routes

**Core Logic:**

- **Reservation Domain:** `packages/types/src/schemas/reservation.ts`
  - CreateReservationSchema, UpdateReservationSchema with Zod validation
  - Inferred TypeScript types for type safety

- **API Client:** `packages/web/src/lib/api-client.ts`
  - Generic `apiRequest<T>()` with schema validation
  - Helper functions: apiGet, apiPost, apiPut, apiDelete
  - Custom ApiError class with detailed error info

- **Query Hooks:** `packages/web/src/lib/queries/reservations.ts`
  - useReservations (fetch list)
  - useCreateReservation (create with cache invalidation)
  - useUpdateReservation (update with dual cache invalidation)
  - useDeleteReservation (delete with cache invalidation)

**Testing:**

- **API Unit Tests:** `packages/api/src/routes/reservations.test.ts`
  - Vitest + app.inject() for integration testing
  - Tests CRUD operations, validation, error cases

- **Web Unit Tests:** `packages/web/src/lib/api-client.test.ts`, `packages/web/src/lib/queries/reservations.test.tsx`
  - Vitest with React Testing Library

- **E2E Tests:** `packages/web/e2e/` (Playwright)
  - Multi-browser testing (Chromium, Firefox, WebKit)
  - Mobile viewport testing

## Naming Conventions

**Files:**

- **Components:** PascalCase with `.tsx` extension (e.g., `GlassContainer.tsx`, `ErrorBoundary.tsx`)
- **Utilities:** camelCase with `.ts` extension (e.g., `api-client.ts`, `date.ts`)
- **Tests:** Same name as source with `.test.ts` or `.test.tsx` suffix (e.g., `api-client.test.ts`)
- **Schemas:** Descriptive names matching domain entities (e.g., `reservations.ts`, `common.ts`)
- **Database migrations:** Drizzle auto-generated with timestamp prefix (e.g., `0000_yellow_phoenix.sql`)

**Directories:**

- **Feature domains:** plural, lowercase (e.g., `components/`, `routes/`, `queries/`)
- **Utilities:** functional names (e.g., `lib/`, `utils/`, `schemas/`)
- **Configuration:** explicit descriptors (e.g., `db/schema/`, `db/migrations/`)

**Variables & Functions:**

- **React components:** PascalCase (e.g., `function ReservationsPage()`)
- **Functions:** camelCase (e.g., `apiRequest()`, `createReservation()`)
- **Constants:** UPPER_SNAKE_CASE for globals (e.g., `API_BASE_URL`, `DEFAULT_CONNECTION_OPTIONS`)
- **Types/Interfaces:** PascalCase (e.g., `ApiErrorResponse`, `CreateReservation`)
- **Zod Schemas:** PascalCase with "Schema" suffix (e.g., `CreateReservationSchema`, `ListReservationsResponseSchema`)

## Where to Add New Code

**New REST Endpoint:**

1. Define request/response schemas in `packages/types/src/schemas/` (Zod)
2. Create route handler in `packages/api/src/routes/` (Fastify plugin)
3. Export response schemas in `packages/api/src/schemas/` for client use
4. Write tests in `packages/api/src/routes/*.test.ts` (Vitest)
5. Create query hooks in `packages/web/src/lib/queries/` (TanStack Query)
6. Create page/component in `packages/web/src/app/` or `packages/web/src/components/`

**New Component:**

1. If design system: `packages/ui/src/components/` (export from index.ts)
2. If page-specific: `packages/web/src/components/[feature]/`
3. Export from `packages/ui/src/index.ts` if reusable
4. Include tests in `*.test.tsx` file next to component
5. Use Tailwind CSS from shadcn/ui patterns

**New Utility:**

1. If shared across packages: `packages/utils/src/`
2. If API-specific: `packages/api/src/lib/` or `packages/api/src/utils/`
3. If web-specific: `packages/web/src/lib/`
4. Export from appropriate `index.ts` barrel file
5. Include JSDoc comments with examples

**New Type/Schema:**

1. Add Zod schema to `packages/types/src/schemas/[entity].ts`
2. Export from `packages/types/src/schemas/index.ts`
3. TypeScript type auto-inferred: `type MyType = z.infer<typeof MySchema>`
4. Use schema in: validation (Zod safeParse), database (Drizzle), routes (request validation), client (response validation)

**New Store (Zustand):**

1. Create file in `packages/web/src/stores/[feature].ts`
2. Define store with `create<T>((set) => ({ ... }))`
3. Export hooks from store file
4. Use in components via React hook pattern

## Special Directories

**packages/api/src/db/migrations/:**
- Purpose: Drizzle ORM migration files
- Generated: Automatically by `pnpm db:generate` in @seatkit/api
- Committed: Yes (in git for version control)
- Format: SQL files with metadata JSON
- How to use: `pnpm db:migrate` runs against DATABASE_URL

**packages/web/.next/:**
- Purpose: Next.js build output
- Generated: Automatically by `npm run build`
- Committed: No (in .gitignore)
- Contains: Compiled JS, server functions, static assets

**packages/*/dist/:**
- Purpose: Compiled TypeScript output
- Generated: Automatically by build scripts (tsup for libraries, next build for web)
- Committed: No (in .gitignore)
- Format: CommonJS/ESM JavaScript bundles with type declarations

**packages/*/coverage/:**
- Purpose: Test coverage reports
- Generated: Automatically by `vitest --coverage`
- Committed: No (in .gitignore)
- Format: HTML reports and raw coverage data

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents (you are reading one!)
- Committed: Yes (living documentation)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md

---

*Structure analysis: 2026-04-06*
