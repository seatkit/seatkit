# Roadmap: SeatKit

## Overview

SeatKit is a brownfield rewrite of KoenjiApp, a production-proven iOS reservation system. The existing codebase has basic reservation CRUD, a Next.js web shell, and a working CI pipeline. What remains is building the business logic engine that makes reservations correct, locking down authentication and restaurant configuration, adding real-time collaboration, building the primary staff interfaces (reservation management and sales), migrating Koenji's production data, and shipping a self-hostable deployment story. Each phase delivers a coherent capability that the next phase builds on.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Business Logic Engine** - Core reservation algorithms and complete API surface that make bookings correct
- [x] **Phase 2: Authentication and Configuration** - Staff can log in; admins can configure the restaurant
- [x] **Phase 3: Real-Time Collaboration** - Changes propagate to all connected devices within 1 second
- [ ] **Phase 4: Reservation Management UI** - Staff can manage reservations on any device via timeline and list views
- [ ] **Phase 5: Structured Logging** - Structured logs shipped to GCP Cloud Logging; errors tracked, queryable, and alertable in production
- [ ] **Phase 05.1: GCP Staging Deployment** - Dockerize and deploy to Cloud Run with CI/CD auto-deploy
- [ ] **Phase 05.2: UI Review & Polish** - Review, polish, and elevate all existing UI to production quality
- [ ] **Phase 6: Sales Management** - Managers can enter and review daily and monthly sales data
- [ ] **Phase 7: Data Migration** - Koenji's production Firestore data moves to PostgreSQL without loss
- [ ] **Phase 8: Deployment** - Any restaurant can self-host SeatKit with Docker Compose

## Phase Details

### Phase 1: Business Logic Engine
**Goal**: The reservation system enforces correct behavior — no overlapping table assignments, automatic table selection, walk-in auto-classification, and a stable API contract that the iOS client can rely on
**Depends on**: Nothing (builds on existing CRUD foundation)
**Requirements**: TABLE-01, TABLE-02, TABLE-03, RES-05, API-01, API-02
**Success Criteria** (what must be TRUE):
  1. Creating a reservation automatically assigns tables using the configured priority order, preferring contiguous blocks
  2. The system rejects any reservation that would place two bookings on the same table in an overlapping time window
  3. A staff member can override automatic table assignment by specifying a starting table; the system fills remaining tables contiguously from that point
  4. Walk-in reservations (same-day, same-time) are auto-classified without any manual type selection
  5. All API endpoints are documented in an OpenAPI 3.1 spec accessible at a stable versioned URL prefix
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Bootstrap @seatkit/engine and implement assignment, availability, classification algorithms (TDD)
- [x] 01-02-PLAN.md — Add tables and restaurant_settings Drizzle schemas, migration, and idempotent seed
- [x] 01-03-PLAN.md — Service layer: reservation-service and table-service orchestrating DB + engine
- [x] 01-04-PLAN.md — Route layer: migrate to /api/v1/, wire services, add tables and settings routes
- [x] 01-05-PLAN.md — OpenAPI 3.1 documentation with @fastify/swagger and @scalar/fastify-api-reference

### Phase 2: Authentication and Configuration
**Goal**: Staff can securely log in and stay logged in; admins can configure tables, service hours, categories, and staff accounts; all API endpoints reject unauthenticated requests
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, CONFIG-01, CONFIG-02, CONFIG-03, CONFIG-04
**Success Criteria** (what must be TRUE):
  1. A staff member can log in with email and password and remain logged in across browser refresh and device restart
  2. A staff member can log out from any page, invalidating their session on all devices
  3. All API endpoints return 401 for requests without a valid session token
  4. An admin can add and remove staff members and grant manager role to any staff member
  5. An admin can configure tables (number, capacity, position), service categories, service hours, and table assignment priority order
**Plans**: 7 plans
**UI hint**: yes

Plans:
- [x] 02-01-PLAN.md — Zod v3->v4 upgrade across monorepo + Wave 0 test stubs
- [x] 02-02-PLAN.md — Better Auth backend: auth.ts, mailer, auth-service, fastify plugin, onRequest hook, admin seed
- [x] 02-03-PLAN.md — Schema migration: restaurant_settings extension + Better Auth tables via drizzle-kit
- [x] 02-04-PLAN.md — Config API routes: table admin CRUD, service/priority settings, staff management endpoints
- [x] 02-05-PLAN.md — Frontend auth: auth-client.ts, middleware.ts, login page at /login
- [x] 02-06-PLAN.md — Settings UI: @seatkit/ui components + /settings/tables, /settings/service, /settings/priority pages
- [x] 02-07-PLAN.md — Staff management UI + E2E tests + human verification checkpoint

### Phase 3: Real-Time Collaboration
**Goal**: Multiple staff members can work simultaneously — reservation changes appear on all devices within 1 second, concurrent edit conflicts are detected and surfaced, and session presence shows who is actively editing
**Depends on**: Phase 2
**Requirements**: COLLAB-01, COLLAB-02, COLLAB-03, COLLAB-04
**Status**: Complete (infrastructure verified; browser-observable behaviors deferred to Phase 4 UI)
**Success Criteria** (what must be TRUE):
  1. When staff member A saves a reservation change, the updated reservation appears on staff member B's screen within 1 second without a manual refresh
  2. When two staff members edit the same reservation simultaneously, the second writer receives a conflict response and their optimistic update is visibly rolled back
  3. Staff can see presence indicators showing which colleagues are actively viewing or editing the system
  4. When a user closes the browser tab or goes idle, their presence entry disappears from other devices within 90 seconds
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Optimistic locking: version column on reservations, 409 conflict detection with server state in body
- [x] 03-02-PLAN.md — WebSocket infrastructure: pg-listen subscriber, broadcast route, NOTIFY calls in reservation handlers
- [x] 03-03-PLAN.md — Presence system: session_presence schema + migration, presence service, WebSocket message handlers, cleanup interval
- [x] 03-04-PLAN.md — Frontend integration: WebSocket client singleton, TanStack Query invalidation, conflict modal, presence badge components

### Phase 4: Reservation Management UI
**Goal**: Staff can perform all reservation operations — create, edit, recover, and view reservations — through a timeline/Gantt view and a searchable/filterable list view on any device
**Depends on**: Phase 3
**Requirements**: RES-01, RES-02, RES-03, RES-04, RES-06, RES-07, RES-08, RES-09, RES-10, RES-11, RES-12, RES-13, TABLE-04, TABLE-05, TABLE-06, TABLE-07, VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06
**Success Criteria** (what must be TRUE):
  1. A staff member can create a reservation with all required fields, edit any field, soft-delete it, and recover it — all from the UI without touching the API directly
  2. The timeline view shows per-table rows with color-coded reservation blocks; switching dates and service categories updates the view correctly
  3. The list view supports real-time search by guest name plus filtering by status, date range, party size, and reservation type; results can be sorted and grouped
  4. Staff can view a visual floor plan, drag tables to new positions, and see cluster visualizations showing which tables belong to the same reservation
  5. Reservation colors are derived from the reservation UUID and appear consistently across all staff devices without any assignment step
**Plans**: 7 plans

Plans:
- [x] 04-01-PLAN.md — Schema migration: 6 new reservation columns, soft-delete service, recover route, schema push [BLOCKING]
- [x] 04-02-PLAN.md — Photo upload API: @fastify/multipart, Supabase Storage, POST /reservations/:id/photo
- [x] 04-03-PLAN.md — Shared state layer: uuid-color utility, TanStack hooks, Zustand undo store, Wave 0 test stubs
- [x] 04-04-PLAN.md — Timeline view: page shell with three-tab layout, TimelineBlock, ReservationTimelineView with @tanstack/react-virtual
- [x] 04-05-PLAN.md — Reservation drawer + form: create/edit/delete/recover, ConflictModal + PresenceBadge integration, UndoToast, PhotoUpload
- [x] 04-06-PLAN.md — List view + floor plan: FilterChip, ReservationListView (search/filter/sort/group), FloorPlanView (cluster viz)
- [x] 04-07-PLAN.md — Full test suite, real staff names in PresenceBadge, E2E tests, human verification checkpoint
**UI hint**: yes
**Note**: Phase 3 delivered ConflictModal and PresenceBadge components — integrate into reservation edit form and layout in this phase.

### Phase 5: Structured Logging
**Goal**: Every API request, reservation mutation, and WebSocket event is captured as structured JSON via a pluggable transport layer — stdout by default, with GCP Cloud Logging as the reference production transport; any operator can swap in their own backend (Datadog, Loki, CloudWatch, etc.) via configuration
**Depends on**: Phase 4
**Requirements**: LOG-01, LOG-02, LOG-03, LOG-04
**Architecture note**: Logging must be infrastructure-agnostic. The core emits structured pino JSON to stdout. Transport (where logs go) is a configuration concern, not a code concern. GCP Cloud Logging is the reference implementation (using pino-cloud-logging or equivalent), but self-hosters can point to any sink without touching application code.
**Success Criteria** (what must be TRUE):
  1. All API request/response cycles emit structured JSON logs with request ID, method, URL, status, duration, and user ID — to stdout by default
  2. Unhandled errors and 5xx responses include full stack traces and request context; the GCP transport routes these to Error Reporting automatically
  3. WebSocket connection events (connect, disconnect, message type) are logged with session and user context
  4. Log transport is controlled entirely by environment variables — switching from stdout to GCP Cloud Logging requires no code changes
  5. A self-hoster running Docker Compose can configure log shipping to any sink (stdout, file, remote) without modifying application source
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Logger config factory, Fastify wiring (requestIdHeader, userId enrichment), pino-pretty devDep, GCP severity mapping
- [x] 05-02-PLAN.md — WebSocket lifecycle logging (warn connect/disconnect, debug message type) + reservation mutation audit events

### Phase 05.1: GCP Staging Deployment (INSERTED)

**Goal**: The API and web app run on GCP Cloud Run behind a staging URL; pushes to main auto-deploy via GitHub Actions; Supabase PostgreSQL serves as the staging database
**Depends on**: Phase 5
**Requirements**: SC-01, SC-02, SC-03, SC-04
**Success Criteria** (what must be TRUE):
  1. The Fastify API and Next.js web app each have a Dockerfile that builds and runs correctly
  2. Both services are deployed to GCP Cloud Run and reachable at stable staging URLs
  3. A push to main triggers a GitHub Actions workflow that builds, pushes, and deploys both services automatically
  4. The staging environment connects to Supabase PostgreSQL with secrets managed via GCP Secret Manager
**Plans:** 2/3 plans executed

Plans:
- [x] 05.1-01-PLAN.md — Dockerfiles for API and Web using turbo prune multi-stage builds, .dockerignore, standalone Next.js output
- [x] 05.1-02-PLAN.md — Terraform IaC: Cloud Run v2 services, Artifact Registry, IAM, Secret Manager, domain mapping, DNS
- [ ] 05.1-03-PLAN.md — GitHub Actions deploy workflow with workflow_run trigger, parallel jobs, manual dispatch, human verification

### Phase 05.2: UI Review & Polish (INSERTED)

**Goal**: All existing UI surfaces — authentication pages, settings/admin pages, and reservation management views (timeline, list, floor plan) — are reviewed, polished, and elevated from basic scaffolding to production-quality interfaces with consistent design, responsive layouts, accessibility compliance, and refined UX
**Depends on**: Phase 05.1
**Requirements**: UI-POLISH-01, UI-POLISH-02, UI-POLISH-03, UI-POLISH-04, UI-POLISH-05
**Success Criteria** (what must be TRUE):
  1. All UI pages pass a visual consistency audit — typography, spacing, color usage, and component styling follow a single coherent design language
  2. Every page is responsive and usable on mobile (375px), tablet (768px), and desktop (1280px+) breakpoints without horizontal scrolling or broken layouts
  3. Interactive elements (buttons, inputs, modals, drawers) have visible focus indicators and meet WCAG 2.1 AA contrast ratios
  4. Loading states, empty states, and error states are handled gracefully across all views — no raw spinners, blank screens, or uncaught error boundaries
  5. The timeline view, list view, and floor plan are visually polished with clear information hierarchy, readable text, and intuitive interaction patterns
**Plans**: 4 plans
**UI hint**: yes

Plans:
- [ ] 05.2-01-PLAN.md — Infrastructure: dark mode (next-themes), shadcn CLI init, Tailwind config, ThemeToggle, home redirect, token fixes on standalone components
- [ ] 05.2-02-PLAN.md — shadcn migrations: ReservationDrawer to Sheet, UndoToast to Sonner, tab strip to Tabs
- [ ] 05.2-03-PLAN.md — Token fixes: status badge tokens, Skeleton loading states, ConfirmDialog to Dialog, form responsive, focus rings
- [ ] 05.2-04-PLAN.md — Animation layer: motion, Magic UI, Aceternity copy-paste components, wire animations, reduced motion fallback, human verification

### Phase 6: Sales Management
**Goal**: Managers can enter daily sales data per service period and view monthly and yearly rollups; sales totals are gated behind manager authentication
**Depends on**: Phase 2
**Requirements**: SALES-01, SALES-02, SALES-03, SALES-04, SALES-05, SALES-06
**Success Criteria** (what must be TRUE):
  1. A manager can enter daily sales data for lunch and dinner periods including all KoenjiApp fields (letturaCassa, fatture, yami, yamiPulito, bento, cocai, persone)
  2. Average spend per lunch customer is calculated automatically from total lunch sales divided by persone — no manual calculation needed
  3. Staff can view a monthly summary with per-day breakdown and a yearly summary with per-month breakdown
  4. Sales total figures are only visible after manager authentication — a non-manager staff member cannot see totals
**Plans**: TBD
**UI hint**: yes

### Phase 7: Data Migration
**Goal**: All Koenji production reservation and sales data moves from Firestore and SQLite to SeatKit's PostgreSQL database; migration is idempotent, validated, and verified before cutover
**Depends on**: Phase 2
**Requirements**: MIGRATE-01, MIGRATE-02, MIGRATE-03, MIGRATE-04, MIGRATE-05
**Success Criteria** (what must be TRUE):
  1. Running the migration script imports all reservation data from Firestore into PostgreSQL without manual data entry
  2. Running the migration script a second time produces no duplicates (idempotent, keyed on Firestore document IDs)
  3. Every record passes Zod schema validation before insertion; failures are reported without aborting the script
  4. The migration generates a verification report showing row counts, random samples, and failed records that a human can review before approving cutover
  5. All sales data from Firestore and SQLite is migrated with the same idempotency and validation guarantees as reservation data
**Plans**: TBD

### Phase 8: Deployment
**Goal**: Any restaurant can self-host SeatKit by following documentation and running a single Docker Compose command; no hardcoded Koenji-specific values exist in the codebase
**Depends on**: Phase 4, Phase 5, Phase 6, Phase 7
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. A new restaurant can bring up the full SeatKit stack (nginx, API, web) with a single `docker compose up` command
  2. All restaurant-specific configuration is provided via environment variables — reviewing the codebase reveals no hardcoded restaurant names, URLs, or credentials
  3. Two separate Docker Compose stacks can run on the same host with fully isolated data
  4. A person who has never seen SeatKit can follow the self-hosting documentation to complete a first-run setup including initial restaurant configuration
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 05.1 -> 05.2 -> 6 -> 7 -> 8
Note: Phase 6 (Sales) and Phase 7 (Migration) both depend on Phase 2 and can proceed in parallel with Phase 4 (Reservation UI) once Phase 3 is complete. Phase 5 (Logging) unlocks after Phase 4. Phase 05.1 (GCP Staging) unlocks after Phase 5. Phase 05.2 (UI Review & Polish) unlocks after Phase 05.1.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Business Logic Engine | 5/5 | Complete | 2026-04-07 |
| 2. Authentication and Configuration | 7/7 | Complete | 2026-04-08 |
| 3. Real-Time Collaboration | 4/4 | Complete | 2026-04-08 |
| 4. Reservation Management UI | 7/7 | In Progress | - |
| 5. Structured Logging | 2/2 | Complete | - |
| 05.1 GCP Staging Deployment | 2/3 | In Progress|  |
| 05.2 UI Review & Polish | 0/4 | Not started | - |
| 6. Sales Management | 0/? | Not started | - |
| 7. Data Migration | 0/? | Not started | - |
| 8. Deployment | 0/? | Not started | - |
