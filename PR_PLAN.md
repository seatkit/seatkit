# SeatKit Web Package Development Plan

> **Status**: In Progress - PR #17
> **Last Updated**: 2025-10-30
> **Strategy**: 6 PRs of ~400-600 LoC each, multi-tenant from start

---

## 🎯 Goals

Build a complete web-based reservation management system with:
- Next.js 15 + React 19 frontend
- TanStack Query + Zustand state management
- Full CRUD operations for reservations
- E2E testing with Playwright
- Multi-tenant architecture (`koenji.seatkit.dev`, etc.)
- Deployed on Cloudflare Pages

---

## 🏗️ Architecture Decisions

- **Framework**: Next.js 15 (App Router) + React 19
- **State Management**: TanStack Query (server state) + Zustand (UI state)
  - ⚠️ **Override**: Changed from Redux Toolkit + RTK Query (documented in ADR-003)
- **E2E Testing**: Playwright + Vitest
- **Deployment**: Cloudflare Pages (frontend) + self-hosted API
- **Multi-tenant**: Subdomain-based routing from start
- **Development**: `localhost:3000` (web) + `localhost:3001` (api)
- **Production**: `koenji.seatkit.dev` + `api.seatkit.dev`

---

## 📦 PR Breakdown

### PR #17: Documentation & Foundation ✅ **[COMPLETE]**

**Target LoC**: ~500 lines (config + docs, not counting dependencies)

**Deliverables**:

**Documentation**:
- [x] PR_PLAN.md - This working document
- [x] ADR-002: Next.js 15 App Router Architecture
- [x] ADR-003: State Management (TanStack Query + Zustand)
- [x] ADR-004: E2E Testing with Playwright
- [x] Update ARCHITECTURE.md (reflect state management change)

**Package Setup**:
- [x] Create `packages/web/` directory structure
- [x] `package.json` - Next.js 15, React 19, TanStack Query, Zustand
- [x] `tsconfig.json` - Frontend-specific TypeScript config
- [x] `next.config.mjs` - Next.js configuration
- [x] `eslint.config.js` - Linting for React/Next.js
- [x] `playwright.config.ts` - E2E test configuration
- [x] `.env.example` - Environment variable template (optional, can be added later)

**Next.js App**:
- [x] `src/app/layout.tsx` - Root layout
- [x] `src/app/page.tsx` - Health check / landing page
- [x] `src/app/globals.css` - Basic styling setup
- [x] Basic Tailwind CSS configuration

**CI/CD**:
- [x] Update `.github/workflows/ci.yml` for web package
- [x] Add Playwright browser installation step
- [x] Add web package to Turborepo pipeline

**Testing**:
- [x] Basic E2E test: Home page loads
- [x] Verify full build pipeline works

**Acceptance Criteria**:
- ✅ All ADRs created and documented
- ✅ `pnpm dev` starts Next.js on `localhost:3000`
- ✅ `pnpm build` succeeds for all packages
- ✅ `pnpm test` runs Playwright E2E successfully
- ✅ CI pipeline passes (lint, typecheck, test, build)

---

### PR #18: API Client Layer & Type-Safe Integration 🚧 **[IN PROGRESS]**

**Target LoC**: ~480 lines

**Deliverables**:

**API Client**:
- [x] `src/lib/api-client.ts` - Fetch wrapper with error handling
- [x] `src/lib/api-config.ts` - Base URL configuration
- [x] `src/lib/api-types.ts` - API request/response types

**TanStack Query Setup**:
- [x] `src/providers/query-provider.tsx` - QueryClient provider
- [x] `src/lib/queries/reservations.ts` - Query hooks:
  - `useReservations()` - GET /api/reservations
  - `useCreateReservation()` - POST /api/reservations
  - `useUpdateReservation()` - PUT /api/reservations/:id
  - `useDeleteReservation()` - DELETE /api/reservations/:id

**Error Handling**:
- [x] `src/components/error-boundary.tsx` - React error boundary
- [x] `src/lib/errors.ts` - Error parsing utilities

**Testing**:
- [x] Unit tests for API client utilities
- [x] Mock integration tests for query hooks
- [x] E2E test: API client connection health check

**Acceptance Criteria**:
- ✅ Type-safe API calls with Zod validation
- ✅ All query hooks working with mock data
- ✅ Error handling tested and working
- ✅ 90%+ test coverage for API layer

---

### PR #19: Next.js App Structure & Base Layout

**Target LoC**: ~550 lines

**Deliverables**:

**App Router Structure**:
- [ ] `src/app/layout.tsx` - Enhanced root layout with navigation
- [ ] `src/app/loading.tsx` - Global loading state
- [ ] `src/app/error.tsx` - Global error handling
- [ ] `src/app/not-found.tsx` - 404 page

**Navigation**:
- [ ] `src/components/layout/header.tsx` - Main navigation header
- [ ] `src/components/layout/sidebar.tsx` - Sidebar (if needed)
- [ ] `src/components/layout/footer.tsx` - Footer

**Routing Setup**:
- [ ] `src/app/reservations/page.tsx` - Reservations list (placeholder)
- [ ] `src/app/reservations/layout.tsx` - Reservations layout

**Styling**:
- [ ] Tailwind CSS full setup
- [ ] CSS variables for theming
- [ ] Responsive layout classes

**Testing**:
- [ ] E2E: Navigate between routes
- [ ] E2E: Verify responsive layout
- [ ] E2E: Loading states work

**Acceptance Criteria**:
- ✅ Navigation works between all routes
- ✅ Responsive on mobile/tablet/desktop
- ✅ Loading/error states display correctly
- ✅ Clean, professional UI foundation

---

### PR #20: Reservation List View (Read-Only)

**Target LoC**: ~590 lines

**Deliverables**:

**List View Components**:
- [ ] `src/app/reservations/page.tsx` - Main list page
- [ ] `src/components/reservations/reservation-table.tsx` - Table component
- [ ] `src/components/reservations/reservation-row.tsx` - Individual row
- [ ] `src/components/reservations/reservation-filters.tsx` - Filter UI

**Table Features**:
- [ ] Columns: Guest name, phone, date, time, party size, status
- [ ] Sort by date/time, status
- [ ] Filter by date range, status
- [ ] Pagination or infinite scroll
- [ ] Empty state (no reservations)

**Loading States**:
- [ ] Skeleton loaders for table
- [ ] Loading spinner for filters

**Data Integration**:
- [ ] Connect to `useReservations()` hook
- [ ] Handle loading/error states
- [ ] Display real data from API

**Testing**:
- [ ] E2E: List displays reservations
- [ ] E2E: Filters work correctly
- [ ] E2E: Sort functionality works
- [ ] E2E: Pagination works
- [ ] E2E: Empty state displays

**Acceptance Criteria**:
- ✅ List fetches and displays real reservations
- ✅ Filters and sorting work correctly
- ✅ Responsive table on mobile
- ✅ Professional, clean UI
- ✅ All E2E tests passing

---

### PR #21: Create & Edit Reservation Forms

**Target LoC**: ~580 lines

**Deliverables**:

**Form Pages**:
- [ ] `src/app/reservations/new/page.tsx` - Create reservation page
- [ ] `src/app/reservations/[id]/edit/page.tsx` - Edit reservation page

**Form Components**:
- [ ] `src/components/reservations/reservation-form.tsx` - Shared form
- [ ] Form fields: guest name, phone, date, time, party size, status, notes
- [ ] Zod validation integrated from `@seatkit/types`

**Form Features**:
- [ ] Date/time picker components
- [ ] Phone number formatting
- [ ] Real-time validation with error messages
- [ ] Loading states during submission

**Mutations**:
- [ ] Connect to `useCreateReservation()` hook
- [ ] Connect to `useUpdateReservation()` hook
- [ ] Optimistic UI updates
- [ ] Success/error notifications

**Testing**:
- [ ] E2E: Create new reservation
- [ ] E2E: Edit existing reservation
- [ ] E2E: Validation errors display
- [ ] E2E: Optimistic updates work
- [ ] E2E: Success notifications

**Acceptance Criteria**:
- ✅ Create reservation works end-to-end
- ✅ Edit reservation works end-to-end
- ✅ Form validation matches API
- ✅ Optimistic updates feel instant
- ✅ Proper error handling and notifications

---

### PR #22: Delete Operations & Zustand UI State

**Target LoC**: ~520 lines

**Deliverables**:

**Delete Functionality**:
- [ ] Delete button in reservation list/detail
- [ ] `src/components/reservations/delete-confirmation-modal.tsx` - Confirmation modal
- [ ] Connect to `useDeleteReservation()` hook
- [ ] Optimistic delete with rollback on error

**Zustand Setup**:
- [ ] `src/stores/ui-store.ts` - Zustand store for UI state:
  - Modal open/close state
  - Current filter selections
  - Table sort/pagination state
  - Toast notifications queue

**Notification System**:
- [ ] `src/components/ui/toast.tsx` - Toast notification component
- [ ] `src/lib/notifications.ts` - Toast trigger utilities
- [ ] Success/error/info toasts for all actions

**Polish**:
- [ ] Loading indicators on all buttons
- [ ] Disabled states during operations
- [ ] Keyboard shortcuts (ESC to close modals, etc.)
- [ ] Focus management for accessibility

**Testing**:
- [ ] E2E: Full CRUD flow (create → read → update → delete)
- [ ] E2E: Optimistic updates for all operations
- [ ] E2E: Modal interactions
- [ ] E2E: Toast notifications appear
- [ ] E2E: Error rollback scenarios

**Acceptance Criteria**:
- ✅ Complete CRUD operations working
- ✅ Zustand managing all UI state
- ✅ Toast notifications for all actions
- ✅ Professional, polished UX
- ✅ Full E2E test suite passing
- ✅ Ready for production use

---

## 🎯 Post-PR #22: MVP Complete!

After PR #22, you'll have:
- ✅ Complete reservation CRUD system
- ✅ Type-safe API integration
- ✅ Professional, responsive UI
- ✅ Full E2E test coverage
- ✅ Multi-tenant foundation ready
- ✅ Production-ready for single entity (Reservations)

**Next Steps** (Phase 2):
- Add remaining entities (Tables, Sessions, Sales, Profiles)
- Implement real-time updates (Supabase Realtime)
- Add authentication (Supabase Auth)
- Timeline/Gantt chart view
- Table layout visualization
- Multi-restaurant support

---

## 📊 Progress Tracking

| PR | Status | LoC Target | LoC Actual | Dates |
|----|--------|------------|------------|-------|
| #17 | ✅ Complete | ~500 | TBD | Started: 2025-10-30 |
| #18 | 🚧 In Progress | ~480 | ~400+ | Started: 2025-10-30 |
| #19 | ⏳ Not Started | ~550 | - | - |
| #20 | ⏳ Not Started | ~590 | - | - |
| #21 | ⏳ Not Started | ~580 | - | - |
| #22 | ⏳ Not Started | ~520 | - | - |
| **Total** | **33%** | **~3,220** | **~900** | **ETA: ~2-3 weeks** |

---

## 🔧 Environment Setup

### Development URLs
- Frontend: `http://localhost:3000`
- API: `http://localhost:3001` (from `@seatkit/api`)

### Production URLs (Future)
- Frontend: `koenji.seatkit.dev` (Cloudflare Pages)
- API: `api.seatkit.dev` (Self-hosted)

### Multi-Tenant Strategy
- Subdomain-based routing: `{restaurantSlug}.seatkit.dev`
- First restaurant: `koenji.seatkit.dev`
- Architecture supports multiple restaurants from start

---

## 📚 Key Decisions Documented

| Decision | ADR | Status | Date |
|----------|-----|--------|------|
| Frontend Framework | ADR-002 | ⏳ To Document | - |
| State Management | ADR-003 | ⏳ To Document | - |
| E2E Testing | ADR-004 | ⏳ To Document | - |
| Optional Fields | ADR-001 | ✅ Documented | 2025-01-26 |

---

## 🤝 Notes & Decisions Log

### 2025-10-30: Initial Planning
- Decided to override Redux Toolkit decision in favor of TanStack Query + Zustand
- Rationale: Less boilerplate (~600 LoC saved), better for real-time, modern patterns
- Confirmed multi-tenant from start (subdomain-based)
- Confirmed Cloudflare Pages deployment (no Vercel)
- Using `localhost` for dev (not `local.seatkit.dev`)
- E2E tests against localhost initially, staging environment deferred to Phase 2

### PR Scope Changes
*(Document any PR splits like 17a, 17b or scope changes here)*

---

_This document is a living plan. Update as PRs progress and scope changes occur._
