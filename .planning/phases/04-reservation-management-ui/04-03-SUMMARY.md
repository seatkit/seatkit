---
phase: 04-reservation-management-ui
plan: "03"
subsystem: web
tags: [reservation, uuid-color, undo-store, react-virtual, tdd, wave-0, tanstack-query]
dependency_graph:
  requires:
    - "@seatkit/types UpdateReservation type (Plan 01)"
    - "API_ENDPOINTS.reservations.recover + photo (Plan 02)"
    - "PhotoUploadResponseSchema + PhotoUploadResponse in api-types.ts (Plan 02)"
  provides:
    - "uuidToColor(uuid) pure function returning deterministic HSL bg/text pair (RES-11)"
    - "@tanstack/react-virtual@3.13.23 installed in @seatkit/web"
    - "useReservationUndoStore with snapshot/setSnapshot/clearSnapshot (D-11)"
    - "useRecoverReservation mutation hook (POST /recover)"
    - "useUploadReservationPhoto mutation hook (multipart FormData)"
    - "Wave 0 test stubs (it.todo) for ReservationTimelineView, ReservationListView, FloorPlanView, PhotoUpload"
    - "E2E reservations.spec.ts structural skeleton"
  affects:
    - "packages/web/src/lib/queries/reservations.ts"
    - "packages/web/package.json"
    - "pnpm-lock.yaml"
tech_stack:
  added:
    - "@tanstack/react-virtual@3.13.23 — virtualized row rendering for timeline and list views"
  patterns:
    - "UUID-to-color: parseInt(hex.slice(0,6), 16) % 360 → HSL(hue, 65%, 72%) bg, HSL(hue, 65%, 22%) text"
    - "Zustand undo store: snapshot + snapshotId pair; clearSnapshot resets both to null"
    - "Photo upload via native fetch + FormData (not apiPost) — multipart/form-data requires no Content-Type header"
    - "Wave 0 TDD: it.todo stubs exist before component files; remain as todo until Plan 04 implementation"
key_files:
  created:
    - packages/web/src/lib/uuid-color.ts
    - packages/web/src/lib/uuid-color.test.ts
    - packages/web/src/stores/reservation-undo-store.ts
    - packages/web/src/components/reservation/reservation-timeline-view.test.tsx
    - packages/web/src/components/reservation/reservation-list-view.test.tsx
    - packages/web/src/components/reservation/floor-plan-view.test.tsx
    - packages/web/src/components/reservation/photo-upload.test.tsx
    - packages/web/e2e/reservations.spec.ts
  modified:
    - packages/web/src/lib/queries/reservations.ts
    - packages/web/package.json
    - pnpm-lock.yaml
decisions:
  - "Photo upload uses native fetch() not apiPost() — multipart/form-data must not set Content-Type header (browser sets boundary automatically); apiPost force-sets application/json"
  - "useUploadReservationPhoto constructs ApiError with status + statusText + normalized body on !response.ok — consistent with existing ApiError pattern from api-client.ts"
  - "Undo store holds both snapshot and snapshotId to allow the UndoToast to re-submit to the correct reservation without prop drilling"
  - "Wave 0 stubs use it.todo (not it.skip or failing tests) — Vitest counts todo as distinct from failures, allowing pnpm test to exit 0 while clearly marking unimplemented behavior"
metrics:
  duration: "~3min"
  completed: "2026-04-08"
  tasks_completed: 2
  files_modified: 11
---

# Phase 4 Plan 03: Shared State Layer and Wave 0 Test Stubs Summary

**One-liner:** Deterministic UUID-to-HSL color utility, Zustand pre-save undo snapshot store, recover/photo TanStack Query hooks, and Wave 0 `it.todo` stubs for all four reservation UI components.

## What Was Built

### Task 1 — Install react-virtual, uuid-color utility, undo store (commit fd60394)

**`@tanstack/react-virtual@3.13.23`** installed in `@seatkit/web` — required by `ReservationTimelineView` (Plan 04) for virtualized table rows.

**`packages/web/src/lib/uuid-color.ts`:**
- Exports `uuidToColor(uuid: string): ReservationColor` — pure function, zero dependencies
- Algorithm: strips dashes, takes first 6 hex chars, `parseInt(hex, 16) % 360` → HSL hue
- Returns `{ bg: hsl(hue, 65%, 72%), text: hsl(hue, 65%, 22%) }` — ~5.2:1 WCAG AA contrast ratio

**`packages/web/src/lib/uuid-color.test.ts`:**
- 5 tests, all passing: determinism, HSL format strings, shared hue, valid range 0-359, different UUIDs → different hues

**`packages/web/src/stores/reservation-undo-store.ts`:**
- Zustand v5 store with `snapshot: UpdateReservation | null`, `snapshotId: string | null`
- `setSnapshot(id, data)` captures pre-save state; `clearSnapshot()` resets on timeout/undo/next-action

### Task 2 — Extend query hooks and Wave 0 test stubs (commit 06e81e0)

**`packages/web/src/lib/queries/reservations.ts`** extended with:
- `useRecoverReservation(options?)` — calls `POST /api/v1/reservations/:id/recover`, invalidates lists
- `useUploadReservationPhoto(options?)` — native `fetch` with `FormData`, reads stream result through `PhotoUploadResponseSchema`, invalidates detail + list queries

**Wave 0 test stub files** (all using `it.todo` — Vitest counts as todo, not failures):
- `reservation-timeline-view.test.tsx` — 6 stubs (VIEW-01, VIEW-02)
- `reservation-list-view.test.tsx` — 8 stubs (VIEW-03 through VIEW-06)
- `floor-plan-view.test.tsx` — 4 stubs (TABLE-07)
- `photo-upload.test.tsx` — 5 stubs (RES-10)

**`packages/web/e2e/reservations.spec.ts`** — Structural E2E skeleton:
- Timeline/List/Floor plan tab navigation assertions
- Last-edited timestamp presence (RES-13)
- Presence badge row structural check (COLLAB-02, COLLAB-03)
- Skip guards when no reservations are seeded

## Deviations from Plan

### Deviation 1 — useUploadReservationPhoto uses inline ApiError construction

**Found during:** Task 2 implementation

**Issue:** The plan's action code showed a dynamic import pattern:
```typescript
throw new (await import('../api-client.js')).ApiError(response.status, text);
```
This pattern is unusual and unnecessary since `ApiError` is already a static import in the same file.

**Fix:** Used the already-imported `ApiError` directly, passing a normalized `ApiErrorResponse` object as the third argument to match the constructor signature `(status, statusText, error, body?)`.

**Files modified:** `packages/web/src/lib/queries/reservations.ts`

**Rule:** Rule 1 (auto-fix bug) — dynamic import of an already-available symbol would fail at runtime.

## Known Stubs

Wave 0 test stubs are intentional placeholders — they are the TDD scaffolding for Plans 04, 05, and 06. They are not implementation gaps; they are the spec contract for future plans:

| Stub File | Count | Resolved In |
|-----------|-------|-------------|
| reservation-timeline-view.test.tsx | 6 todos | Plan 04 |
| reservation-list-view.test.tsx | 8 todos | Plan 05 |
| floor-plan-view.test.tsx | 4 todos | Plan 06 |
| photo-upload.test.tsx | 5 todos | Plan 04 (drawer) |

## Threat Flags

No new threat surface beyond the plan's threat model. All three STRIDE entries accepted or mitigated per plan:
- T-04-03-01 (uuid-color in bundle): accepted — pure math, no sensitive data
- T-04-03-02 (undo snapshot in memory): accepted — browser memory only, user's own session
- T-04-03-03 (photo upload credentials:include): mitigated — Better Auth session cookie validated server-side by pre-existing onRequest hook

## Self-Check: PASSED

| Item | Result |
|------|--------|
| packages/web/src/lib/uuid-color.ts | FOUND |
| packages/web/src/lib/uuid-color.test.ts | FOUND |
| packages/web/src/stores/reservation-undo-store.ts | FOUND |
| packages/web/src/lib/queries/reservations.ts (extended) | FOUND |
| packages/web/src/components/reservation/reservation-timeline-view.test.tsx | FOUND |
| packages/web/src/components/reservation/reservation-list-view.test.tsx | FOUND |
| packages/web/src/components/reservation/floor-plan-view.test.tsx | FOUND |
| packages/web/src/components/reservation/photo-upload.test.tsx | FOUND |
| packages/web/e2e/reservations.spec.ts | FOUND |
| Commit fd60394 (Task 1) | FOUND |
| Commit 06e81e0 (Task 2) | FOUND |
| pnpm test exits 0 (44 pass, 23 todo) | PASSED |
| tsc --noEmit exits 0 | PASSED |
| eslint exits 0 | PASSED |
