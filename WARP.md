# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

SeatKit is an open-source restaurant reservation management system being ported from a Swift iOS app (KoenjiApp) to a modular TypeScript web application. The project is currently in **Phase 2** (Backend API Development) with a fully functional monorepo structure using pnpm workspaces and Turborepo.

**Current Status**: Backend API with GET/POST reservations endpoints, CI/CD pipeline, comprehensive testing.

---

## Quick Start Commands

### Setup

```bash
# Clone and install
git clone https://github.com/matteonassini/seatkit.git
cd seatkit
pnpm install

# Build all packages
pnpm build

# Set up databases
createdb seatkit_dev
createdb seatkit_test

# Run migrations
cd packages/api
pnpm db:migrate
pnpm db:migrate:test
```

### Development

```bash
# Start API server (port 3001)
cd packages/api
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm --filter @seatkit/api test:watch

# Lint code
pnpm lint

# Type check
pnpm typecheck

# Type check in watch mode
pnpm typecheck:watch
```

### Database

```bash
# Generate new migration
cd packages/api
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

---

## Architecture

### Monorepo Structure

```
seatkit/
├── packages/
│   ├── types/          # ✅ Zod schemas + TypeScript types
│   ├── utils/          # ✅ Shared utilities (date, money, database)
│   ├── eslint-config/  # ✅ Shared ESLint configuration
│   ├── api/            # 🚧 Fastify backend + Drizzle ORM (GET/POST working)
│   ├── engine/         # 📝 Business logic (planned)
│   ├── ui/             # 📝 React components (planned)
│   └── web/            # 📝 Next.js frontend (planned)
└── .github/workflows/  # CI/CD with PostgreSQL + GCP auth
```

**Legend**: ✅ Complete | 🚧 In Progress | 📝 Planned

### Tech Stack

- **Language**: TypeScript 5.x (strict mode) + Node.js 22
- **Package Manager**: pnpm 9.12.3 + workspaces
- **Build**: Turborepo 2.x with caching
- **Backend**: Fastify 5.x + Drizzle ORM + PostgreSQL
- **Validation**: Zod 3.x for runtime type safety
- **Testing**: Vitest 4.x with PostgreSQL service
- **CI/CD**: GitHub Actions with lint, typecheck, test, build

---

## Key Design Decisions

### Date Handling

**All date fields use `z.coerce.date()`**:
- **Input**: Accepts ISO 8601 strings
- **Internal**: Works with native Date objects
- **Output**: Fastify custom serializer converts to ISO strings in JSON

```typescript
// Schema
const schema = z.object({
  createdAt: z.coerce.date()
});

// Parses string → Date object
const result = schema.parse({ createdAt: '2025-01-15T14:30:00Z' });
// result.createdAt is Date object

// JSON response automatically serialized to string
// { "createdAt": "2025-01-15T14:30:00.000Z" }
```

### Nullable vs Optional

- **Nullable** (`null`): Database columns that can be NULL
  ```typescript
  notes: z.string().nullable() // Can be null in DB
  ```

- **Optional** (`undefined`): Fields that don't need to be provided
  ```typescript
  notes: z.string().optional() // Can be omitted in API request
  ```

See [docs/ADR-001-undefined-vs-null-handling.md](./docs/ADR-001-undefined-vs-null-handling.md)

### Error Handling

Uses Result types for type-safe error handling:

```typescript
import { ok, err, type Result } from '@seatkit/types';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err('Division by zero');
  return ok(a / b);
}

const result = divide(10, 2);
if (result.ok) {
  console.log(result.value); // 5
} else {
  console.error(result.error);
}
```

---

## Common Patterns

### Creating a New API Endpoint

1. **Define schema** in `packages/types/src/schemas/`
2. **Add route** in `packages/api/src/routes/`
3. **Register route** in `packages/api/src/index.ts`
4. **Write tests** in `packages/api/src/routes/*.test.ts`

Example:

```typescript
// packages/api/src/routes/reservations.ts
import { ReservationSchema } from '@seatkit/types';

export async function reservationRoutes(fastify: FastifyInstance) {
  fastify.get('/api/reservations', {
    schema: {
      response: {
        200: z.object({
          reservations: z.array(ReservationSchema),
        }),
      },
    },
  }, async () => {
    const reservations = await db.select().from(reservationsTable);
    return { reservations };
  });
}
```

### Running Migrations

```bash
# 1. Make changes to schema in packages/api/src/db/schema/
# 2. Generate migration
pnpm db:generate

# 3. Review migration in packages/api/src/db/migrations/
# 4. Apply migration
pnpm db:migrate

# For tests
pnpm db:migrate:test
```

---

## CI/CD Pipeline

GitHub Actions runs on every PR and push to main:

1. **Lint Job**: ESLint on all packages
2. **Type Check Job**: TypeScript strict checking
3. **Test Job**:
   - Spins up PostgreSQL 16 container
   - Authenticates with GCP Secret Manager
   - Runs migrations
   - Executes Vitest tests
4. **Build Job**: Verifies all packages compile

**Required Secrets**:
- `GCP_SERVICE_ACCOUNT_KEY`: JSON key for Secret Manager
- `GCP_PROJECT_ID`: GCP project ID

---

## Troubleshooting

### Tests failing with "Database URL not configured"

Ensure `TEST_DATABASE_URL` is in turbo.json env passthrough:

```json
{
  "tasks": {
    "test": {
      "env": ["NODE_ENV", "TEST_DATABASE_URL", "GOOGLE_CLOUD_PROJECT"]
    }
  }
}
```

### TypeScript can't find package types

Build dependencies first:

```bash
pnpm build
```

### ESLint not running in IDE

Add to `.vscode/settings.json`:

```json
{
  "eslint.useFlatConfig": true,
  "eslint.validate": ["javascript", "typescript"]
}
```

---

## Documentation

- **[README.md](./README.md)** - Project overview & setup guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow
- **[CLAUDE.md](./CLAUDE.md)** - AI context & project state
- **[docs/](./docs/)** - Domain, features, migration notes

---

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/your-feature

# Commit with conventional commits
git commit -m "feat(api): add DELETE /api/reservations/:id"

# Push and create PR
git push origin feat/your-feature
gh pr create
```

**Commit Types**: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`

---

**Last Updated**: 2025-01-26 (CI/CD Pipeline Complete)
