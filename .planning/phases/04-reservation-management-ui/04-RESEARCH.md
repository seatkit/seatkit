# Phase 4: Reservation Management UI - Research

**Researched:** 2026-04-08
**Domain:** Next.js 15 / React 19 reservation management UI — timeline/Gantt, list view, floor plan, reservation drawer, photo upload, soft-delete
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Timeline View**
- D-01: CSS Grid + `@tanstack/react-virtual` for row virtualization. Render only visible table rows; CSS Grid handles the time-axis columns.
- D-02: Date picker (prev/next arrows) + Lunch / Dinner / NoBookingZone tab strip at the top of the timeline. Switching either updates the view.
- D-03: Mobile behavior: horizontal scroll with pinch-zoom. Timeline is not collapsed on small screens.
- D-04: Clicking a reservation block opens the reservation drawer (edit mode, pre-loaded with that reservation's data).
- D-05: Clicking an empty time slot opens the reservation drawer (create mode, pre-filled with the clicked table, date, and time).

**View Navigation**
- D-06: Three-tab navigation: [Timeline] [List] [Floor Plan]. All share the same date and service category context.

**Reservation Drawer (Create / Edit)**
- D-07: Single `ReservationDrawer` component with a `mode` prop (`"create"` | `"edit"`). Create mode accepts pre-fill values from timeline click context.
- D-08: Single scrollable form with grouped sections: Core Info / Options / Table Assignment / Photo.
- D-09: Sticky bottom bar: presence badges (left) + Save / Delete actions (right). PresenceBadge from Phase 3 integrated here.
- D-10: ConflictModal from Phase 3 triggers as an overlay on the drawer when a PUT returns 409.

**Undo / Redo**
- D-11: Two-level undo, no Ctrl+Z interception. In-form: native text undo + "Reset to saved" button. Post-save: 10-second "Saved — Undo?" toast backed by Zustand snapshot.

**List View**
- D-12: Soft-deleted reservations recovered via "Deleted" filter state. Recover action per row.
- D-13: Search by guest name (debounced), filter by status/date/party size/type, sort (time/name/party/created), group by day/week/month/table.

**Floor Plan**
- D-14: Static CSS Grid based on table `positionRow`/`positionCol`. No drag-and-drop this phase (TABLE-05 deferred).
- D-15: Tables sharing a reservation get `ring-2` in UUID-derived color + colored dot in top-right. No filled background on card.

**Photo Attachments (RES-10)**
- D-16: Supabase Storage bucket `seatkit-reservation-photos`.
- D-17: Upload flow: browser POSTs multipart to API; API streams to Supabase Storage; stores resulting URL in `photo_url` column.
- D-18: 10 MB file size limit. 413 with clear message on exceed.
- D-19: `<input type="file" accept="image/*" capture="environment">` — single input, no extra libraries.

### Claude's Discretion

- UUID-to-color derivation algorithm for RES-11 (algorithm is specified in UI-SPEC: HSL hash of first 6 UUID hex chars, s=65%, l=72%)
- Emoji picker component approach (system emoji via input or small inline grid)
- Exact time column granularity for the timeline (decided: 30-min per UI-SPEC)
- "Now" indicator line in the timeline
- Reservation block hover/active states
- List view row density and column selection
- Floor plan grid cell sizing and empty table appearance
- Zustand slice structure for pre-save snapshot (operation-level undo)

### Deferred Ideas (OUT OF SCOPE)

- TABLE-04: Per-date/category layout snapshots
- TABLE-05: Drag tables to new positions on the floor plan
- TABLE-06: Forward propagation of layout changes to future dates
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RES-01 | Staff can create a reservation with guest name, phone, party size, date, start time, and service category | ReservationDrawer (create mode) + existing useCreateReservation hook; new fields (language, emoji, isLargeGroup) need schema migration |
| RES-02 | Staff can edit any field of an existing reservation | ReservationDrawer (edit mode) + existing useUpdateReservation hook |
| RES-03 | Staff can soft-delete a reservation | Requires new `isDeleted`/`deletedAt` column (DB migration) + API route change from hard-delete to soft-delete |
| RES-04 | Staff can recover a deleted/canceled reservation back to pending | New PATCH or PUT /recover endpoint + list view Recover action |
| RES-06 | Staff can set acceptance state (toConfirm / confirmed) | New `acceptanceState` enum column in DB + form field |
| RES-07 | Staff can add free-text notes | Existing `notes` field in DB; form section needed |
| RES-08 | Staff can mark reservation as large group | New `isLargeGroup` boolean column in DB + form toggle |
| RES-09 | Staff can set preferred language for a reservation | New `preferredLanguage` string column in DB + form select |
| RES-10 | Staff can attach a photo to a reservation | New `photoUrl` text column in DB + `@fastify/multipart` + Supabase Storage integration |
| RES-11 | Each reservation has a stable UUID-derived color | Client-side pure function: `hsl(parseInt(uuid.slice(0,6), 16) % 360, 65%, 72%)` — no storage |
| RES-12 | Staff can assign an emoji tag to a reservation | New `emoji` text column in DB + emoji picker in form |
| RES-13 | Reservation records the last-edited timestamp visible to staff | `updated_at` column already exists in DB; needs to be surfaced in drawer footer and list view |
| TABLE-07 | Floor plan shows cluster visualization — tables belonging to same reservation shown as distinct colored block | FloorPlanView component reads tableIds from reservations, applies UUID-derived ring color |
| VIEW-01 | Timeline/Gantt view of reservations for a date and category (per-table rows, per-hour columns) | ReservationTimelineView with CSS Grid + @tanstack/react-virtual |
| VIEW-02 | Reservation blocks color-coded by stable reservation color | TimelineBlock inline style via UUID-to-color function |
| VIEW-03 | List view with real-time search by guest name | Debounced search input, client-side filter on customer.name |
| VIEW-04 | Filter list by status, date range, party size, reservation type | Filter chips, client-side; server-side filtering blocked until GET /reservations gains query params |
| VIEW-05 | Sort list by time, guest name, party size, creation date | Client-side sort on loaded data |
| VIEW-06 | Group list results by day, week, month, assigned table | Client-side grouping on sorted/filtered data |
</phase_requirements>

---

## Summary

Phase 4 builds the primary staff UI on top of a solid backend and real-time infrastructure (Phases 1-3). The core challenge is three related but visually distinct views (timeline, list, floor plan) that share date+category context, plus a reservation drawer that must integrate Phase 3's ConflictModal and PresenceBadge components. The majority of the UI work is client-side in `packages/web`; but the phase also requires coordinated backend work: a DB schema migration to add missing reservation fields (soft-delete, acceptance state, language, large group flag, emoji, photo URL), a change to the DELETE route from hard-delete to soft-delete, and Supabase Storage integration via `@fastify/multipart`.

The most important discovery is a **schema gap**: the current `reservations` table is missing at least six columns required by Phase 4 requirements (RES-03/04/06/08/09/10/12). These must be added via a Drizzle migration and the corresponding Zod schemas updated in `@seatkit/types` before any frontend work that depends on them can ship. The GET /api/v1/reservations route also currently returns all reservations without filtering; Phase 4 list view filtering operates client-side on the full dataset, which is acceptable for the restaurant's scale but the API will need query param support eventually.

All three new UI libraries needed (`@tanstack/react-virtual`, `@fastify/multipart`, `@supabase/supabase-js` or `@supabase/storage-js`) are verified available at current versions compatible with the existing stack. `@tanstack/react-virtual` v3.13.23 explicitly supports React 19. `dnd-kit` is already installed in `packages/web` (for TABLE-05, deferred) and must not be added again.

**Primary recommendation:** Structure the phase in four ordered layers — (1) DB schema migration + types update (unblocks all other work), (2) API surface changes (soft-delete, recover, photo upload route), (3) shared state and query hooks, (4) UI component build in view order: Timeline, Drawer, List, Floor Plan.

---

## Project Constraints (from CLAUDE.md)

- **Language:** TypeScript 5.x strict mode + Node.js 22 + Pure ESM
- **Monorepo:** Turborepo + pnpm workspaces — changes must not break dependent packages
- **Validation:** Zod for all runtime type safety — schema is source of truth for types
- **State management:** TanStack Query for server state; Zustand for UI state — no Redux
- **Code quality:** Maximum TypeScript strictness, `no-unused-vars`, `eslint --max-warnings 0`
- **No HTTP error try-catch:** Use `@fastify/sensible` httpErrors pattern (`throw fastify.httpErrors.notFound()`)
- **Date handling:** `z.coerce.date()` for unified Date objects; custom Fastify serializer converts to ISO strings in responses
- **Error handling:** VersionConflictError class for typed conflict signaling (from Phase 3)
- **Auth:** Better Auth 1.x session via `useSession()` hook — do not use TanStack Query for auth state
- **No shadcn CLI:** Manual shadcn-compatible token layer already in `globals.css` — no `components.json`
- **Focus ring pattern:** `focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`
- **Touch targets:** 44×44px minimum for all interactive controls (matches DestructiveButton pattern)
- **Phase 3 integration:** ConflictModal and PresenceBadge intentionally orphaned in Phase 3 — Phase 4 wires them

---

## Standard Stack

### Core (already installed — do not reinstall)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `next` | ^15.0.3 | App router, React server/client boundary | installed [VERIFIED: package.json] |
| `react` | ^19.0.0 | UI framework | installed [VERIFIED: package.json] |
| `@tanstack/react-query` | ^5.62.3 | Server state, caching, mutations | installed [VERIFIED: package.json] |
| `zustand` | ^5.0.2 | UI state (pre-save snapshot store, undo) | installed [VERIFIED: package.json] |
| `lucide-react` | ^1.7.0 | Icons (Search, X, ChevronLeft, ChevronRight, etc.) | installed [VERIFIED: package.json] |
| `@dnd-kit/core` | ^6.3.1 | DnD (installed, NOT used this phase — TABLE-05 deferred) | installed [VERIFIED: package.json] |
| `tailwindcss` | ^3.4.15 | Styling | installed [VERIFIED: package.json] |
| `zod` | ^4.3.6 | Schema validation | installed [VERIFIED: package.json] |
| `better-auth` | ^1.6.0 | Auth session | installed [VERIFIED: package.json] |

### New Dependencies Required

| Library | Version | Purpose | Install Target | Why Needed |
|---------|---------|---------|----------------|-----------|
| `@tanstack/react-virtual` | 3.13.23 | Timeline row virtualization (D-01) | `packages/web` | Not installed; React 19 compatible [VERIFIED: npm registry] |
| `@fastify/multipart` | 10.0.0 | Photo upload multipart body parser | `packages/api` | Not installed; required for D-17 [VERIFIED: npm registry] |
| `@supabase/supabase-js` | 2.102.1 | Supabase Storage client for photo upload | `packages/api` | Not installed; supabase URL/key already in secrets [VERIFIED: npm registry + simple-secrets.ts] |

**Installation:**
```bash
# web package
pnpm --filter @seatkit/web add @tanstack/react-virtual@3.13.23

# api package
pnpm --filter @seatkit/api add @fastify/multipart@10.0.0 @supabase/supabase-js@2.102.1
```

**Version verification:** [VERIFIED: npm registry, 2026-04-08]
- `@tanstack/react-virtual`: 3.13.23 is dist-tags.latest; peerDeps `react: ^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0` — React 19 compatible
- `@fastify/multipart`: 10.0.0 is dist-tags.latest
- `@supabase/supabase-js`: 2.102.1 is dist-tags.latest

---

## Architecture Patterns

### Recommended Component Structure

```
packages/web/src/
├── app/
│   ├── layout.tsx                          # Add AppPresenceBadgeRow to nav header
│   └── reservations/
│       └── page.tsx                        # Replace stub with ReservationsPage
├── components/
│   ├── conflict-modal.tsx                  # Phase 3 — integrate as-is (no changes)
│   ├── presence-badge.tsx                  # Phase 3 — resolve real names this phase
│   └── reservation/                        # NEW: all Phase 4 components
│       ├── index.ts                        # barrel exports
│       ├── reservation-timeline-view.tsx
│       ├── reservation-list-view.tsx
│       ├── floor-plan-view.tsx
│       ├── reservation-drawer.tsx
│       ├── reservation-form.tsx
│       ├── timeline-block.tsx
│       ├── timeline-header.tsx
│       ├── undo-toast.tsx
│       ├── photo-upload.tsx
│       └── filter-chip.tsx
├── lib/
│   ├── api-config.ts                       # Add photo upload endpoint
│   ├── api-types.ts                        # Add new reservation fields to schema
│   ├── uuid-color.ts                       # NEW: UUID-to-color pure function
│   └── queries/
│       └── reservations.ts                 # Extend: useRecoverReservation, useUploadPhoto
└── stores/
    ├── presence-store.ts                   # Phase 3 — unchanged
    └── reservation-undo-store.ts           # NEW: pre-save snapshot for undo toast

packages/api/src/
├── db/
│   └── schema/
│       └── reservations.ts                 # Add 6 new columns + soft-delete
├── routes/
│   └── reservations.ts                     # Soft-delete, recover endpoint, photo upload route
└── services/
    └── reservation-service.ts              # Update deleteReservation, add recoverReservation
```

### Pattern 1: Timeline Row Virtualization with @tanstack/react-virtual

**What:** `useVirtualizer` virtualizes the table-row axis. CSS Grid handles the time column axis.
**When to use:** Any list with potentially 50+ items where all rows being in DOM is wasteful.

```typescript
// Source: @tanstack/react-virtual v3 docs [ASSUMED - standard useVirtualizer API]
import { useVirtualizer } from '@tanstack/react-virtual';

function ReservationTimelineView({ tables }: { tables: Table[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: tables.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // 48px per row (UI-SPEC)
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="overflow-y-auto flex-1">
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const table = tables[virtualRow.index];
          return (
            <div
              key={table.id}
              style={{
                position: 'absolute',
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: '48px',
              }}
              className="grid" // CSS Grid time columns
            >
              {/* TimelineBlock items for this row */}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Pattern 2: Reservation Drawer (Slide-Over)

**What:** Fixed right-panel slide-over with CSS transition. Uses CSS transform, not animation library.
**Key:** `'use client'` directive; focus trap via `<dialog>` or manual management; `role="dialog" aria-modal="true"`.

```typescript
// Source: UI-SPEC layout contract (project-defined)
// Animation: translate-x-full → translate-x-0 on open, 200ms ease-out
<div
  className={cn(
    'fixed inset-y-0 right-0 w-full md:w-[480px] z-50 bg-background shadow-2xl',
    'transition-transform duration-200 ease-out',
    open ? 'translate-x-0' : 'translate-x-full'
  )}
  role="dialog"
  aria-modal="true"
  aria-labelledby="drawer-title"
>
```

### Pattern 3: UUID-to-Color Derivation (RES-11)

**What:** Pure deterministic function — same UUID always produces the same HSL color on every client.
**Location:** `packages/web/src/lib/uuid-color.ts`

```typescript
// Source: UI-SPEC § Color (project-defined, Claude's Discretion resolved)
export function uuidToColor(uuid: string): { bg: string; text: string } {
  const hash = uuid.replace(/-/g, '').slice(0, 6);
  const hue = parseInt(hash, 16) % 360;
  return {
    bg: `hsl(${hue}, 65%, 72%)`,
    text: `hsl(${hue}, 65%, 22%)`, // ~5.2:1 contrast ratio, passes WCAG AA
  };
}
```

### Pattern 4: Soft-Delete in Drizzle (RES-03/04)

**What:** Add `isDeleted` boolean + `deletedAt` nullable timestamp to the reservations table. DELETE route sets `isDeleted = true` instead of removing the row. GET route filters out `isDeleted = true` by default; list view passes `includeDeleted = true` when Deleted filter is active.

```typescript
// DB schema addition (packages/api/src/db/schema/reservations.ts)
isDeleted: boolean('is_deleted').notNull().default(false),
deletedAt: timestamp('deleted_at').$type<Date | null>(),
```

```typescript
// Service layer — soft delete pattern [ASSUMED: Drizzle standard update pattern]
export async function softDeleteReservation(id: string, fastify: FastifyInstance) {
  const [updated] = await db
    .update(reservations)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(eq(reservations.id, id))
    .returning();
  if (!updated) throw fastify.httpErrors.notFound('Reservation not found');
  return updated;
}
```

### Pattern 5: Supabase Storage Upload via API Proxy (D-17)

**What:** API receives multipart body, streams file to Supabase Storage, returns URL. Uses `@supabase/supabase-js` StorageClient with `supabaseSecretKey` (service-role key already in secrets).

```typescript
// Source: Supabase Storage docs [ASSUMED - standard upload pattern]
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseSecretKey);

const { data, error } = await supabase.storage
  .from('seatkit-reservation-photos')
  .upload(`${reservationId}/${Date.now()}.jpg`, fileBuffer, {
    contentType: mimetype,
    upsert: false,
  });

if (error) throw fastify.httpErrors.internalServerError('Storage upload failed');
const { data: urlData } = supabase.storage
  .from('seatkit-reservation-photos')
  .getPublicUrl(data.path);
return urlData.publicUrl;
```

### Pattern 6: Operation-Level Undo with Zustand (D-11)

**What:** Before calling `mutateAsync` for save, snapshot the current form state into a Zustand store. Post-save toast reads from that snapshot.

```typescript
// packages/web/src/stores/reservation-undo-store.ts [ASSUMED: Zustand v5 standard pattern]
import { create } from 'zustand';
import type { UpdateReservation } from '@seatkit/types';

type UndoStore = {
  snapshot: UpdateReservation | null;
  setSnapshot: (s: UpdateReservation) => void;
  clearSnapshot: () => void;
};

export const useReservationUndoStore = create<UndoStore>((set) => ({
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  clearSnapshot: () => set({ snapshot: null }),
}));
```

### Pattern 7: Client-Side Filter/Sort/Group for List View

**What:** The existing GET /api/v1/reservations returns all reservations. Client-side filtering, sorting, and grouping runs on the loaded array.
**Why:** Server does not currently support query params for filtering. Client-side is acceptable at restaurant scale (typically < 500 reservations/month).
**Implementation:** `useMemo` chains on the query result inside `ReservationListView`.

### Anti-Patterns to Avoid

- **Importing Zustand inside ws-client.ts:** Creates a circular import. Phase 3 solved this with `setPresenceUpdateCallback`. Apply the same injection pattern for the new undo store if needed from WS handlers.
- **Hard-deleting reservations from the UI:** The DELETE route must be changed to a soft-delete BEFORE the UI delete button is wired — otherwise recoveries are impossible.
- **Calling `useVirtualizer` outside the component that owns the scroll container ref:** The parentRef must be in the same component as `useVirtualizer`.
- **Skipping `'use client'` on interactive components:** All drawer, form, and filter components need client directive (they use state, refs, effects).
- **Inline `backgroundColor` with Tailwind class confusion:** UUID-derived colors are inline styles only — no Tailwind classes — because the hue is dynamic. Tailwind cannot JIT-compile arbitrary runtime values.
- **Using `session?.user?.id` as the display name in PresenceBadge:** Phase 4 should look up real staff names from the user list. Phase 3 used `userId.slice(0, 2)` as a stub; Phase 4 CONTEXT.md (D-09) requires resolving real names.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Virtual row scrolling for timeline | Custom intersection observer | `@tanstack/react-virtual` `useVirtualizer` | Handles overscan, resize, dynamic sizes, scroll restoration |
| Multipart file parsing in Fastify | Raw body parser + boundary splitting | `@fastify/multipart` | MIME boundary parsing has edge cases; `@fastify/multipart` handles streaming correctly |
| Supabase Storage file upload | Direct HTTP to storage REST API | `@supabase/supabase-js` `StorageClient` | Auth token injection, retry, error normalization |
| Debounced search input | Custom `setTimeout` ref in component | `useMemo` + `useEffect` with 300ms delay OR lodash.debounce | Both are simple enough — but lodash is not in the stack, so use the effect pattern |
| Focus trap in drawer | Custom tab-key event handler | Native `<dialog>` element or Radix `Dialog` primitive | Native dialog handles focus trap, backdrop click, ESC key correctly |
| UUID hashing | Custom crypto hash | Simple `parseInt(uuid.slice(0,6), 16) % 360` | The UUID is already random; the first 6 hex chars provide sufficient hue distribution |

**Key insight:** React 19 + Next.js 15 + TanStack ecosystems handle the hardest parts (caching, virtual scroll, optimistic updates). Build thin wrappers, not new infrastructure.

---

## Critical Schema Gap: Missing Reservation Fields

This is the highest-priority discovery. The current `reservations` table and `@seatkit/types` `ReservationSchema` are missing all of these Phase 4 required fields:

| Field | DB Column | Zod Schema | Required By |
|-------|-----------|------------|-------------|
| Soft-delete flag | `is_deleted boolean NOT NULL DEFAULT false` | `isDeleted: z.boolean().default(false)` | RES-03, RES-04 |
| Soft-delete timestamp | `deleted_at timestamp` (nullable) | `deletedAt: DateTimeSchema.nullable()` | RES-03 |
| Acceptance state | `acceptance_state` enum (`toConfirm` / `confirmed`) | new enum | RES-06 |
| Large group flag | `is_large_group boolean NOT NULL DEFAULT false` | `isLargeGroup: z.boolean()` | RES-08 |
| Preferred language | `preferred_language varchar(50)` (nullable) | `preferredLanguage: z.string().nullable()` | RES-09 |
| Photo URL | `photo_url text` (nullable) | `photoUrl: z.string().url().nullable()` | RES-10 |
| Emoji tag | `emoji varchar(10)` (nullable) | `emoji: z.string().nullable()` | RES-12 |

**What already exists:**
- `updated_at` — covers RES-13 (last-edited timestamp)
- `notes` — covers RES-07
- `status` enum — covers acceptance state partially (but `toConfirm` / `confirmed` is a separate semantic; see below)
- `version` — optimistic locking

**Acceptance state clarification:** The current `status` enum is a lifecycle enum (`pending → confirmed → seated → completed → cancelled → no_show`). RES-06's "acceptance state" (`toConfirm` / `confirmed`) is a separate administrative field indicating whether the restaurant has confirmed receipt of the reservation with the customer. These are NOT the same. A new `acceptance_state` column is needed alongside `status`.

**Drizzle migration plan:** One migration file adds all 7 missing columns. The schema file `packages/api/src/db/schema/reservations.ts` and `packages/types/src/schemas/reservation.ts` must be updated in the same plan wave before any frontend component that reads these fields is implemented.

---

## Common Pitfalls

### Pitfall 1: Hard-Delete Route Still Active During Frontend Development

**What goes wrong:** Developer wires up the drawer's delete button before the API route is patched to soft-delete. Records get permanently deleted — unrecoverable.
**Why it happens:** The DELETE route currently calls `db.delete()`, not `db.update()`.
**How to avoid:** Patch the API DELETE route to soft-delete in the same plan wave as the schema migration — before any frontend delete button is wired.
**Warning signs:** Deleted reservations do not appear in the "Deleted" filter.

### Pitfall 2: CSS Grid Timeline + react-virtual Scroll Container Mismatch

**What goes wrong:** `useVirtualizer` is given the wrong scroll container ref. Virtual items render but the scroll does not trigger virtualization, causing blank rows or missing reservations.
**Why it happens:** The timeline has both horizontal (time axis) and vertical (table rows) scroll. `useVirtualizer` must reference the element that scrolls vertically, not the outer overflow-x-auto wrapper.
**How to avoid:** Wrap the grid in a `overflow-y-auto` container and pass that ref to `getScrollElement`. The outer wrapper handles horizontal scroll separately.
**Warning signs:** All rows render at once (no virtualization), or scrolling shows empty space.

### Pitfall 3: Tailwind Purging UUID-Derived Color Classes

**What goes wrong:** Attempting to use `bg-[hsl(${hue},65%,72%)]` or `ring-[hsl(...)]` in timeline blocks. Tailwind 3 (JIT) can handle arbitrary values in brackets, but only if the full string is present as a static literal in source — interpolated template literals are NOT detected.
**Why it happens:** Tailwind's content scanner cannot execute runtime JavaScript. Dynamic class names with variable hue will be purged.
**How to avoid:** Always use `style={{ backgroundColor: uuidToColor(uuid).bg }}` inline style for dynamic colors. Never attempt to construct Tailwind class names from runtime values.
**Warning signs:** Timeline blocks render with no background color in production builds.

### Pitfall 4: `PresenceBadge` Still Showing userId Initials

**What goes wrong:** Phase 3 used `userId.slice(0, 2)` as a stub. If Phase 4 forgets to resolve real staff names, staff see cryptic initials.
**Why it happens:** `PresenceBadge` accepts `initials` as a prop. The caller is responsible for lookup — Phase 3 did not have access to the user list.
**How to avoid:** The drawer footer and app nav should fetch staff list from the API (users list endpoint from Better Auth admin plugin) and map `userId → name` to compute initials properly. Use `useQuery` to cache the user list.
**Warning signs:** Presence badges show hex-looking initials (UUID prefixes).

### Pitfall 5: `@fastify/multipart` and Fastify v5 Compatibility

**What goes wrong:** `@fastify/multipart` v10.0.0 is the latest release. This package must be compatible with Fastify v5 (already in use at `^5.1.0`).
**Why it happens:** `@fastify/multipart` v9.x targeted Fastify v4. v10.x targets Fastify v5.
**How to avoid:** Use `@fastify/multipart@10.0.0` which explicitly supports Fastify v5. [VERIFIED: dist-tags.latest = 10.0.0]
**Warning signs:** TypeScript errors on `fastify.register(multipart)` or runtime errors on file upload.

### Pitfall 6: Supabase Storage Bucket Must Be Created Before First Upload

**What goes wrong:** The `seatkit-reservation-photos` bucket does not exist yet. First upload returns 404 or permission error.
**Why it happens:** Supabase Storage buckets are not auto-created on first write.
**How to avoid:** Include a setup step (manual or scripted) to create the bucket with the Supabase dashboard or management API before the photo upload route is exercised. The bucket should be set to private (API key required, not public anonymous access) since photos contain guest PII.
**Warning signs:** Upload returns `Bucket not found` from Supabase.

### Pitfall 7: GET /reservations Returns Soft-Deleted Records

**What goes wrong:** After implementing soft-delete, the GET /api/v1/reservations route still uses `db.select().from(reservations)` which returns all rows including soft-deleted ones.
**Why it happens:** The current route has no WHERE clause.
**How to avoid:** Update the GET route to `WHERE is_deleted = false` by default. Add a query param `?includeDeleted=true` for the list view's Deleted filter state.
**Warning signs:** Soft-deleted reservations appear in the timeline.

### Pitfall 8: Focus Trap Not Implemented in Drawer

**What goes wrong:** User opens drawer, presses Tab — focus escapes to the page behind the backdrop.
**Why it happens:** A `<div>` with `role="dialog"` does not get a focus trap automatically — only the native `<dialog>` element does.
**How to avoid:** Either use a native `<dialog>` element for the drawer, or implement a focus trap with `tabindex` management. The existing `ConflictModal` already uses native `<dialog>` — consider the same for the drawer, or use a Radix primitive if added.
**Warning signs:** Tab key navigates behind the drawer backdrop.

---

## Code Examples

### useVirtualizer Basic Setup

```typescript
// Source: @tanstack/react-virtual documentation [ASSUMED - standard API]
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,    // 48px row height per UI-SPEC
  overscan: 5,               // render 5 extra rows above/below viewport
});
// virtualizer.getVirtualItems() → array of virtual items with .index, .start, .size
// virtualizer.getTotalSize()    → total pixel height of all rows (for spacer div)
```

### @fastify/multipart Registration

```typescript
// Source: @fastify/multipart README [ASSUMED - standard registration pattern]
import multipart from '@fastify/multipart';

fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per D-18
    files: 1,                    // One file per upload
  },
});

// In the route handler:
fastify.post('/api/v1/reservations/:id/photo', async (request, reply) => {
  const data = await request.file();
  if (!data) throw fastify.httpErrors.badRequest('No file provided');
  // data.filename, data.mimetype, data.file (stream)
});
```

### Undo Toast Timer Pattern

```typescript
// Source: project-defined pattern (UI-SPEC § Undo Toast)
// 10-second auto-dismiss with immediate dismissal on any other action
const [undoVisible, setUndoVisible] = useState(false);
const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function showUndo() {
  setUndoVisible(true);
  undoTimerRef.current = setTimeout(() => setUndoVisible(false), 10_000);
}

function dismissUndo() {
  setUndoVisible(false);
  if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
}
```

### UUID-to-Color Function

```typescript
// Source: UI-SPEC § Color (RES-11, algorithm defined in CONTEXT.md)
// packages/web/src/lib/uuid-color.ts
export function uuidToColor(uuid: string): { bg: string; text: string } {
  const hex = uuid.replace(/-/g, '').slice(0, 6);
  const hue = parseInt(hex, 16) % 360;
  return {
    bg: `hsl(${hue}, 65%, 72%)`,
    text: `hsl(${hue}, 65%, 22%)`, // 50% lighter → dark; contrast ~5.2:1 (WCAG AA passes)
  };
}
```

### Soft-Delete GET Filter in Drizzle

```typescript
// Source: Drizzle ORM docs [ASSUMED - standard where clause]
import { eq } from 'drizzle-orm';

// Default: exclude soft-deleted
const result = await db.select().from(reservations)
  .where(eq(reservations.isDeleted, false));

// With includeDeleted flag (Deleted filter active in list view)
const result = await db.select().from(reservations);
// (no where clause returns all rows including deleted)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux Toolkit + RTK Query | TanStack Query + Zustand | ADR-003 (Phase 1/2) | Smaller bundle, better TypeScript, composable |
| Direct Supabase Auth | Better Auth 1.x | Phase 2 | Self-hostable, no Supabase account required for auth |
| No file uploads | `@fastify/multipart` v10 (Fastify v5 compatible) | Phase 4 (new) | multipart v10 is the Fastify v5 release |
| Hard-delete reservations | Soft-delete (`is_deleted` column) | Phase 4 (new) | Recovery without backup restore |
| Static reservation list | Virtualized with `@tanstack/react-virtual` v3 | Phase 4 (new) | v3 supports React 19 and uses a cleaner hook API than v2 |

**Deprecated/outdated:**
- `@tanstack/virtual` (v2 / unstable): superseded by `@tanstack/react-virtual` v3 with stable hook API
- `@fastify/multipart` v9.x: targets Fastify v4 — use v10 for Fastify v5

---

## Runtime State Inventory

Phase 4 is not a rename/refactor phase — this section is not applicable. The phase adds new columns to an existing table but does not rename any existing data or system identifiers.

**Schema changes only (no data migration needed):** New nullable columns with defaults (`is_deleted`, `deleted_at`, `is_large_group`, `acceptance_state`, `preferred_language`, `photo_url`, `emoji`) do not require data migration — existing rows receive `NULL` or default values automatically via Drizzle migration.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js ≥22 | All packages | ✓ | 22.x (engine spec) | — |
| pnpm ≥9 | Workspace | ✓ | ≥9.0.0 (engine spec) | — |
| @tanstack/react-virtual | Timeline (D-01) | ✗ (not installed) | 3.13.23 (latest) | None — required |
| @fastify/multipart | Photo upload (D-17) | ✗ (not installed) | 10.0.0 (latest) | None — required |
| @supabase/supabase-js | Photo storage (D-16/17) | ✗ (not installed) | 2.102.1 (latest) | None — required |
| Supabase Storage bucket `seatkit-reservation-photos` | Photo upload | ✗ (bucket not yet created) | — | Must be created before photo route is used |
| Supabase URL + Secret Key | Storage client | ✓ (in simple-secrets.ts) | — | — |
| dnd-kit/core | (TABLE-05 deferred) | ✓ (installed, unused) | ^6.3.1 | Not used this phase |

**Missing dependencies with no fallback:**
- `@tanstack/react-virtual` — timeline row virtualization (D-01 is locked)
- `@fastify/multipart` — photo upload route (D-17 is locked)
- `@supabase/supabase-js` — storage client (D-16/17 locked)
- Supabase Storage bucket — must be created manually in Supabase dashboard before first upload

**Missing dependencies with fallback:**
- None (all missing deps are locked decisions)

---

## Validation Architecture

**nyquist_validation: true** — validation section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.3 (unit) + Playwright 1.49.0 (E2E) |
| Config file (unit) | `packages/web/vitest.config.ts` (environment: jsdom) |
| Config file (E2E) | `packages/web/playwright.config.ts` (testDir: `./e2e`) |
| Quick run command | `pnpm --filter @seatkit/web test` |
| Full suite command | `pnpm --filter @seatkit/web test && pnpm --filter @seatkit/web test:e2e:chromium` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RES-01 | Create reservation with all required fields | unit (hook) | `pnpm --filter @seatkit/web test -- reservations` | ✅ (extend existing reservations.test.tsx) |
| RES-02 | Edit any field of an existing reservation | unit (hook) | `pnpm --filter @seatkit/web test -- reservations` | ✅ (extend) |
| RES-03 | Soft-delete sets isDeleted=true, row not purged | unit (API service) | `pnpm --filter @seatkit/api test -- reservations` | ✅ (extend api reservations.test.ts) |
| RES-04 | Recover restores reservation to pending | unit (API service) | `pnpm --filter @seatkit/api test -- reservations` | ✅ (extend) |
| RES-11 | UUID-to-color is deterministic | unit (pure fn) | `pnpm --filter @seatkit/web test -- uuid-color` | ❌ Wave 0: `src/lib/uuid-color.test.ts` |
| RES-13 | Last-edited timestamp visible in drawer | E2E (structural) | `pnpm --filter @seatkit/web test:e2e:chromium -- reservations` | ❌ Wave 0: `e2e/reservations.spec.ts` |
| VIEW-01 | Timeline renders per-table rows | unit (component render) | `pnpm --filter @seatkit/web test -- timeline` | ❌ Wave 0: `src/components/reservation/reservation-timeline-view.test.tsx` |
| VIEW-02 | Reservation blocks have UUID-derived color | unit (component) | `pnpm --filter @seatkit/web test -- timeline-block` | ❌ Wave 0 |
| VIEW-03 | List search filters by guest name (debounced) | unit (component) | `pnpm --filter @seatkit/web test -- list-view` | ❌ Wave 0: `src/components/reservation/reservation-list-view.test.tsx` |
| VIEW-04 | Filter chips update visible list | unit (component) | `pnpm --filter @seatkit/web test -- list-view` | ❌ Wave 0 |
| TABLE-07 | Floor plan shows cluster rings | unit (component) | `pnpm --filter @seatkit/web test -- floor-plan` | ❌ Wave 0: `src/components/reservation/floor-plan-view.test.tsx` |
| COLLAB-02/03 | Conflict modal appears on 409; badges in drawer | E2E (fill Phase 3 skeletons) | `pnpm --filter @seatkit/web test:e2e:chromium` | ✅ (real-time-collab.spec.ts has structural stubs) |
| Photo upload | 413 on >10MB; preview on success | unit (component) | `pnpm --filter @seatkit/web test -- photo-upload` | ❌ Wave 0: `src/components/reservation/photo-upload.test.tsx` |

### Sampling Rate
- **Per task commit:** `pnpm --filter @seatkit/web test`
- **Per wave merge:** `pnpm --filter @seatkit/web test && pnpm --filter @seatkit/api test`
- **Phase gate:** Full suite green (unit + E2E:chromium) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `packages/web/src/lib/uuid-color.test.ts` — covers RES-11 determinism
- [ ] `packages/web/src/components/reservation/reservation-timeline-view.test.tsx` — covers VIEW-01, VIEW-02
- [ ] `packages/web/src/components/reservation/reservation-list-view.test.tsx` — covers VIEW-03, VIEW-04, VIEW-05, VIEW-06
- [ ] `packages/web/src/components/reservation/floor-plan-view.test.tsx` — covers TABLE-07
- [ ] `packages/web/src/components/reservation/photo-upload.test.tsx` — covers RES-10 upload flow + 413 error
- [ ] `packages/web/e2e/reservations.spec.ts` — covers full create/edit/delete/recover E2E flow (fills Phase 3 structural stubs for COLLAB-02, COLLAB-03)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better Auth session — all reservation routes already gated by onRequest auth hook |
| V3 Session Management | no | Handled in Phase 2/3 — no new session logic |
| V4 Access Control | yes | Soft-delete and recovery — any staff can recover; no manager-only gate needed (per CLAUDE.md: only Sales is manager-gated) |
| V5 Input Validation | yes | Zod schemas on all API inputs; `@fastify/multipart` limits on file size |
| V6 Cryptography | no | No new crypto; photo URL storage is plain text |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| File upload path traversal | Tampering | `@fastify/multipart` does not expose raw filesystem paths; Supabase Storage handles path sanitization |
| Unrestricted file size | Denial of Service | `@fastify/multipart` `limits.fileSize: 10MB` + Fastify `bodyLimit` override on photo route only |
| MIME type spoofing | Tampering | Check `mimetype` from multipart metadata; accept `image/*` only; do not trust client filename extension |
| Unauthorized photo access | Information Disclosure | Supabase Storage bucket must be PRIVATE (service-role key required); do not make bucket public |
| Insecure direct object reference on photo URL | Information Disclosure | Photo URL stored on reservation row; reservation access already requires auth session |
| 409 body leaking server state | Information Disclosure | 409 body already contains `current: Reservation` from Phase 3 (intentional design for conflict resolution) — acceptable |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@tanstack/react-virtual` v3 `useVirtualizer` API: `count`, `getScrollElement`, `estimateSize`, `overscan`, `.getVirtualItems()`, `.getTotalSize()` | Code Examples | Planner writes incorrect import/usage; mitigated by official docs check in Wave 0 |
| A2 | `@fastify/multipart` registration pattern (`request.file()` returns stream with `.filename`, `.mimetype`, `.file`) | Code Examples | Route implementation uses wrong API; mitigated by checking multipart README |
| A3 | `@supabase/supabase-js` StorageClient upload via `supabase.storage.from().upload()` + `getPublicUrl()` | Code Examples | Storage integration fails; mitigated by Supabase docs |
| A4 | Zustand v5 `create<Store>()` signature is unchanged from v4 | Code Examples | Unlikely — Zustand v5 is already in use in `presence-store.ts`; LOW risk |
| A5 | Better Auth `useSession()` returns `session?.user?.name` and `session?.user?.id` for presence badge name lookup | Architecture Patterns | Presence badges may need a different field; mitigated by checking Better Auth session shape in existing settings pages |
| A6 | Drizzle ORM supports `db.update().set().where().returning()` pattern for soft-delete | Code Examples | Standard Drizzle pattern already in use in `reservation-service.ts` for updates; LOW risk |

---

## Open Questions (RESOLVED)

1. **Does Better Auth expose `user.name` on the session?**
   - What we know: `session?.user?.role` is used in settings pages. `userId` is what's in the presence store.
   - What's unclear: Whether `session?.user?.name` is available for resolving staff names in presence badges, or if a separate `/api/v1/staff` list query is needed.
   - Recommendation: Use the existing staff query endpoint (GET /api/v1/admin/users already exists via Better Auth admin plugin) to build a `userId → name` lookup map in the app. Cache with TanStack Query.

2. **Does `noBookingZone` need a DB category enum value?**
   - What we know: The service category tab strip includes "No booking zone" (from CONTEXT.md D-02 and UI-SPEC). The current `reservationCategoryEnum` has `lunch`, `dinner`, `special`, `walk_in`.
   - What's unclear: Whether `noBookingZone` is a visual-only concept (time blocks where no reservations are placed) or needs a DB category value.
   - Recommendation: Treat `noBookingZone` as a timeline display filter — when selected, show a visual overlay on the timeline indicating blocked time, but do not store reservations with this category. No schema change needed.

3. **Should the `acceptanceState` enum use `toConfirm` / `confirmed` naming or `pending_confirmation` / `confirmed`?**
   - What we know: CONTEXT.md RES-06 uses "toConfirm / confirmed". The existing `status` enum uses snake_case values.
   - What's unclear: Whether to use camelCase enum values (matching CONTEXT.md) or snake_case (matching existing enums like `no_show`).
   - Recommendation: Use snake_case in the DB (`to_confirm`, `confirmed`) consistent with existing enum style; Zod schema maps to camelCase types (`toConfirm`, `confirmed`) for TypeScript.

---

## Sources

### Primary (HIGH confidence — verified from codebase)
- `/workspace/packages/web/package.json` — all installed dependency versions
- `/workspace/packages/api/package.json` — all installed API dependency versions
- `/workspace/packages/web/src/components/conflict-modal.tsx` — ConflictModal exact prop interface
- `/workspace/packages/web/src/components/presence-badge.tsx` — PresenceBadge exact prop interface, stub note
- `/workspace/packages/web/src/stores/presence-store.ts` — Zustand pattern for new undo store
- `/workspace/packages/web/src/lib/ws-client.ts` — callback injection pattern (re-use for undo store)
- `/workspace/packages/web/src/lib/queries/reservations.ts` — existing hooks; extension points
- `/workspace/packages/api/src/db/schema/reservations.ts` — confirmed missing columns
- `/workspace/packages/api/src/db/schema/tables.ts` — confirmed `positionX`/`positionY` columns exist for floor plan
- `/workspace/packages/api/src/services/reservation-service.ts` — confirmed hard-delete (must change)
- `/workspace/packages/api/src/lib/simple-secrets.ts` — confirmed `supabaseUrl` + `supabaseSecretKey` already in secrets
- `/workspace/packages/web/vitest.config.ts` + `/workspace/packages/web/playwright.config.ts` — test infrastructure
- `.planning/phases/04-reservation-management-ui/04-CONTEXT.md` — all locked decisions
- `.planning/phases/04-reservation-management-ui/04-UI-SPEC.md` — all layout and visual contracts
- `npm view @tanstack/react-virtual` — version 3.13.23 latest, React 19 compatible peer deps [VERIFIED]
- `npm view @fastify/multipart` — version 10.0.0 latest [VERIFIED]
- `npm view @supabase/supabase-js` — version 2.102.1 latest [VERIFIED]

### Secondary (MEDIUM confidence)
- `@tanstack/react-virtual` v3 `useVirtualizer` API shape — inferred from package description and standard TanStack patterns [ASSUMED — A1]
- `@fastify/multipart` v10 route handler API — inferred from package version and standard multipart patterns [ASSUMED — A2]
- Supabase StorageClient upload API — inferred from standard Supabase JS patterns [ASSUMED — A3]

---

## Metadata

**Confidence breakdown:**
- Schema gap analysis: HIGH — directly verified from source files
- Standard stack (existing): HIGH — verified from package.json
- New library versions: HIGH — verified from npm registry
- Architecture patterns: HIGH — based on existing codebase patterns
- Code examples (existing stack): HIGH — adapted from existing code
- Code examples (new libraries): MEDIUM/ASSUMED — standard patterns, not yet confirmed in this codebase
- Pitfalls: HIGH — derived from direct code inspection

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — stable libraries)
