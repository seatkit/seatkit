# Feature Landscape

**Domain:** Restaurant reservation and sales management (small, high-turnover restaurants)
**Researched:** 2026-04-06
**Reference Implementation:** KoenjiApp (Swift iOS, 9+ months production at Koenji restaurant)

---

## Table Stakes

Features users expect from any serious reservation management tool. Missing any of these means staff will resist adoption and revert to paper or the old iOS app.

| Feature | Why Expected | Complexity | KoenjiApp Source |
|---------|--------------|------------|-----------------|
| Reservation CRUD (name, phone, party size, date, time) | Core operation — taking a reservation | Low | `Reservation.swift`, `ReservationServices.swift` |
| Reservation category (lunch / dinner / closed) | Restaurants run discrete service periods, not open-ended calendars | Low | `ReservationCategory` enum |
| Reservation status lifecycle (pending → showedUp / canceled / noShow / late / toHandle) | Staff need to track what actually happened to each booking | Low | `ReservationStatus` enum |
| Reservation type (inAdvance / walkIn / waitingList) | Walk-ins need immediate slot validation; waiting list needs later assignment | Low | `ReservationType` enum, auto-detected on creation |
| Acceptance flag (confirmed / toConfirm) | Common workflow: take a booking, call back to confirm, mark confirmed | Low | `Acceptance` enum |
| Free-text notes per reservation | Special requests, dietary restrictions, VIP notes | Low | `notes: String?` |
| Table assignment to reservation | Core constraint: party must sit somewhere | High | `TableAssignmentService.swift`, `LayoutServices.assignTables()` |
| Availability checking (no-overlap enforcement) | Prevents double-booking the same table in the same time window | High | `isTableOccupied()` with grace period support |
| Timeline / Gantt view | Staff need to see how the whole service is laid out at a glance | High | `TimelineGantView.swift` — per-table rows, per-hour columns |
| List view with search | Quick lookup by guest name for phone-call reservations | Medium | `ListViewModel.swift`, `searchText` field |
| List filtering (by status, date range, party size, type) | Specific operational needs: "show me all cancellations", "show waiting list" | Medium | `FilterOption` enum: none / people / date / canceled / toHandle / deleted / waitingList / webPending |
| List sorting (chronological, alphabetical, by party size, by creation date) | Different staff roles need different views | Low | `SortOption` enum |
| List grouping (by day, week, month, table) | Weekly planning, per-table occupancy review | Low | `GroupOption` enum |
| Soft-delete (mark deleted, do not purge) | Audit trail; "deleted" reservations still appear in filtered view for recovery | Low | `deleteReservation()` sets `status = .deleted`, `reservationType = .na` |
| Reservation recovery (restore from canceled/deleted back to pending with auto-table assignment) | Common undo — guest calls back | Medium | `handleRecover()` re-runs `assignTables()` |
| Multi-device support (same data across all staff devices) | Restaurant staff use multiple phones/iPads simultaneously | High | Firebase real-time sync in KoenjiApp; SeatKit uses PostgreSQL + real-time layer |
| Authentication (staff login, session isolation) | Data must not be publicly accessible | Medium | Apple Sign-In + Firebase Auth in KoenjiApp |
| Sales data entry (daily, per service period) | Managers enter end-of-shift revenue — core operational data | Medium | `SaleCategory.swift`, `DailySales`, `SalesFirebaseService.swift` |
| Sales reporting (daily / monthly / yearly rollup) | Owner-level visibility into revenue trends | Medium | `MonthlySalesRecap`, `YearlySalesRecap` in `SaleCategory.swift` |
| Role-based access to sales totals | Sensitive revenue figures should not be visible to all staff | Low | `SalesStore.isAuthorized`, password-gated in KoenjiApp |
| Restaurant configuration (tables, capacity, service hours) | System must match the physical restaurant before it can be useful | Medium | `TableStore.baseTables`, configurable table layout |

---

## Differentiators

Features that go beyond what basic booking tools provide. KoenjiApp already has most of these, so SeatKit must preserve them to deliver equivalent value.

| Feature | Value Proposition | Complexity | KoenjiApp Source |
|---------|-------------------|------------|-----------------|
| Visual table layout with drag-to-move | Staff see the physical restaurant and can rearrange tables for special events | High | `LayoutView.swift`, `LayoutServices.moveTable()`, grid-based 3x3 table units |
| Per-date, per-category layout snapshots that propagate forward | Rearranging tables for tonight's dinner does not overwrite tomorrow's default layout | High | `LayoutCache` keyed by `date-category`, `propagateLayoutChange()` copies to future slots |
| Automatic table assignment (prefer contiguous blocks, configurable priority order) | Hosts do not have to manually figure out which tables can seat a party of 5 | High | `TableAssignmentService.assignTablesPreferContiguous()` with `tableAssignmentOrder: [T1,T2,T3,T4,T6,T7,T5]` |
| Manual table assignment override (force a starting table) | Hosts sometimes want to honor a guest preference or keep specific tables free | Medium | `assignTablesManually(startingFrom:)` with contiguous-block fallback |
| Cluster visualization (show which tables belong to the same reservation) | Layout view shows table groups per reservation as distinct colored blocks | High | `ClusterServices.swift`, `CachedCluster`, `ClusterView.swift`, LRU-cached cluster state |
| Session presence tracking (who is actively editing) | Staff can see which colleague is working on a reservation before touching it | High | `Session.swift` (isEditing, deviceName, profileImageURL), `SessionService.swift`, `SessionStore` |
| Granular sales breakdown (letturaCassa / fatture / yami / yamiPulito / bento / cocai) | Restaurant-specific revenue categorization for accounting reconciliation | Medium | `SaleCategory` fields — lunch-only: bento, persone; dinner-only: cocai; both: letturaCassa, fatture, yami, yamiPulito |
| Average spend per lunch customer | Operational metric for manager review (totalLunchSales / persone) | Low | `DailySales.averageLunchSpend`, `MonthlySalesRecap.averageLunchSpend` |
| Per-reservation color coding (stable hue derived from UUID) | Fast visual identification of reservation blocks in timeline and layout views | Low | `Reservation.stableHue(for:)`, `assignedColor: Color` |
| Per-reservation emoji tag | Quick non-verbal identifier on crowded layout views | Low | `assignedEmoji: String?` |
| Waiting list with confirm-to-seated flow | When a table frees up, host promotes a waiting-list entry and system assigns tables automatically | Medium | `handleConfirm()` re-runs `assignTables()` and changes `reservationType → inAdvance`, `status → pending` |
| Walk-in auto-detection | Reservation created same day and time as service start is automatically classified as walk-in | Low | `determineReservationType()` compares `creationDate` vs `startTimeDate` |
| Preferred language per reservation | Multilingual restaurant environment; staff know which language to use when greeting guest | Low | `preferredLanguage: String?`, `effectiveLanguage` defaults to "it" |
| Image attachment per reservation | VIP guest photo, accessibility needs, or confirmation screenshot | Medium | `imageData: Data?`, `toLightweight()` strips image for Firestore sync |
| Group flag | One-touch indicator that a party is a large group needing special handling | Low | `group: Bool` |
| noBookingZone category | Block a service period (e.g. private event, closed day) without deleting reservations | Low | `ReservationCategory.noBookingZone` |
| Real-time table locking during assignment | Prevents two staff from assigning the same table simultaneously | High | `lockedIntervals: [Int: [(start:end:)]]` in `LayoutServices`, `lockTable()` / `unlockTable()` |
| Data export / backup | Cloud backup ensures data survives device loss | Medium | `FirebaseBackupService.swift` |
| ±7-day preload cache | Prevents UI stutter when navigating to adjacent dates | Medium | `CurrentReservationsCache.preloadDates(around:range:)` |

---

## Anti-Features

Features to explicitly NOT build in v1. These either dilute focus, add disproportionate complexity, or contradict the self-hosted open-source design.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Customer-facing booking portal | Different trust model (public internet), requires email/SMS infrastructure, GDPR implications — different product surface | Explicitly out of scope in PROJECT.md; revisit post-v1 if demand exists |
| AI-powered demand forecasting or dynamic slot suggestion | Requires historical data corpus and ML pipeline; does not fit small-restaurant operational reality | Provide raw sales and occupancy data so operators can draw their own conclusions |
| SMS / email confirmation automation to guests | Requires external SMS/email provider integration, per-message cost, deliverability management | Staff phone-call workflow already works; automated guest comms is a separate SaaS product problem |
| POS integration | POS systems vary enormously; integration is contractual and per-vendor; out of scope for self-hosted tool | Sales data entry is manual — this is intentional and matches current KoenjiApp behavior |
| Online payment / deposits | Payment processing (Stripe, etc.) adds compliance overhead (PCI-DSS), legal liability, complex refund flows | Not needed for a restaurant that manages its own bookings directly with guests |
| Multi-tenancy (shared SaaS hosting) | Violates the self-hosted design goal; each restaurant runs their own instance | One instance = one restaurant; document clear self-hosting instructions instead |
| Advanced analytics dashboard (cohort analysis, LTV, etc.) | Premature given single-restaurant data volumes; v1 sales reporting already covers the need | Monthly/yearly rollup is sufficient; v2 can add charts |
| Apple Pencil / handwriting recognition | iOS-native feature (PencilKit); not available on web; `ScribbleService.swift` does not translate | Notes field via keyboard covers the same use case on web |
| React Native mobile app | Increases maintenance surface; iOS stays native Swift calling the SeatKit REST API | Keep iOS app separate; REST API design ensures mobile client is first-class |
| Publicly writable reservation endpoint | Web booking portal requires rate limiting, captcha, spam prevention | Staff-only internal tool — authentication gates all mutation |
| Complex permission role matrix (RBAC) | Overkill for a 15-person staff; two tiers (staff vs manager) cover all real scenarios | Simple boolean: can view sales totals (manager) vs cannot (staff) |

---

## Feature Dependencies

```
Auth (login + session) → ALL other features (nothing is accessible unauthenticated)

Restaurant config (tables, hours, categories)
  → Table assignment (needs table definitions)
  → Layout view (needs table positions)
  → Timeline view (needs service hours + categories)

Reservation CRUD
  → Table assignment (creating a reservation triggers assignment)
  → List view (needs reservations to display)
  → Timeline view (reservations populate the Gantt)
  → Session tracking (edit operations update session state)

Table assignment
  → Cluster visualization (clusters derived from assigned tables)
  → Availability checking (prevents conflicts)
  → Manual override (requires automatic to fall back on)

Layout snapshots (per-date, per-category)
  → Visual layout view (snapshots are the source of truth for what the floor looks like)
  → Cluster visualization (clusters keyed to same date-category key)

Sales CRUD
  → Sales reporting (monthly/yearly rollups aggregate daily entries)
  → Role-based access (manager gate on totals)

Session presence tracking
  → Real-time collaboration awareness (staff can see active editors)
```

---

## KoenjiApp Features to Preserve (Non-Negotiable)

These are production-proven behaviors that staff rely on daily. Any deviation risks rejection of the web app.

| Behavior | Rationale |
|----------|-----------|
| Soft-delete with status trail | Deleted reservations are recoverable; audit history visible in filtered list |
| Walk-in auto-classification | Zero friction for walk-ins — no manual type selection needed |
| Contiguous table preference in auto-assignment | Neighboring tables create a better guest experience; priority order (`T1, T2, T3, T4, T6, T7, T5`) matches physical layout |
| Per-date, per-category layout that copies forward | Changing tonight's layout does not disrupt next week's default |
| Waiting list → confirmed flow (re-runs table assignment) | Single tap promotes a waiting guest to a confirmed reservation with tables |
| Separation of lunch and dinner service periods | Timeline, layout, and filters all scope to a single category at a time |
| Manager-gated sales totals | Revenue data is sensitive; password protection is the simplest acceptable gate |
| Sales breakdown with restaurant-specific categories (yami, yamiPulito, bento, cocai, etc.) | These map directly to the restaurant's accounting workflow — changing them breaks manager habits |
| Last-edited timestamp on reservations | Staff can tell who touched a reservation most recently without full audit logs |
| Reservation color derived from UUID | Color is stable across devices, sessions, and refreshes — no color assignment needed |

---

## MVP Recommendation

**Build in priority order:**

1. **Reservation CRUD + status lifecycle** — the atomic unit of the system; everything else depends on it
2. **Table configuration + availability checking** — prerequisite for assignment; prevents overbooking
3. **Automatic table assignment** — the feature that replaces manual table tracking; core time-saver
4. **List view (search + filter + sort + group)** — primary interface for hosts answering the phone
5. **Timeline / Gantt view** — visual overview of the whole service; second-most-used screen in KoenjiApp
6. **Session presence tracking** — real-time collaboration safety net; needed before multi-user rollout
7. **Sales data entry + daily/monthly/yearly reporting** — required for end-of-shift workflow; manager gate on totals
8. **Authentication (staff login)** — must exist before any production deployment

**Defer to post-MVP:**

- Visual table layout drag-to-move (high complexity; list + timeline cover daily operations)
- Cluster visualization (depends on layout view)
- Image attachment per reservation (requires file storage; notes field covers immediate needs)
- ±7-day preload cache optimization (correctness over performance in v1)
- Advanced sales breakdown (bento, cocai, yamiPulito) — ship with basic fields first, add in v1.1 once migration data is validated

---

## Sources

- KoenjiApp source code at `/Users/matteonassini/KoenjiApp` (production implementation, HIGH confidence)
- [Key Features of a Restaurant Reservation System in 2026 — Foodiv](https://www.foodiv.com/features-of-restaurant-reservation-system/)
- [Restaurant Table Management Software: The Complete Guide for 2026 — RestaurantsTables](https://restaurantstables.com/blog/restaurant-table-management-software-guide.html)
- [The 6 Best Restaurant Reservation Systems for 2026 — TouchBistro](https://www.touchbistro.com/blog/best-restaurant-reservation-systems/)
- [Best Restaurant Waitlist Software 2026 — WaitQ](https://waitq.app/blog/best-restaurant-waitlist-software)
- [Restaurant Reservation System Basics: A 2025 Guide — Tableo](https://tableo.com/technology-innovation/restaurant-reservation-system-basics-2025/)
- [The 13 Best Online Restaurant Reservation Systems 2026 — EatApp](https://restaurant.eatapp.co/blog/online-restaurant-reservation-systems)
