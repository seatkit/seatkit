# @seatkit/types Changelog

## [0.1.0] - 2025-10-25

### Added

#### Core Domain Schemas
- **Reservation**: Customer bookings with time, party size, status tracking, and category management
  - Statuses: pending, confirmed, seated, completed, cancelled, no_show
  - Categories: lunch, dinner, special, walk_in
  - Includes customer info (name, phone, email, notes)
  - Tracks metadata (createdBy, source, timestamps for each status change)

- **Table**: Physical restaurant tables with capacity and layout management
  - Capacity constraints: min, optimal, max party sizes
  - Status tracking: available, occupied, reserved, unavailable
  - Current reservation linking (currentReservationId, currentPartySize)
  - Room assignment (configurable per restaurant)
  - Layout properties: position, dimensions, shape (circle, square, rectangle)
  - Features and tagging support

- **Room**: Configurable restaurant areas/rooms
  - Flexible room definitions (e.g., "Main Dining", "Bar", "Patio")
  - Display ordering and color coding
  - Can be enabled/disabled

- **Session**: User sessions for collaborative editing
  - Real-time presence tracking
  - Session context (current view, focused reservation/table)
  - Device type tracking
  - Status: active, idle, offline

- **Sales**: Daily sales tracking with category breakdowns
  - Sales by category (lunch, dinner, special, walkIn, other)
  - Cover counts by category
  - Manager-only editing controls
  - Automatic average check size calculation
  - Monthly and yearly aggregations (computed on-demand)

- **Profile**: User accounts with role-based permissions
  - Three roles: owner, manager, staff
  - Granular permission system (11 permission flags)
  - User preferences (theme, notifications, default views)
  - Single restaurant support (v1)

- **Restaurant**: Restaurant configuration and settings
  - Operating hours with break periods
  - Service period configuration (lunch, dinner)
  - Reservation settings (booking window, party sizes, timing)
  - Manual confirmation workflow (v1)
  - Address and branding information

#### Utilities
- **Result Type**: Functional error handling inspired by Rust
  - `ok(value)`, `err(error)` constructors
  - Type guards: `isOk`, `isErr`
  - Transformations: `map`, `mapErr`, `andThen`
  - Promise integration: `fromPromise`, `tryCatch`

- **Validation**: Zod schema validation helpers
  - `validate()`: Sync validation with Result type
  - `validateAsync()`: Async validation support
  - `validatePartial()`: Partial validation for PATCH operations
  - Detailed field-level error reporting

#### Common Types
- DateTime, Date, Time, UUID schemas
- Email, Phone validation
- Money (integer cents) with currency support
- Positive/NonNegative integer helpers
- BaseEntity with id, createdAt, updatedAt

### Design Decisions

#### V1 Scope Simplifications
- **Roles**: Reduced from 5 roles (owner/manager/host/server/viewer) to 3 (owner/manager/staff)
- **User Preferences**: Removed SMS notifications, moved reservation defaults to restaurant settings
- **Restaurant**: Single restaurant support (multi-restaurant deferred)
- **Automation**: Manual confirmation only (auto-confirm deferred)
- **Session**: Simple device tracking (removed detailed device info)
- **Collaborative**: Context tracking enabled, cursor position removed

#### Schema Refinements
- Table shape: Simplified to circle, square, rectangle (removed oval)
- Table organization: Changed `area` to `roomId` with configurable Room entities
- Reservation linking: Tables track currentReservationId and currentPartySize
- Audit tracking: Added `createdBy` to Reservation and Sales
- Sales verification: Removed `verifiedBy`/`verifiedAt` (deferred)

### Technical
- Pure ESM package
- TypeScript 5.6+ with strict mode
- Zod 3.x for runtime validation
- Vitest for testing
- Full type safety with inferred types from schemas
