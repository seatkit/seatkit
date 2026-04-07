---
plan: 02-07
phase: 02-authentication-and-configuration
status: complete
completed_at: 2026-04-07
wave: 4
self_check: PASSED
subsystem: web
tags: [auth, settings, staff-management, tanstack-query, playwright, e2e]
dependency_graph:
  requires: [02-04, 02-05, 02-06]
  provides: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, CONFIG-04]
  affects: [packages/web]
tech_stack:
  added: []
  patterns:
    - TanStack Query hooks for staff management (same pattern as settings.ts)
    - ForbiddenBanner role gate for non-admin users
    - Playwright E2E tests with beforeEach login helper
key_files:
  created:
    - packages/web/src/lib/queries/staff.ts
    - packages/web/src/app/settings/staff/page.tsx
  modified:
    - packages/web/e2e/auth.spec.ts
    - packages/web/e2e/settings.spec.ts
decisions:
  - "staff.ts uses path-only endpoints (/api/v1/staff) to match settings.ts pattern; api-client.ts prepends API_BASE_URL internally — plan spec showed full URLs which would have doubled the base"
  - "Drag-to-reorder E2E simplified to visibility check (2-e2e-05) — full pointer drag simulation is brittle in CI per VALIDATION.md"
metrics:
  duration_minutes: 3
  completed_date: 2026-04-07
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 02 Plan 07: Staff Management Page and E2E Tests Summary

## What Was Built

Staff management settings page at `/settings/staff` with invite form, staff list with role badge toggle, remove confirmation dialog, empty state, and ForbiddenBanner for non-admin users. TanStack Query hooks for staff CRUD operations. All Wave 0 E2E test stubs in `auth.spec.ts` and `settings.spec.ts` replaced with full Playwright implementations.

## Commits

- `580c7c8` — feat(02-07): build /settings/staff page and staff TanStack Query hooks
- `5cc2be5` — feat(02-07): implement Wave 0 E2E test stubs for auth and settings flows

## Key Files Created/Modified

- `packages/web/src/lib/queries/staff.ts` — TanStack Query hooks: `useStaff`, `useInviteStaff`, `useRemoveStaff`, `useSetStaffRole`; query key `['settings', 'staff']`
- `packages/web/src/app/settings/staff/page.tsx` — Staff management page: invite form with success/error states, staff list with role toggle button, remove ConfirmDialog, empty state, ForbiddenBanner for non-admin
- `packages/web/e2e/auth.spec.ts` — Full Playwright tests: login → redirect to / (2-e2e-01), sign-out → redirect to /login (2-e2e-02), unauthenticated navigation → redirect to /login (2-e2e-03)
- `packages/web/e2e/settings.spec.ts` — Full Playwright tests: add table via form (2-e2e-04), priority list visibility check (2-e2e-05)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan spec used full URLs in staff.ts which would double API_BASE_URL**
- **Found during:** Task 1 implementation
- **Issue:** Plan spec showed `apiGet(\`${API_BASE_URL}/api/v1/staff\`, ...)` but `api-client.ts` already prepends `API_BASE_URL` internally via `const url = \`${API_BASE_URL}${endpoint}\``. Using full URLs would result in `http://localhost:3001http://localhost:3001/api/v1/staff`.
- **Fix:** Used path-only endpoints (`/api/v1/staff`) matching the established pattern in `settings.ts`.
- **Files modified:** `packages/web/src/lib/queries/staff.ts`
- **Commit:** `580c7c8`

## Known Stubs

None. All required functionality is fully implemented. The staff page calls real API endpoints via TanStack Query hooks. The E2E tests exercise real browser flows. The role toggle and remove ConfirmDialog are fully wired.

## Threat Flags

None. All threat mitigations from the plan's threat model are implemented server-side (plan 02-04) and the client-side role guard is present as defense-in-depth per T-02-07-02.

## Self-Check

- `packages/web/src/lib/queries/staff.ts` — FOUND
- `packages/web/src/app/settings/staff/page.tsx` — FOUND
- `packages/web/e2e/auth.spec.ts` — FOUND (no .todo/.fixme stubs)
- `packages/web/e2e/settings.spec.ts` — FOUND (no .todo/.fixme stubs)
- commit `580c7c8` — FOUND
- commit `5cc2be5` — FOUND

## Self-Check: PASSED
