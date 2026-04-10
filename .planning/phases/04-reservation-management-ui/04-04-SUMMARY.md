---
phase: 04-reservation-management-ui
plan: "04"
subsystem: web
tags: [reservation, timeline, react-virtual, virtualization, tdd, wave-3, uuid-color]
dependency_graph:
  requires:
    - "uuidToColor() from Plan 03 (uuid-color.ts)"
    - "@tanstack/react-virtual@3.13.23 installed in Plan 03"
    - "useReservations hook from Plan 01/02 (lib/queries/reservations.ts)"
    - "useTables hook from Phase 2 (lib/queries/settings.ts)"
    - "AppPresenceBadgeRow from Phase 3 (components/presence-badge.tsx)"
    - "Wave 0 test stubs from Plan 03 (reservation-timeline-view.test.tsx)"
  provides:
    - "ReservationTimelineView — virtualized CSS Grid timeline (VIEW-01, VIEW-02, RES-11)"
    - "TimelineBlock — colored reservation block with uuidToColor inline style"
    - "TimelineHeader — sticky time axis with 30-min slots and Now indicator (amber)"
    - "Full reservations page with Timeline/List/Floor plan tabs and date picker"
    - "AppPresenceBadgeRow wired in app nav header"
    - "ResizeObserver mock in test/setup.ts for react-virtual in jsdom"
    - "4 passing tests for ReservationTimelineView (VIEW-01, VIEW-02)"
  affects:
    - "packages/web/src/app/reservations/page.tsx"
    - "packages/web/src/app/layout.tsx"
    - "packages/web/src/components/reservation/index.ts"
    - "packages/web/src/components/reservation/timeline-block.tsx"
    - "packages/web/src/components/reservation/timeline-header.tsx"
    - "packages/web/src/components/reservation/reservation-timeline-view.tsx"
    - "packages/web/src/components/reservation/reservation-timeline-view.test.tsx"
    - "packages/web/src/test/setup.ts"
    - "packages/web/package.json"
    - "pnpm-lock.yaml"
tech_stack:
  added:
    - "@testing-library/user-event — installed as dev dep (missing test dependency, Rule 3)"
  patterns:
    - "useVirtualizer({ count, getScrollElement, estimateSize: () => 48, overscan: 5, initialRect: { width: 1200, height: 600 } }) — initialRect ensures rows render in jsdom"
    - "ResizeObserver mock in setup.ts — fires immediately with blockSize: 600 so virtualizer considers rows visible in test env"
    - "res.date instanceof Date ? res.date : new Date(res.date) — defensive handling of z.coerce.date() Date objects from API"
    - "element.getAttribute('style') over element.style.backgroundColor — jsdom normalizes hsl() to rgb() on computed style"
key_files:
  created:
    - packages/web/src/components/reservation/timeline-block.tsx
    - packages/web/src/components/reservation/timeline-header.tsx
    - packages/web/src/components/reservation/reservation-timeline-view.tsx
  modified:
    - packages/web/src/app/reservations/page.tsx
    - packages/web/src/app/layout.tsx
    - packages/web/src/components/reservation/index.ts
    - packages/web/src/components/reservation/reservation-timeline-view.test.tsx
    - packages/web/src/test/setup.ts
    - packages/web/package.json
    - pnpm-lock.yaml
decisions:
  - "initialRect passed to useVirtualizer so the component renders rows in jsdom (where ResizeObserver fires with 0 height); initialRect is overridden immediately by the real ResizeObserver in the browser"
  - "ResizeObserver mock fires synchronously on observe() — required because useVirtualizer queries container height before first render; async firing would still produce 0 rows in RTL tests"
  - "page.tsx omits onReservationClick/onSlotClick props entirely (they are optional) rather than passing no-op functions — avoids ESLint no-unused-vars and no-console violations; Plan 05 will add them"
  - "res.date handled defensively as Date | string because z.coerce.date() returns Date objects but test mocks use ISO strings; both cases normalized to Date before .toISOString()"
  - "Test assertion changed from element.style.backgroundColor (rgb-normalized) to element.getAttribute('style') (raw hsl string) because jsdom converts HSL inline styles to RGB on read-back"
metrics:
  duration: "~15min"
  completed: "2026-04-08"
  tasks_completed: 2
  files_modified: 10
---

# Phase 4 Plan 04: Timeline View and App Shell Summary

**One-liner:** Virtualized CSS Grid reservation timeline with UUID-color blocks, Now indicator, sticky time axis, and full three-tab reservations page shell with AppPresenceBadgeRow in nav.

## What Was Built

### Task 1 — App shell: three-tab page layout and AppPresenceBadgeRow in nav (commit e504c24)

**`packages/web/src/app/layout.tsx`** updated with nav-aware layout:
- Sticky `<header>` at `h-14`, `z-30`, `border-b border-border`
- Left: SeatKit wordmark as `<Link href="/reservations">`
- Right: `<AppPresenceBadgeRow />` — shows all online staff (renders null when empty, per Phase 3 behavior)

**`packages/web/src/app/reservations/page.tsx`** replaced the "Coming soon" stub with:
- Page header (`h-12`): "Reservations" h1 + date picker (prev/next arrows + `<input type="date">`)
- Tab strip (`h-10`, `bg-muted`): view tabs (Timeline / List / Floor plan) left, service category tabs (Lunch / Dinner / No booking zone) right — category tabs hidden in List view
- Tab content (`flex-1 overflow-auto`): renders the appropriate view component per active tab
- Stub components for List and Floor plan (replaced in Plans 05 and 06)

**`packages/web/src/components/reservation/index.ts`** created as barrel export scaffold.

### Task 2 — TimelineBlock, TimelineHeader, ReservationTimelineView (commit fa31f14)

**`packages/web/src/components/reservation/timeline-block.tsx`:**
- `<button>` with `data-testid="timeline-block"` and full `aria-label` ("Tanaka Kenji, 2 people, 12:00–13:00")
- Inline `backgroundColor` and `color` from `uuidToColor(reservationId)` — WCAG AA contrast
- Absolutely positioned within its parent time grid cell at `leftPx` / `widthPx`
- `min-w-[4px]` guard — shortest valid block still visible

**`packages/web/src/components/reservation/timeline-header.tsx`:**
- Sticky `top-0 z-20` header row at 32px height
- 120px table-label spacer matching the row layout
- Time labels at every full hour (`HH:00`) with half-hour dashed notch
- "Now" indicator: amber dot + `border-l-2 border-amber-400` vertical line + "Now" label — renders only when `isToday`

**`packages/web/src/components/reservation/reservation-timeline-view.tsx`:**
- `useVirtualizer({ count: tables.length, estimateSize: () => 48, overscan: 5, initialRect: { width: 1200, height: 600 } })` — virtualized table rows
- Horizontal scroll wrapper with `minWidth: totalGridWidth` (120px label + 28 slots × 60px = 1800px)
- Per-row: 120px sticky table label + relative time grid with empty slot buttons + `TimelineBlock` components
- Date + category filtering: excludes `isDeleted`, matches `date` by year/month/day, maps `no_booking_zone` → `['special', 'walk_in']`
- Empty slot click grid (D-05): 28 invisible `<button>` cells per row calling `onSlotClick?.(tableId, slotStart)`
- Empty states: "No tables configured…" / "No reservations for this service. Tap a time slot to add one."
- Zebra-striped rows: `bg-background` (even) / `bg-muted/30` (odd)

**Test implementation** (4 Wave-0 stubs → 4 passing tests):
- Virtualizer rows render with `data-testid="timeline-row"` — confirmed via ResizeObserver mock
- Block `getAttribute('style')` contains `background-color` — confirmed via raw style attribute (not computed)
- Empty state shown for 2099-01-01 with no matching reservations
- `onReservationClick` called with correct UUID on block click

## Deviations from Plan

### Deviation 1 — @testing-library/user-event installed (Rule 3 — missing dependency)

**Found during:** Task 2 RED phase
**Issue:** Test file used `userEvent.click()` but `@testing-library/user-event` was not installed in `@seatkit/web`.
**Fix:** `pnpm --filter @seatkit/web add -D @testing-library/user-event`
**Files modified:** `packages/web/package.json`, `pnpm-lock.yaml`

### Deviation 2 — ResizeObserver mock added to test/setup.ts (Rule 3 — blocking issue)

**Found during:** Task 2 GREEN phase
**Issue:** `useVirtualizer` uses `ResizeObserver` to measure scroll container height; jsdom provides no ResizeObserver, so the virtualizer returned 0 virtual items and tests failed to find `data-testid="timeline-row"` elements.
**Fix:** Added `MockResizeObserver` to `packages/web/src/test/setup.ts` that fires immediately on `observe()` with `blockSize: 600`. Also added `initialRect: { width: 1200, height: 600 }` to the virtualizer config as a belt-and-suspenders approach.
**Files modified:** `packages/web/src/test/setup.ts`, `packages/web/src/components/reservation/reservation-timeline-view.tsx`

### Deviation 3 — Test assertion changed from style.backgroundColor to getAttribute('style') (Rule 1 — bug)

**Found during:** Task 2 GREEN phase
**Issue:** `element.style.backgroundColor` returns `rgb(230, 193, 137)` in jsdom — the browser normalizes CSS `hsl()` values to `rgb()` when reading back the computed style. The plan's test assertion `expect(style).toMatch(/hsl/)` would always fail in jsdom.
**Fix:** Changed to `element.getAttribute('style')` which returns the raw attribute string containing `background-color: hsl(...)`.
**Files modified:** `packages/web/src/components/reservation/reservation-timeline-view.test.tsx`

### Deviation 4 — res.date defensive Date handling (Rule 1 — bug)

**Found during:** Task 2 build verification
**Issue:** `ReservationSchema` uses `z.coerce.date()` which means `res.date` is a `Date` object at runtime, but the plan's code passed `res.date` directly as `startTime: string` to `TimelineBlock`. TypeScript caught this as a type error.
**Fix:** Used `startDate.toISOString()` for `startTime` and added `instanceof Date` guard for test environments where mocks may provide ISO strings.
**Files modified:** `packages/web/src/components/reservation/reservation-timeline-view.tsx`

### Deviation 5 — Removed console.log stubs and no-op callbacks (Rule 1 — ESLint violations)

**Found during:** Task 2 build verification
**Issue:** Plan specified `console.log('open drawer for', id)` stubs in page.tsx; ESLint `no-console` rule treats these as errors in the Next.js build. Underscore-prefixed params (`_id`, `_tableId`) also failed `no-unused-vars`.
**Fix:** `onReservationClick` and `onSlotClick` props omitted entirely from the page (they are optional in `ReservationTimelineViewProps`). Plan 05 will add them when the drawer is wired.
**Files modified:** `packages/web/src/app/reservations/page.tsx`

## Known Stubs

| Stub | File | Resolved In |
|------|------|-------------|
| `ReservationListViewStub` in page.tsx | `packages/web/src/app/reservations/page.tsx` | Plan 05 |
| `FloorPlanViewStub` in page.tsx | `packages/web/src/app/reservations/page.tsx` | Plan 06 |
| `onReservationClick` not wired in page | `packages/web/src/app/reservations/page.tsx` | Plan 05 (drawer) |
| `onSlotClick` not wired in page | `packages/web/src/app/reservations/page.tsx` | Plan 05 (drawer) |

These stubs do not prevent the plan's goal (VIEW-01, VIEW-02 timeline rendering) from being achieved. They are intentional placeholders for subsequent plans.

## Threat Flags

No new threat surface beyond the plan's threat model. All three STRIDE entries accepted per plan:
- T-04-04-01 (reservations in timeline): accepted — auth middleware guards `/reservations`
- T-04-04-02 (date input tampering): mitigated — `input type="date"` enforces YYYY-MM-DD; invalid dates produce empty view
- T-04-04-03 (large reservation counts): accepted — virtualizer ensures only visible rows render

## Self-Check: PASSED

| Item | Result |
|------|--------|
| packages/web/src/components/reservation/timeline-block.tsx | FOUND |
| packages/web/src/components/reservation/timeline-header.tsx | FOUND |
| packages/web/src/components/reservation/reservation-timeline-view.tsx | FOUND |
| packages/web/src/app/reservations/page.tsx (updated) | FOUND |
| packages/web/src/app/layout.tsx (AppPresenceBadgeRow) | FOUND |
| packages/web/src/components/reservation/index.ts (barrel exports) | FOUND |
| packages/web/src/test/setup.ts (ResizeObserver mock) | FOUND |
| Commit e504c24 (Task 1) | FOUND |
| Commit fa31f14 (Task 2) | FOUND |
| pnpm --filter @seatkit/web test exits 0 (48 pass, 17 todo) | PASSED |
| pnpm --filter @seatkit/web build exits 0 | PASSED |
| grep useVirtualizer reservation-timeline-view.tsx | FOUND |
| grep uuidToColor timeline-block.tsx | FOUND |
| grep AppPresenceBadgeRow layout.tsx | FOUND |
| grep data-testid="timeline-block" timeline-block.tsx | FOUND |
| grep Now timeline-header.tsx | FOUND |
