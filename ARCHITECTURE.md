# SeatKit - Architectural Decisions Document

> **Status**: ✅ Complete - All Architectural Decisions Made
> **Created**: 2025-10-25
> **Last Updated**: 2025-10-25
> **Original App**: KoenjiApp (Swift/iOS)
> **Target**: Modern TypeScript Web Application
>
> **Phase 1 (Foundation)**: ✅ Complete
> **Phase 2 (Core Architecture)**: ✅ Complete
> **Phase 3 (Features & Operations)**: ✅ Complete

---

## Purpose

This document captures all major architectural decisions for the SeatKit project - a restaurant reservation management system being ported from a Swift iOS app to a modular, open-source TypeScript ecosystem.

**Why this matters**: These decisions are foundational and expensive to change later. Making them explicit now ensures consistency, prevents technical debt, and enables informed trade-offs.

---

## Table of Contents

1. [Project Structure & Monorepo Strategy](#1-project-structure--monorepo-strategy)
2. [Language & Runtime](#2-language--runtime)
3. [Type System & Validation](#3-type-system--validation)
4. [Database Strategy](#4-database-strategy)
5. [API Architecture](#5-api-architecture)
6. [Backend Framework](#6-backend-framework)
7. [Frontend Framework & Platform](#7-frontend-framework--platform)
8. [State Management](#8-state-management)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Real-Time Synchronization](#10-real-time-synchronization)
11. [File Storage & Media](#11-file-storage--media)
12. [Testing Strategy](#12-testing-strategy)
13. [Build & Deployment](#13-build--deployment)
14. [Internationalization (i18n)](#14-internationalization-i18n)
15. [Logging & Monitoring](#15-logging--monitoring)
16. [Development Workflow](#16-development-workflow)

---

## 1. Project Structure & Monorepo Strategy

### ✅ Decision Made

**Monorepo Tool**: Turborepo with pnpm workspaces

**Package Structure**:

```
seatkit/
├── packages/
│   ├── types/       - Pure TypeScript types + Zod schemas (built FIRST)
│   ├── utils/       - Shared utilities
│   ├── engine/      - Business logic (reservations, layout, clustering)
│   ├── ui/          - shadcn-based Design System components
│   ├── api/         - Backend API/data layer
│   ├── web/         - Web application (responsive for desktop/mobile)
│   └── config/      - Shared configs (ESLint, TS, Prettier, etc.)
└── package.json     (workspace root)
```

**Configuration Approach**: Hybrid - Base configs in `@seatkit/config`, extended per-package as needed

### Rationale

1. **Turborepo**: Provides build caching and orchestration for better DX as the project grows. Easy to set up, minimal overhead for solo development, scales well if team grows.

2. **Package organization**:
   - Separated concerns for modularity and potential future independent publishing
   - `types` as foundation ensures type safety across all packages
   - `ui` as separate package follows design system best practices (shadcn as base)
   - Single `web` app (no mobile/desktop initially) but architecture allows adding later

3. **Build order**: Turborepo automatically handles dependency graph (`types` → `utils`/`engine`/`ui` → `api`/`web`)

### Notes

- Currently solo development, but structure supports team growth
- Not planning mobile/desktop apps initially (just responsive web)
- May publish packages separately in future (validates modular approach)

---

## 2. Language & Runtime

### ✅ Decision Made

**Language**: TypeScript 5.x with maximum strictness

**TypeScript Configuration**:

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

**Runtime**: Node.js 22.x (with >=20.0.0 fallback support)

**Module System**: Pure ESM (`"type": "module"`)

### Rationale

1. **Maximum TypeScript strictness**: Matches the strong typing discipline from the Swift app. Catches errors at compile time rather than runtime. Non-negotiable for a complex domain model with enums, statuses, and business rules.

2. **Node.js 22**: Latest stable release, becomes LTS in October 2025. Fresh start allows using modern Node features. Fallback to >=20.0.0 ensures compatibility with common hosting platforms.

3. **Pure ESM**: Modern standard, future-proof. It's 2025, and most ecosystem supports ESM now. Matches the forward-thinking approach of the original Swift app.

### Engine Requirements

All packages will specify:

```json
{
	"type": "module",
	"engines": {
		"node": ">=20.0.0"
	}
}
```

---

## 3. Type System & Validation

### ✅ Decision Made

**Validation Library**: Zod

**Validation Points**:

- ✅ HTTP API boundaries (requests/responses)
- ✅ Database boundaries (reads/writes)
- ❌ Package boundaries (deferred - only if publishing independently)

**Error Handling Strategy**: Hybrid approach

- `safeParse()` at boundaries (explicit error handling)
- `parse()` internally (throw exceptions, cleaner code)

### Rationale

1. **Zod**: Best TypeScript integration, type inference from schemas, excellent error messages, works everywhere (Node, browser, edge). Natural successor to Swift's Codable.

2. **Validation points**:
   - **HTTP/DB boundaries are critical** - untrusted external data must be validated
   - **Package boundaries skipped for now** - all packages under our control, adds overhead without clear benefit
   - Can revisit if packages are published independently

3. **Hybrid error handling**: Best of both worlds
   - **At boundaries**: Use `safeParse()` for explicit, type-safe error handling
   - **Internally**: Use `parse()` for cleaner code, trusting already-validated data

### Example Pattern

```typescript
// At API boundary (safeParse)
app.post('/reservations', async (req, res) => {
	const result = ReservationSchema.safeParse(req.body);

	if (!result.success) {
		return res.status(400).json({ error: result.error });
	}

	// Pass validated data internally
	const reservation = await reservationService.create(result.data);
	return res.json(reservation);
});

// Internal service (parse or no validation)
class ReservationService {
	async create(data: Reservation) {
		// Data already validated, just use it
		return await db.insert(data);
	}
}
```

### Schema Organization

Schemas will live in `@seatkit/types` alongside TypeScript types:

```typescript
// @seatkit/types/src/reservation.ts
export const ReservationSchema = z.object({...});
export type Reservation = z.infer<typeof ReservationSchema>;
```

---

## 4. Database Strategy

### ✅ Decision Made

**Primary Database**: PostgreSQL via Supabase

**ORM**: Drizzle ORM

**Real-time Features**: Supabase Realtime (Postgres Changes, Broadcast, Presence)

**Offline Support**: Server-authoritative initially (Phase 2 feature for offline)

**Migrations**: Drizzle Kit migrations

### Rationale

1. **PostgreSQL via Supabase**:
   - **Relational model**: Perfect fit for reservation ↔ table ↔ sales relationships
   - **ACID compliance**: Critical for preventing double-booking conflicts
   - **All-in-one**: Database + Real-time + Auth + Storage in one platform
   - **Cost-effective**: $0 for development, $25/month for production (vs $20-30/month Firestore with better features)
   - **Self-hosting option**: Can migrate to self-hosted Postgres later if needed
   - **Open source aligned**: Postgres is open source, aligns with project goals

2. **Supabase Real-time Features**:
   - **Postgres Changes**: Database change subscriptions (like Firestore snapshots) for reservation updates
   - **Broadcast**: Pub/sub for "user X is editing reservation Y" notifications
   - **Presence**: Track which staff members are currently online/active
   - **Globally distributed**: Low-latency real-time updates
   - All three cover the Swift app's real-time collaboration requirements

3. **Drizzle ORM**:
   - **Lightweight**: Minimal runtime overhead compared to Prisma
   - **SQL-like**: Feels like writing SQL, easier to optimize
   - **Type-safe**: Full TypeScript inference without code generation
   - **Relations**: Supports complex joins and relations
   - **Flexible**: Can drop to raw SQL when needed
   - **Prisma comparison**: Lighter, faster, more control vs Prisma's simplicity

4. **Server-authoritative (initially)**:
   - **Simpler MVP**: Avoids complex offline sync conflicts
   - **Real-time sufficient**: Supabase real-time provides <1s updates
   - **Restaurant context**: Staff typically have stable WiFi in restaurant
   - **Future-proof**: Can add offline support in Phase 2 if needed

5. **Scalability**:
   - **Current load**: 144k reads + 1.4k writes per week = easily handled
   - **15 concurrent users**: Well within 200+ connection limit (free tier)
   - **Room to grow**: Can scale to multiple restaurants without issues

### Database Schema Organization

Schemas will be defined in `@seatkit/api` using Drizzle:

```typescript
// @seatkit/api/src/db/schema/reservations.ts
import {
	pgTable,
	uuid,
	timestamp,
	varchar,
	integer,
} from 'drizzle-orm/pg-core';

export const reservations = pgTable('reservations', {
	id: uuid('id').defaultRandom().primaryKey(),
	guestName: varchar('guest_name', { length: 255 }).notNull(),
	partySize: integer('party_size').notNull(),
	reservationTime: timestamp('reservation_time').notNull(),
	// ... more fields
});
```

### Migration Strategy

- **Drizzle Kit**: Automatic migration generation from schema changes
- **Version control**: All migrations committed to git
- **Up/down migrations**: Support rollback if needed
- **Supabase Studio**: Visual schema editor for exploration

### Real-time Architecture

```
┌─────────────┐
│   Clients   │ ← Supabase Realtime (WebSocket)
│ (15 staff)  │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│  Supabase Platform  │
│ ┌─────────────────┐ │
│ │   PostgreSQL    │ │ ← Drizzle ORM
│ │    Database     │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │  Realtime API   │ │
│ │ • Postgres Chg  │ │ ← Auto sync data changes
│ │ • Broadcast     │ │ ← Custom pub/sub messages
│ │ • Presence      │ │ ← Online user tracking
│ └─────────────────┘ │
└─────────────────────┘
       ↑
       │
┌──────┴──────┐
│ Fastify API │
│  (Backend)  │
└─────────────┘
```

### Notes

- **No multi-database abstraction**: Single Postgres database, no repository pattern needed initially
- **Firestore migration**: Not migrating data from current Swift app (parallel systems during development)
- **Offline support deferred**: Can be added in Phase 2 using local SQLite + sync if needed
- **Connection pooling**: Supabase handles automatically with pgBouncer

---

## 5. API Architecture

### Decision Required

How do clients communicate with the backend?

### Options

#### API Style

- **REST** - Traditional, HTTP verbs, resource-based
- **GraphQL** - Query language, single endpoint, client-driven
- **tRPC** - TypeScript RPC, end-to-end type safety, no codegen
- **gRPC** - Protocol buffers, high performance, complex
- **WebSockets** - Real-time, bidirectional

#### Real-time Requirements

From Swift app:

- Firestore listeners for real-time updates
- Session management (active users)
- Live reservation updates

Options:

- **Server-Sent Events (SSE)** - One-way server→client
- **WebSockets** - Bidirectional
- **Polling** - Simple, inefficient
- **Supabase Realtime** - Built-in if using Supabase
- **Pusher/Ably** - Managed real-time services

### Questions to Answer

1. **Primary API style**:
   - [ ] REST (most universal)
   - [ ] tRPC (best DX for TS full-stack)
   - [ ] GraphQL (flexible, complex)
   - [ ] Hybrid (REST + WebSockets)

2. **Real-time approach**:
   - [ ] WebSockets (full bidirectional)
   - [ ] SSE (server→client only)
   - [ ] Database-native (Supabase/Firebase)
   - [ ] Not needed initially

3. **API versioning**:
   - [ ] URL versioning (`/api/v1/...`)
   - [ ] Header versioning
   - [ ] No versioning (breaking changes in major versions)

4. **Documentation**:
   - [ ] OpenAPI/Swagger (REST)
   - [ ] Auto-generated from types (tRPC)
   - [ ] GraphQL introspection
   - [ ] Manual documentation

### Recommendation Needed

**Decision**: _[To be filled in]_

**Rationale**: _[Why this choice?]_

---

## 6. Backend Framework

### ✅ Decision Made

**Framework**: Fastify

**Validation**: Zod + @fastify/type-provider-zod

**WebSocket Support**: @fastify/websocket

**Deployment Target**: Traditional servers (Fly.io, Railway) with flexibility for containers

### Rationale

1. **Fastify Performance**:
   - **~30,000 req/sec**: Fastest mature Node.js framework
   - **Low overhead**: Minimal memory footprint, critical for real-time operations
   - **Async-first**: Built for async/await, matches modern Node.js
   - **Request validation**: ~20% faster than Express for typical workloads

2. **TypeScript Integration**:
   - **Type providers**: Native TypeScript support with inference
   - **@fastify/type-provider-zod**: Perfect integration with our Zod schemas
   - **Type-safe routes**: Request/response types automatically inferred
   - **Better than Express**: Express has poor TS support, requires many @types packages

3. **Real-time Requirements**:
   - **WebSocket support**: @fastify/websocket plugin for custom real-time (if needed beyond Supabase)
   - **Low latency**: Critical for <200ms operation target
   - **Concurrent connections**: Handles 15+ staff members easily
   - **Supabase compatible**: Works perfectly with Supabase Realtime alongside custom endpoints

4. **Developer Experience**:
   - **Plugin ecosystem**: Rich ecosystem (auth, CORS, rate limiting, etc.)
   - **Schema-first**: Matches our validation-heavy approach
   - **JSON Schema**: Native support, works well with Zod
   - **Excellent docs**: Comprehensive documentation and examples

5. **Why NOT the alternatives**:
   - **Express**: Too slow, poor TS support, callback-based
   - **Hono**: Newer, less ecosystem for complex real-time needs
   - **NestJS**: Too opinionated, heavy for our use case, DI overhead not needed
   - **tRPC**: Couples frontend/backend too tightly for open source with potential non-TS clients

### Example Integration with Zod

```typescript
// @seatkit/api/src/routes/reservations.ts
import { FastifyPluginAsync } from 'fastify';
import { Type as T } from '@fastify/type-provider-zod';
import { ReservationSchema } from '@seatkit/types';

export const reservationsRoutes: FastifyPluginAsync = async fastify => {
	fastify.post(
		'/reservations',
		{
			schema: {
				body: ReservationSchema,
				response: {
					201: ReservationSchema,
				},
			},
		},
		async (request, reply) => {
			const reservation = await fastify.db.createReservation(request.body);
			return reply.code(201).send(reservation);
		},
	);
};
```

### Plugin Strategy

Core plugins we'll use:

- **@fastify/cors**: CORS handling for web clients
- **@fastify/helmet**: Security headers
- **@fastify/rate-limit**: Rate limiting for API protection
- **@fastify/websocket**: WebSocket support (if needed beyond Supabase)
- **@fastify/type-provider-zod**: Zod schema integration
- **@fastify/env**: Environment variable validation

### Notes

- **Deployment flexibility**: Works on traditional servers, containers, or serverless (with adapter)
- **Not edge-native**: Requires Node.js runtime (Cloudflare Workers would need different framework)
- **Supabase integration**: Fastify backend uses Supabase for DB + real-time, doesn't replace it

---

## 7. Frontend Framework & Platform

### Decision Required

Which platform(s) and framework(s) for the user interface?

### Target Platforms from Swift App

Currently iOS only. Expanding to:

- [ ] Web (desktop browsers)
- [ ] Web (mobile browsers)
- [ ] Native iOS (keep Swift app? or React Native?)
- [ ] Native Android
- [ ] Desktop (macOS, Windows, Linux)
- [ ] iPad/Tablet optimized

### Options

#### Web Frameworks

- **React** - Most popular, huge ecosystem, flexible
  - **Next.js** - Full-stack, SSR/SSG, React Server Components
  - **Remix** - Full-stack, web fundamentals focused
  - **Vite + React** - Client-only, fast DX

- **Vue** - Progressive, easier learning curve
  - **Nuxt** - Full-stack Vue

- **Svelte** - Compiled, minimal runtime
  - **SvelteKit** - Full-stack Svelte

- **Solid.js** - React-like, better performance

#### Mobile (Cross-Platform)

- **React Native** - Most mature, JavaScript-native
- **Expo** - React Native with better DX
- **Capacitor** - Web app wrapper, use web code
- **Tauri Mobile** - Rust-based, lighter
- **Flutter** - Dart language, not TypeScript

#### Desktop

- **Electron** - Chromium-based, heavy, mature
- **Tauri** - Rust-based, lighter, modern
- **Web app** - Just use the web version

### Questions to Answer

1. **Primary frontend framework**:
   - [ ] React (Next.js for full-stack)
   - [ ] Vue (Nuxt)
   - [ ] Svelte (SvelteKit)
   - [ ] Other: **\_\_\_**

2. **Platform priority** (order matters):
   - [ ] 1. **\_\_\_** 2. **\_\_\_** 3. **\_\_\_**

3. **Mobile strategy**:
   - [ ] React Native/Expo (native feel)
   - [ ] Capacitor (reuse web code)
   - [ ] PWA only (no app store)
   - [ ] Keep Swift app, add Android later

4. **Desktop strategy**:
   - [ ] Electron (full desktop app)
   - [ ] Tauri (lighter desktop app)
   - [ ] Web only (no desktop app)

5. **Code sharing goal**:
   - [ ] Maximum sharing (web + mobile + desktop same code)
   - [ ] Shared logic only (UI differs per platform)
   - [ ] Platform-specific (best UX per platform)

### Recommendation Needed

**Decision**: _[To be filled in]_

**Rationale**: _[Why this choice?]_

---

## 8. State Management

### Decision Required

How do we manage application state, especially with real-time data?

### Context from Swift App

- **ObservableObject** (Combine framework)
- **@Published** properties
- **EnvironmentObject** for dependency injection
- Multiple stores: ReservationStore, TableStore, SessionStore, etc.
- Real-time Firestore listeners

### Options

#### React Ecosystem

- **React Context + useState** - Built-in, simple, can be inefficient
- **Zustand** - Simple, minimal, hooks-based
- **Jotai** - Atomic state, bottom-up
- **Redux Toolkit** - Mature, opinionated, verbose
- **MobX** - Observable-based (closest to Swift's Combine)
- **Recoil** - Atomic state, Facebook-made
- **Valtio** - Proxy-based, mutable-feeling API
- **TanStack Query (React Query)** - Server state management

#### Universal (Framework-Agnostic)

- **XState** - State machines, complex workflows
- **Effector** - Reactive state management

#### Real-Time Sync

- **TanStack Query** - Perfect for server state, polling, optimistic updates
- **SWR** - Similar to React Query, by Vercel
- **Apollo Client** - If using GraphQL
- **tRPC + TanStack Query** - Type-safe queries

### Questions to Answer

1. **Client state management** (UI state, forms, etc.):
   - [ ] React Context + hooks (simple)
   - [ ] Zustand (recommended for most cases)
   - [ ] MobX (similar to Swift's observables)
   - [ ] Other: **\_\_\_**

2. **Server state management** (data from API):
   - [ ] TanStack Query (highly recommended)
   - [ ] SWR
   - [ ] Apollo (if GraphQL)
   - [ ] Manual fetch + state

3. **Real-time updates approach**:
   - [ ] WebSocket connection + state updates
   - [ ] Server-Sent Events + TanStack Query invalidation
   - [ ] Polling with TanStack Query
   - [ ] Database-native real-time (Supabase)

4. **State architecture**:
   - [ ] Multiple stores (like Swift: ReservationStore, TableStore, etc.)
   - [ ] Single store (Redux style)
   - [ ] Atomic/distributed state (Jotai/Recoil)
   - [ ] Feature-based (each feature owns its state)

### ✅ Decision Made

**Decision**: **TanStack Query + Zustand** (Override: Previously planned Redux Toolkit + RTK Query)

**Rationale**:

1. **Separation of Concerns**: TanStack Query handles server state (API data, caching, refetching), Zustand handles UI state (modals, filters, form drafts)
2. **Code Volume**: ~63% less boilerplate (~420 LoC vs ~1,120 LoC with Redux Toolkit across 7 entities)
3. **Developer Experience**: Simpler learning curve, better TypeScript support, modern patterns
4. **Real-time Ready**: Easy integration with Supabase Realtime via query invalidation
5. **Next.js Compatible**: Works seamlessly with React Server Components
6. **Modern Standard**: Industry momentum toward TanStack Query for React server state

**Implementation Details**:

- **Server State**: TanStack Query v5 for all API data fetching, caching, and synchronization
- **UI State**: Zustand v4 for lightweight local state (modals, filters, notifications)
- **Cache Strategy**: Stale-while-revalidate with 5-minute cache time
- **Optimistic Updates**: Built-in support via `onMutate` + `onError` rollback
- **Real-time**: Phase 1 polling → Phase 2 Supabase Realtime + invalidation

**See ADR-003** for complete decision rationale and implementation patterns.

---

## 9. Authentication & Authorization

### Decision Required

How do users sign in? How do we manage permissions?

### Context from Swift App

- Apple Sign-In
- Password protection for sales features
- Session management with multiple devices
- Profile with Apple ID

### Options

#### Authentication Providers

- **Supabase Auth** - If using Supabase, includes OAuth, email, etc.
- **Clerk** - Modern auth, great DX, expensive at scale
- **Auth.js (NextAuth)** - Self-hosted, flexible
- **Firebase Auth** - Mature, free tier
- **Auth0** - Enterprise-grade, expensive
- **Keycloak** - Open-source, self-hosted, complex
- **WorkOS** - B2B SSO focused
- **Roll your own** - JWT + Passport.js

#### Authentication Methods

From Swift app:

- [ ] Apple Sign-In (iOS)
- [ ] Google Sign-In (Android)
- [ ] Email + Password
- [ ] Magic links (passwordless email)
- [ ] Phone/SMS
- [ ] Social OAuth (Facebook, etc.)

#### Authorization Model

- **Role-Based Access Control (RBAC)**
  - Roles: Admin, Manager, Staff, Viewer

- **Attribute-Based Access Control (ABAC)**
  - More granular, policy-based

- **Row-Level Security (RLS)**
  - Database-enforced (Postgres/Supabase)

### Questions to Answer

1. **Auth provider**:
   - [ ] Supabase Auth (if using Supabase DB)
   - [ ] Clerk (easiest DX)
   - [ ] Auth.js (most flexible)
   - [ ] Roll your own

2. **Primary auth methods** (check all):
   - [ ] Email + Password
   - [ ] Apple Sign-In
   - [ ] Google Sign-In
   - [ ] Magic links
   - [ ] Other: **\_\_\_**

3. **Session management**:
   - [ ] JWT tokens (stateless)
   - [ ] Session cookies (stateful)
   - [ ] Refresh token rotation
   - [ ] Device tracking (like Swift app)

4. **Authorization approach**:
   - [ ] RBAC with roles
   - [ ] Database RLS (Postgres)
   - [ ] API-level checks
   - [ ] Combination

5. **Multi-device support** (like Swift app):
   - [ ] Yes, track active devices
   - [ ] Yes, but limit concurrent sessions
   - [ ] No, single device only

### Recommendation Needed

**Decision**: _[To be filled in]_

**Rationale**: _[Why this choice?]_

---

## 10. Real-Time Synchronization

### Decision Required

How do multiple users see live updates? How do we prevent conflicts?

### Context from Swift App

- Firestore real-time listeners
- Session tracking (who's editing what)
- Device tracking
- `isEditing` flags in session

### Options

#### Real-Time Technologies

- **WebSockets**
  - Libraries: Socket.io, ws, uWebSockets
  - Bidirectional, low latency

- **Server-Sent Events (SSE)**
  - One-way (server → client)
  - Simpler than WebSockets
  - Auto-reconnection in browsers

- **Long Polling**
  - HTTP-based
  - Fallback option

- **Database Real-Time**
  - Supabase Realtime (Postgres)
  - Firebase Firestore
  - Rethink DB
  - Electric SQL

#### Conflict Resolution

- **Operational Transform (OT)** - Complex, Google Docs style
- **Conflict-free Replicated Data Types (CRDTs)** - Eventually consistent
- **Last-Write-Wins (LWW)** - Simple, can lose data
- **Optimistic Locking** - Version numbers, reject conflicts
- **Pessimistic Locking** - Lock resources (like Swift app's `isEditing`)

#### Presence & Awareness

- Track who's online
- Track who's editing what
- Show cursor positions (advanced)

### Questions to Answer

1. **Real-time technology**:
   - [ ] WebSockets (bidirectional)
   - [ ] SSE (server → client)
   - [ ] Database real-time (Supabase)
   - [ ] Polling (simple fallback)

2. **Conflict resolution strategy**:
   - [ ] Pessimistic locking (reserve before editing)
   - [ ] Optimistic locking (version numbers)
   - [ ] CRDTs (automatic merging)
   - [ ] Last-write-wins (simple)

3. **Presence system** (like Swift's SessionStore):
   - [ ] Yes, show active users
   - [ ] Yes, show who's editing what
   - [ ] Basic online/offline only
   - [ ] Not needed initially

4. **Offline editing**:
   - [ ] Yes, sync when reconnected
   - [ ] No, require connection
   - [ ] Read-only offline

### Recommendation Needed

**Decision**: _[To be filled in]_

**Rationale**: _[Why this choice?]_

---

## 11. File Storage & Media

### Decision Required

Where do we store profile images, drawings (Scribble), and other media?

### Context from Swift App

- Profile images (avatars)
- Firebase Storage
- Drawing/Scribble data (Apple Pencil)

### Options

#### Storage Services

- **Supabase Storage** - If using Supabase, integrated
- **AWS S3** - Industry standard, cheap, complex
- **Cloudflare R2** - S3-compatible, no egress fees
- **Backblaze B2** - Cheap, simple
- **Vercel Blob** - If using Vercel
- **Firebase Storage** - If keeping Firebase
- **Self-hosted** - MinIO, file system

#### Image Processing

- **Sharp** - Node.js image processing
- **Cloudinary** - Managed service, transformations
- **imgix** - Image CDN with transforms
- **Cloudflare Images** - Simple, CDN-backed

#### Drawing/Canvas Data

From Swift app:

- Apple Pencil drawings
- Table layouts
- Scribbles

Options:

- **SVG** - Vector format, scalable
- **Canvas API + PNG/JPEG** - Raster format
- **Excalidraw format** - JSON-based drawing
- **Store as binary blob**

### Questions to Answer

1. **Primary storage**:
   - [ ] Supabase Storage (if using Supabase)
   - [ ] Cloudflare R2 (cheap, fast)
   - [ ] AWS S3 (standard)
   - [ ] Other: **\_\_\_**

2. **Image processing**:
   - [ ] Server-side (Sharp)
   - [ ] Service (Cloudinary, imgix)
   - [ ] Client-side only
   - [ ] Not needed (store originals)

3. **Drawing/Scribble format**:
   - [ ] SVG (vector)
   - [ ] Canvas + PNG (raster)
   - [ ] JSON-based (Excalidraw/similar)
   - [ ] Research needed

4. **CDN**:
   - [ ] Yes, use CDN for assets
   - [ ] No, serve directly
   - [ ] Built-in (Cloudflare, Vercel)

### Recommendation Needed

**Decision**: _[To be filled in]_

**Rationale**: _[Why this choice?]_

---

## 12. Testing Strategy

### Decision Required

How do we test the application at different levels?

### Testing Pyramid

```
        ╱╲
       ╱  ╲     E2E Tests (Few)
      ╱────╲
     ╱      ╲   Integration Tests (Some)
    ╱────────╲
   ╱          ╲ Unit Tests (Many)
  ╱────────────╲
```

### Options

#### Unit Testing

- **Vitest** - Fast, Vite-based, modern
- **Jest** - Mature, slower, huge ecosystem
- **Node:test** - Built-in Node.js test runner

#### Integration Testing

- **Vitest** - Can do integration tests
- **Supertest** - HTTP API testing
- **Playwright** - Also does API testing

#### E2E Testing

- **Playwright** - Modern, fast, great DX
- **Cypress** - Popular, slower, more mature
- **Puppeteer** - Chrome only, lower-level

#### Component Testing (if React)

- **React Testing Library** - User-centric
- **Vitest + happy-dom** - Fast, no real browser
- **Playwright Component Testing** - Real browser

### Questions to Answer

1. **Unit test framework**:
   - [ ] Vitest (recommended)
   - [ ] Jest
   - [ ] Node:test

2. **E2E test framework**:
   - [ ] Playwright (recommended)
   - [ ] Cypress
   - [ ] None initially

3. **Test coverage goals**:
   - [ ] Business logic: \_\_\_\_%
   - [ ] API endpoints: \_\_\_\_%
   - [ ] UI components: \_\_\_\_%

4. **Testing approach**:
   - [ ] TDD (write tests first)
   - [ ] Test after implementation
   - [ ] Mix based on complexity

5. **CI/CD testing**:
   - [ ] All tests on every commit
   - [ ] Unit tests on commit, E2E on PR
   - [ ] Manual testing

### Recommendation Needed

**Decision**: _[To be filled in]_

**Rationale**: _[Why this choice?]_

---

## 13. Build & Deployment

### Decision Required

How do we build and where do we deploy?

### Build Tools

#### Monorepo Build

- **Turborepo** - Caching, parallel builds
- **Nx** - Powerful, complex
- **npm workspaces** - Basic, no caching

#### Bundlers

- **Vite** - Fast, modern, ESM-first
- **esbuild** - Fastest, less features
- **Rollup** - Library bundling
- **webpack** - Mature, complex, slower
- **tsup** - TypeScript library bundling

### Deployment Options

#### Frontend Hosting

- **Vercel** - Next.js optimized, generous free tier
- **Netlify** - Similar to Vercel
- **Cloudflare Pages** - Fast, edge network
- **AWS Amplify** - If using AWS
- **Self-hosted** - VPS, containers

#### Backend Hosting

- **Fly.io** - Containers, edge network, good free tier
- **Railway** - Simple, containers, DB included
- **Render** - Heroku-like, simple
- **AWS ECS/Fargate** - Containers, complex, powerful
- **Google Cloud Run** - Serverless containers
- **DigitalOcean App Platform** - Simple, good pricing
- **Self-hosted VPS** - Most control, most work

#### Database Hosting

- **Supabase** - Postgres + extras, generous free tier
- **Neon** - Serverless Postgres, auto-scaling
- **PlanetScale** - Serverless MySQL
- **Railway** - Includes Postgres
- **Fly.io** - Can run Postgres
- **Self-hosted**

### Questions to Answer

1. **Build orchestration**:
   - [ ] Turborepo (recommended if complex)
   - [ ] Just npm workspaces (simple)
   - [ ] Nx (enterprise)

2. **Primary bundler**:
   - [ ] Vite (for apps)
   - [ ] tsup (for libraries)
   - [ ] Combination

3. **Frontend deployment**:
   - [ ] Vercel (easiest for Next.js)
   - [ ] Cloudflare Pages (fastest)
   - [ ] Self-hosted
   - [ ] Other: **\_\_\_**

4. **Backend deployment**:
   - [ ] Fly.io (recommended)
   - [ ] Railway (simplest)
   - [ ] AWS/GCP (enterprise)
   - [ ] Self-hosted

5. **Database hosting**:
   - [ ] Supabase (all-in-one)
   - [ ] Neon (just Postgres)
   - [ ] Same as backend (Railway, Fly)
   - [ ] Self-hosted

6. **CI/CD**:
   - [ ] GitHub Actions (free)
   - [ ] GitLab CI
   - [ ] CircleCI
   - [ ] Platform-native (Vercel, Railway auto-deploy)

7. **Environment strategy**:
   - [ ] Dev → Staging → Production
   - [ ] Dev → Production
   - [ ] Preview deployments for PRs (Vercel-style)

### Recommendation Needed

**Decision**: _[To be filled in]_

**Rationale**: _[Why this choice?]_

---

## 14. Internationalization (i18n)

### Decision Required

How do we handle multiple languages?

### Context from Swift App

- Primary language: Italian (it_IT)
- Reservation enum localization
- Multi-language support in Profile

### Options

#### i18n Libraries

- **next-intl** - If using Next.js
- **react-i18next** - Most popular for React
- **FormatJS (react-intl)** - Comprehensive, ICU format
- **Lingui** - Compile-time optimization
- **typesafe-i18n** - TypeScript-first

#### Approach

- **JSON files** - Traditional, simple
- **Namespaces** - Organized by feature
- **ICU MessageFormat** - Plurals, gender, etc.
- **Type-safe keys** - Prevent missing translations

### Questions to Answer

1. **i18n library**:
   - [ ] next-intl (if Next.js)
   - [ ] react-i18next (universal React)
   - [ ] FormatJS (complex needs)
   - [ ] Other: **\_\_\_**

2. **Supported languages** (initial):
   - [ ] Italian (primary)
   - [ ] English
   - [ ] Japanese (given restaurant name "Koenji")
   - [ ] Others: **\_\_\_**

3. **Translation management**:
   - [ ] JSON files in repo
   - [ ] Translation service (Lokalise, Phrase, Crowdin)
   - [ ] Database-driven

4. **Date/time formatting**:
   - [ ] date-fns with locales
   - [ ] Luxon
   - [ ] Day.js
   - [ ] Native Intl API

### Recommendation Needed

**Decision**: _[To be filled in]_

**Rationale**: _[Why this choice?]_

---

## 15. Logging & Monitoring

### Decision Required

How do we track errors, performance, and usage?

### Categories

#### Application Logging

- **Pino** - Fast, structured logging
- **Winston** - Feature-rich, slower
- **Bunyan** - Structured, JSON
- **Console.log** - Development only

#### Error Tracking

- **Sentry** - Industry standard, great DX
- **Rollbar** - Similar to Sentry
- **Bugsnag** - Good, less popular
- **Self-hosted** - GlitchTip (Sentry-compatible)

#### Performance Monitoring

- **Sentry** - Also does performance
- **New Relic** - APM, expensive
- **DataDog** - Enterprise, expensive
- **Grafana + Prometheus** - Self-hosted, complex

#### Analytics

- **PostHog** - Open-source, product analytics
- **Plausible** - Privacy-focused, simple
- **Umami** - Self-hosted, simple
- **Google Analytics** - Traditional, privacy concerns

### Questions to Answer

1. **Logging library**:
   - [ ] Pino (recommended)
   - [ ] Winston
   - [ ] Simple console

2. **Error tracking**:
   - [ ] Sentry (recommended)
   - [ ] Self-hosted alternative
   - [ ] None initially

3. **Performance monitoring**:
   - [ ] Sentry (if using for errors)
   - [ ] Separate APM tool
   - [ ] None initially

4. **Analytics**:
   - [ ] PostHog (full product analytics)
   - [ ] Plausible (simple page views)
   - [ ] None initially
   - [ ] Custom events only

5. **Log aggregation**:
   - [ ] Platform logs (Vercel, Fly.io)
   - [ ] Dedicated service (Papertrail, Logtail)
   - [ ] Self-hosted (Loki)
   - [ ] Not needed initially

### Recommendation Needed

**Decision**: _[To be filled in]_

**Rationale**: _[Why this choice?]_

---

## 16. Development Workflow

### Decision Required

How do we organize day-to-day development?

### Topics

#### Git Workflow

- **Trunk-based** - Main branch, short-lived feature branches
- **Git Flow** - Main, develop, feature, release branches
- **GitHub Flow** - Main + feature branches, simple

#### Branch Naming

- `feature/description`
- `fix/description`
- `chore/description`

#### Commit Convention

- **Conventional Commits** - `feat:`, `fix:`, `chore:`, etc.
- **Free-form** - No convention
- **Enforced** - Commitlint

#### Code Review

- **Required reviews** - How many?
- **Auto-merge** - Dependabot, etc.
- **Draft PRs** - For work in progress

#### Release Strategy

- **Semantic Versioning** - MAJOR.MINOR.PATCH
- **CalVer** - Date-based (2024.10.25)
- **Continuous** - No versions, always latest

#### Changesets/Changelogs

- **Changesets** - Monorepo versioning (recommended)
- **Lerna** - Legacy
- **Manual** - Maintain CHANGELOG.md
- **Auto-generated** - From commits

### ✅ Decision Made

**Package Manager**: pnpm

**Git Workflow**: GitHub Flow (trunk-based development)

**Commit Convention**: Conventional Commits (enforced with Husky + Commitlint)

**Branch Naming**:

- `feat/description` - New features
- `fix/description` - Bug fixes
- `chore/description` - Maintenance tasks
- `docs/description` - Documentation only

**Code Review**: Optional (solo developer, open source project)

**Release Management**: Changesets for monorepo versioning

**Development Environment**: Local installation (simple, no Docker overhead)

### Rationale

1. **pnpm**: Significantly faster than npm, more efficient disk usage, better monorepo support. Industry standard for modern monorepos.

2. **GitHub Flow**: Simple workflow perfect for solo/small team:
   - `main` branch always deployable
   - Create feature branches
   - Open PR (even if solo - good discipline)
   - Merge when ready
   - No complex `develop` branch

3. **Conventional Commits**: Enables automatic changelog generation, clear history, semantic versioning
   - Format: `feat:`, `fix:`, `chore:`, `docs:`, etc.
   - Example: `feat(engine): add table clustering algorithm`
   - Enforced with Husky pre-commit hooks

4. **Changesets**: Industry standard for monorepo releases, handles:
   - Per-package versioning
   - Interdependencies
   - Automatic changelogs
   - npm publishing

5. **Local development**: Simpler than Docker, faster iteration. Docker can be added later for production parity if needed.

### Git Configuration

```bash
# Husky pre-commit hooks will enforce:
- Conventional commit format
- Lint-staged (ESLint, Prettier on changed files)
- Type checking

# Branch protection (when team grows):
- Require PR before merging to main
- Require status checks to pass
```

### Release Process

```bash
# Developer workflow:
pnpm changeset           # Document changes
pnpm changeset version   # Bump versions
pnpm release             # Build + publish to npm
```

---

## Decision Summary Table

Quick reference for all architectural decisions:

| #   | Category           | Decision                                                    | Status     |
| --- | ------------------ | ----------------------------------------------------------- | ---------- |
| 1   | Monorepo Tool      | Turborepo + pnpm workspaces                                 | ✅ Decided |
| 2   | Language/Runtime   | TypeScript 5.x (strict) + Node.js 22 + Pure ESM             | ✅ Decided |
| 3   | Validation         | Zod (HTTP/DB boundaries, safeParse + parse hybrid)          | ✅ Decided |
| 4   | Database           | PostgreSQL (Supabase) + Drizzle ORM                         | ✅ Decided |
| 5   | API Style          | REST + Supabase Realtime                                    | ✅ Decided |
| 6   | Backend Framework  | Fastify + Zod validation                                    | ✅ Decided |
| 7   | Frontend Framework | Next.js 15 + React 19 + shadcn/ui                           | ✅ Decided |
| 8   | State Management   | TanStack Query + Zustand (override: was Redux Toolkit)      | ✅ Decided |
| 9   | Authentication     | Supabase Auth                                               | ✅ Decided |
| 10  | Real-Time          | Supabase Realtime (Postgres Changes + Broadcast + Presence) | ✅ Decided |
| 11  | File Storage       | Supabase Storage                                            | ✅ Decided |
| 12  | Testing            | Vitest + Playwright + React Testing Library                 | ✅ Decided |
| 13  | Deployment         | Docker Compose (dev) → k3s (production)                     | ✅ Decided |
| 14  | i18n               | next-intl (Italian/English/Japanese)                        | ✅ Decided |
| 15  | Monitoring         | Self-hosted: Prometheus + Grafana + Loki + Sentry           | ✅ Decided |
| 16  | Workflow           | pnpm + GitHub Flow + Conventional Commits + Changesets      | ✅ Decided |

### Phase 1 Complete ✅

Foundation decisions locked in:

- **Monorepo**: Turborepo + pnpm
- **Language**: TypeScript (strict) + Node 22 + ESM
- **Validation**: Zod with hybrid error handling
- **Workflow**: GitHub Flow + Conventional Commits

### Phase 2 Complete ✅

Core architecture decisions locked in:

- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **Backend**: Fastify with Zod validation
- **Real-time**: Supabase Realtime (Postgres Changes, Broadcast, Presence)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **API**: REST + WebSocket (Supabase)

### Phase 3 Complete ✅

Application & operations decisions locked in:

- **Frontend**: Next.js 15 + React 19 + shadcn/ui design system
- **State Management**: TanStack Query + Zustand (server/UI state) - _Changed from Redux Toolkit + RTK Query (see ADR-003)_
- **Testing**: Vitest (unit) + Playwright (E2E) + React Testing Library
- **Deployment**: Docker Compose + Tilt (dev) → k3s Kubernetes (prod)
- **i18n**: next-intl for Italian/English/Japanese support
- **Monitoring**: Self-hosted Prometheus + Grafana + Loki + Sentry
- **Development Approach**: Full dev/prod parity with local-first development

---

## Next Steps

After filling in decisions:

1. **Review & validate** - Are decisions consistent? Any conflicts?
2. **Create ADR files** - Detailed Architecture Decision Records for each major choice
3. **Update project structure** - Align with decisions
4. **Set up tooling** - Install and configure chosen tools
5. **Create proof-of-concept** - Validate decisions with working code
6. **Document conventions** - CONTRIBUTING.md, code style guides

---

## References & Resources

- [Original Swift App](~/KoenjiApp)
- [Architecture Analysis](./docs/swift-app-analysis.md) _(to be created)_
- Package README files in `/packages/*/README.md`

---

**Status Legend**:

- 🚧 In Progress
- ✅ Decided
- 🤔 Under Discussion
- ⏸️ Deferred
