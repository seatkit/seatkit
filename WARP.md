# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

SeatKit is an open-source restaurant reservation management system being ported from a Swift iOS app (KoenjiApp) to a modular TypeScript web application. The project is in **Phase 1** (Foundation Complete) with a monorepo structure using pnpm workspaces.

**Current Status**: Early development - packages are placeholders for name reservation and npm publishing workflow testing.

## Commands

Since the project is in early phase, there are currently no build/test/lint commands configured. The packages are placeholders.

### Package Management

```bash
# Install dependencies (when they exist)
pnpm install

# Publish packages to npm (via GitHub Actions)
# Triggered on git tags matching v*
git tag v0.0.2
git push --tags
```

## Architecture

### Monorepo Structure

```
seatkit/
├── packages/
│   ├── types/       - TypeScript types + Zod schemas (foundation, built FIRST)
│   ├── utils/       - Shared utilities
│   ├── engine/      - Business logic (reservations, layout, clustering)
│   ├── ui/          - Design System components (shadcn-based)
│   ├── api/         - Backend API/data layer
│   ├── web/         - Web application (responsive)
│   └── config/      - Shared configs (ESLint, TS, Prettier)
└── package.json     - Workspace root
```

**Build Order**: Dependencies flow `types` → `utils`/`engine`/`ui` → `api`/`web`

### Technology Stack (Decided)

| Category            | Technology       | Configuration                    |
| ------------------- | ---------------- | -------------------------------- |
| **Language**        | TypeScript 5.x   | Maximum strictness enabled       |
| **Runtime**         | Node.js 22.x     | >=20.0.0 fallback, Pure ESM      |
| **Validation**      | Zod              | At HTTP/DB boundaries only       |
| **Monorepo**        | Turborepo + pnpm | Caching and orchestration        |
| **Package Manager** | pnpm             | Fast, efficient, monorepo-native |

### TypeScript Strictness

All packages use maximum TypeScript strictness:

```json
{
	"compilerOptions": {
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"noImplicitOverride": true,
		"exactOptionalPropertyTypes": true
	}
}
```

### Module System

Pure ESM is required for all packages:

```json
{
	"type": "module",
	"engines": {
		"node": ">=20.0.0"
	}
}
```

### Validation Strategy

**Zod** is used for validation at boundaries:

- ✅ HTTP API boundaries (requests/responses) - use `safeParse()` for explicit error handling
- ✅ Database boundaries (reads/writes) - use `safeParse()` for explicit error handling
- ❌ Package boundaries - deferred, all packages are internal
- Internally use `parse()` for cleaner code with already-validated data

**Schema Organization**: Schemas live in `@seatkit/types` alongside TypeScript types

```typescript
// Example pattern
export const ReservationSchema = z.object({...});
export type Reservation = z.infer<typeof ReservationSchema>;
```

### Pending Architecture Decisions (Phase 2+)

The following are **not yet decided** - do not assume implementations:

- Database (considering PostgreSQL, SQLite, Supabase)
- API Style (considering REST, tRPC, GraphQL)
- Backend Framework (considering Fastify, Hono, NestJS)
- Frontend Framework (considering Next.js, Remix, SvelteKit)
- State Management
- Authentication/Authorization
- Real-time Synchronization
- File Storage
- Testing Framework
- Deployment Platform
- i18n Library
- Logging/Monitoring

Refer to `ARCHITECTURE.md` for detailed options and considerations for each decision.

## Development Workflow

### Git Strategy

**GitHub Flow** (trunk-based):

- `main` branch is always deployable
- Create feature branches for work
- Open PRs even for solo work (good discipline)
- Merge when ready

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `chore/description` - Maintenance tasks
- `docs/description` - Documentation only

### Commit Convention

**Conventional Commits** (will be enforced with Husky + Commitlint):

- Format: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`
- Example: `feat(engine): add table clustering algorithm`
- Example: `fix(api): resolve reservation conflict validation`

### Release Management

**Changesets** for monorepo versioning:

```bash
pnpm changeset           # Document changes
pnpm changeset version   # Bump versions
pnpm release             # Build + publish to npm
```

## Domain Model (from Swift App)

The original Swift app provides insight into the domain model that will be ported:

### Core Entities

- **Reservations**: Customer bookings with status tracking, time slots, party size
- **Tables**: Restaurant seating with layout management, clustering
- **Sessions**: Active user tracking, device management, editing state
- **Profiles**: User accounts with Apple ID integration
- **Layout**: Table arrangements, clustering algorithms, visual positioning

### Key Business Logic

- **Clustering**: Grouping tables for larger parties
- **Real-time Updates**: Multi-device synchronization
- **Offline-first**: Local SQLite + Firestore cloud sync (dual-write)
- **Status Management**: Complex reservation state machine
- **Session Tracking**: `isEditing` flags to prevent conflicts

### Enums & Types

Strong typing is critical - the Swift app uses extensive enums for:

- Reservation status
- Table types
- User roles
- Localized strings (Italian primary)

## Important Files

- **ARCHITECTURE.md** - Comprehensive architectural decisions document with options and rationale
- **SECURITY.md** - Security policy, vulnerability reporting (security@seatkit.dev)
- **LICENSE** - Apache 2.0 license
- **.npmrc** - npm registry configuration for @seatkit scope

## Publishing

Packages are published to npm under the `@seatkit` scope with public access. The GitHub Actions workflow (`.github/workflows/release.yml`) handles automated publishing when tags matching `v*` are pushed.

## Origin Context

**Original Application**: KoenjiApp (Swift/iOS)

- Mature Swift/SwiftUI iOS app
- Uses Combine framework (ObservableObject, @Published)
- Firebase Firestore for cloud sync
- SQLite for local storage (actor-based)
- Apple Sign-In authentication

**Port Goals**:

- Maintain strong typing discipline from Swift
- Preserve business logic fidelity
- Enable web/multi-platform access
- Open source the platform
