---
phase: 04-reservation-management-ui
plan: "05"
subsystem: web/reservation-ui
tags:
  - drawer
  - form
  - undo
  - photo-upload
  - conflict-modal
  - presence
dependency_graph:
  requires:
    - 04-03-SUMMARY.md  # presence store, undo store, query hooks
    - 04-04-SUMMARY.md  # timeline view, app shell, reservations page stub
  provides:
    - ReservationDrawer  # slide-over create/edit, z-50
    - FilterChip         # reusable active/inactive filter chip
    - photo-upload fixes # void wrapping, removed stale eslint comments
    - wired reservations page  # slot → create drawer, block → edit drawer
  affects:
    - packages/web/src/app/reservations/page.tsx
    - packages/web/src/components/reservation/
tech_stack:
  added: []
  patterns:
    - slide-over drawer (translate-x animation, fixed inset-y)
    - exactOptionalPropertyTypes conditional JSX spread
    - void-wrapped async event handlers (no-misused-promises)
    - z-layer stack: backdrop z-40, drawer z-50, dialog z-[60]
key_files:
  created:
    - packages/web/src/components/reservation/reservation-drawer.tsx
    - packages/web/src/components/reservation/filter-chip.tsx
    - packages/web/src/components/reservation/reservation-form.tsx
  modified:
    - packages/web/src/app/reservations/page.tsx
    - packages/web/src/components/reservation/photo-upload.tsx
    - packages/web/src/components/reservation/undo-toast.tsx
decisions:
  - "exactOptionalPropertyTypes: used conditional JSX spread ({...(val !== undefined ? { prop: val } : {})}) to pass optional state without triggering strictness error"
  - "Rebuilt @seatkit/types dist: photoUrl field was in source but missing from stale compiled output — triggered a types package rebuild"
  - "void wrapper pattern: async event handlers wrapped with void() to satisfy no-misused-promises without disabling the rule"
  - "Removed stale @next/next/no-img-element eslint-disable: rule not installed in this project's ESLint config; using plain comment instead"
metrics:
  duration_minutes: 45
  completed_date: "2026-04-08"
  tasks_completed: 2
  files_changed: 6
---

# Phase 4 Plan 05: Reservation Drawer and Form Summary

Slide-over ReservationDrawer with four-section form, ConflictModal overlay, PresenceBadgeRow footer, UndoToast, photo upload, and FilterChip — all wired into the reservations page.

## What Was Built

### ReservationDrawer (`packages/web/src/components/reservation/reservation-drawer.tsx`)

Full-screen slide-over (480px desktop, full-width mobile) at `z-50` with:
- `translate-x-full → translate-x-0` animation (200ms ease-out)
- Backdrop at `z-40` — click closes drawer
- Header: close button, title ("New reservation" / guest name), mode badge
- Body: scrollable `ReservationForm` with all four sections
- Sticky footer: `ReservationPresenceBadgeRow` left, delete icon + save button right
- Delete confirmation `<dialog>` at `z-[60]`
- `ConflictModal` at `z-[60]` — opens when PUT returns 409 via `onConflict` callback
- `UndoToast` rendered outside drawer (bottom-center) after successful edit save
- `useReservationUndoStore` snapshot captured before each save for undo support

### FilterChip (`packages/web/src/components/reservation/filter-chip.tsx`)

Reusable chip with `aria-pressed`, active state (`bg-foreground text-background`), inactive state (`border border-border`), optional numeric count badge. Prepared for list view filter bar (Plan 06).

### Wired Reservations Page (`packages/web/src/app/reservations/page.tsx`)

- `handleReservationClick(id)` — finds reservation in query cache, opens drawer in edit mode
- `handleSlotClick(tableId, slotStart)` — opens drawer in create mode with pre-fill
- `useReservations()` provides the reservation cache for lookup
- `useSession()` provides `currentUserId` for presence and mutation attribution
- `onReservationClick` / `onSlotClick` passed to `ReservationTimelineView`

## Commits

| Hash | Message |
|------|---------|
| `a23e60e` | feat(04-05): PhotoUpload component and UndoToast |
| `2d3da06` | feat(04-05): ReservationDrawer, FilterChip, and wired reservations page |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stale `@seatkit/types` dist missing `photoUrl`**
- **Found during:** Task 2 build (TypeScript error "Property 'photoUrl' does not exist")
- **Issue:** The `photoUrl` field was present in `packages/types/src/schemas/reservation.ts` but the compiled `dist/` files were stale and did not include it
- **Fix:** Ran `pnpm --filter @seatkit/types build` to regenerate the dist; confirmed field appeared in `.d.ts`
- **Files modified:** `packages/types/dist/` (generated, not committed)

**2. [Rule 1 - Bug] `exactOptionalPropertyTypes` rejection for `prefill` prop**
- **Found during:** Task 2 build
- **Issue:** State typed as `T | undefined` passed as optional prop caused strict TS error
- **Fix:** Replaced `prefill={drawerPrefill}` with conditional spread `{...(drawerPrefill !== undefined ? { prefill: drawerPrefill } : {})}`
- **Files modified:** `packages/web/src/app/reservations/page.tsx`

**3. [Rule 2 - ESLint] `no-misused-promises` on async event handlers**
- **Found during:** Task 2 build lint phase
- **Issue:** `onChange={handleFileChange}` (async) and `onClick={handleUndo}` (async) both trigger `no-misused-promises`
- **Fix:** Wrapped with `void`: `onChange={(e) => void handleFileChange(e)}` and `onClick={() => void handleUndo()}`
- **Files modified:** `photo-upload.tsx`, `undo-toast.tsx`

**4. [Rule 1 - Bug] Stale `@next/next/no-img-element` eslint-disable comment**
- **Found during:** Task 2 build lint phase
- **Issue:** The rule `@next/next/no-img-element` is not installed in this project's ESLint config (uses `@seatkit/eslint-config`, no Next.js plugin); the disable comment caused "rule not found" error
- **Fix:** Replaced with a plain code comment explaining why `<img>` is safe
- **Files modified:** `photo-upload.tsx`

**5. [Rule 1 - Bug] `jsx-a11y` disable comment for uninstalled rule**
- **Found during:** Task 2 build lint phase
- **Issue:** `reservation-form.tsx` had `eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions` but those rules are not in the config
- **Fix:** Removed comment; changed the `<span>` to `role="presentation"` which is semantically correct for a click-mirror label
- **Files modified:** `reservation-form.tsx`

**6. [Rule 1 - Bug] `updatedAt` type mismatch (`Date` vs `string`)**
- **Found during:** Task 2 build
- **Issue:** `ReservationForm.lastEditedAt` expects `string | null` but `reservation.updatedAt` is a `Date` (Zod coerces it)
- **Fix:** Convert inline with ternary: `reservation?.updatedAt instanceof Date ? reservation.updatedAt.toISOString() : (reservation?.updatedAt ?? null)`
- **Files modified:** `reservation-drawer.tsx`

## Verification

```
pnpm --filter @seatkit/web test   → 53 passed | 12 todo (Wave 0 stubs) | 0 failed
pnpm --filter @seatkit/web build  → exit 0 ✓

grep ConflictModal reservation-drawer.tsx        → imported line 12, rendered line 348
grep ReservationPresenceBadgeRow ...             → imported line 13, rendered line 279
grep reservation-presence-row ...               → data-testid present line 274
grep last-edited-timestamp reservation-form.tsx → data-testid present line 98
grep acceptanceState reservation-form.tsx       → Section 3 select present
grep UndoToast reservation-drawer.tsx           → wired lines 16, 358-366
```

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `ReservationListViewStub` | `page.tsx` | List view deferred to Plan 06 |
| `FloorPlanViewStub` | `page.tsx` | Floor plan view deferred to Plan 06 |
| Floor plan test stubs | `floor-plan-view.test.tsx` | 4 skipped — component not yet built |
| List view test stubs | `reservation-list-view.test.tsx` | 8 skipped — component not yet built |

These stubs are intentional and do not block this plan's goal. They are tracked Wave 0 stubs created in Plan 03 for components deferred to later plans.

## Threat Flags

None — all new surface is client-side UI only. No new API endpoints, auth paths, or server-side routes introduced. Photo upload still goes through the existing `/api/v1/reservations/:id/photo` endpoint covered in Plan 02.

## Self-Check

- [x] `packages/web/src/components/reservation/reservation-drawer.tsx` — exists
- [x] `packages/web/src/components/reservation/filter-chip.tsx` — exists
- [x] `packages/web/src/app/reservations/page.tsx` — modified with drawer wired
- [x] Commits `a23e60e` and `2d3da06` exist in git log
- [x] `pnpm --filter @seatkit/web test` → 53 passed, 0 failed
- [x] `pnpm --filter @seatkit/web build` → exit 0

## Self-Check: PASSED
