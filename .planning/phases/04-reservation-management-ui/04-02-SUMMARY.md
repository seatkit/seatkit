---
phase: 04-reservation-management-ui
plan: "02"
subsystem: api
tags: [reservation, photo-upload, multipart, supabase-storage, api, web]
dependency_graph:
  requires:
    - "@seatkit/types ReservationSchema with photoUrl field (Plan 01 or this plan)"
    - "Drizzle reservations table with photo_url column (Plan 01 or this plan)"
  provides:
    - "POST /api/v1/reservations/:id/photo route with multipart file upload"
    - "uploadReservationPhoto function in packages/api/src/services/photo-service.ts"
    - "@fastify/multipart registered with 10 MB limit in index.ts"
    - "recover and photo endpoints in API_ENDPOINTS (packages/web/src/lib/api-config.ts)"
    - "PhotoUploadResponseSchema and PhotoUploadResponse type in packages/web/src/lib/api-types.ts"
  affects:
    - "packages/api/src/routes/reservations.ts"
    - "packages/api/src/index.ts"
    - "packages/web/src/lib/api-config.ts"
    - "packages/web/src/lib/api-types.ts"
tech_stack:
  added:
    - "@fastify/multipart@10.0.0 — multipart/form-data parsing for Fastify"
    - "@supabase/supabase-js@2.102.1 — Supabase Storage client"
  patterns:
    - "Photo upload: multipart stream → Buffer.concat → Supabase Storage → public URL → persist to DB"
    - "MIME allowlist: server-side Set<string> check before any upload attempt (T-04-02-01)"
    - "File size enforcement: @fastify/multipart limits.fileSize catches > 10 MB before handler body (T-04-02-02)"
    - "Credentials at request time: createClient reads env vars per-request — never returned to client (T-04-02-03)"
    - "Path safety: storage path = UUID/timestamp.ext — reservationId validated by IdParamsSchema (T-04-02-06)"
key_files:
  created:
    - packages/api/src/services/photo-service.ts
  modified:
    - packages/api/package.json
    - packages/api/src/index.ts
    - packages/api/src/routes/reservations.ts
    - packages/api/src/db/schema/reservations.ts
    - packages/types/src/schemas/reservation.ts
    - packages/web/src/lib/api-config.ts
    - packages/web/src/lib/api-types.ts
    - pnpm-lock.yaml
decisions:
  - "@fastify/multipart limits.fileSize = 10 MB enforced at plugin level — handler only runs if file is within limit; RequestFileTooLargeError catch in handler translates to 413 for safety (belt-and-suspenders)"
  - "uploadReservationPhoto creates a new Supabase client per request from env vars — avoids module-level client that would break test isolation and prevents credential caching across requests"
  - "Storage path uses reservationId (UUID-validated) + Date.now() — no upsert to prevent overwriting; old photos persist in Storage until manual cleanup"
  - "photo_url persisted to reservation row after successful upload so GET /reservations returns the URL in photoUrl field without a separate fetch"
metrics:
  duration: "~25min"
  completed: "2026-04-08"
  tasks_completed: 2
  files_modified: 8
---

# Phase 4 Plan 02: Reservation Photo Upload Backend Summary

**One-liner:** Multipart photo upload pipeline with @fastify/multipart + Supabase Storage, MIME allowlist, 10 MB limit enforcement, and public URL persistence to reservation rows.

## What Was Built

### Task 1 — Install dependencies, register multipart, create photo service (commit 3c03a91)

**Dependencies installed:**
- `@fastify/multipart@10.0.0` added to `packages/api/package.json`
- `@supabase/supabase-js@2.102.1` added to `packages/api/package.json`

**`packages/api/src/index.ts`:**
- Imports and registers `@fastify/multipart` with `limits.fileSize = 10 * 1024 * 1024` (10 MB) and `limits.files = 1` (T-04-02-02)
- Registration placed after `@fastify/rate-limit`, before OpenAPI — no ordering conflicts

**`packages/api/src/services/photo-service.ts` (new file):**
- Exports `uploadReservationPhoto(reservationId, fileBuffer, mimetype, fastify): Promise<string>`
- Server-side `ALLOWED_MIME_TYPES` Set: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `image/heif` (T-04-02-01)
- Non-allowed MIME type → `fastify.httpErrors.unsupportedMediaType` (415)
- Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY` from env at request time (T-04-02-03)
- Storage path: `${reservationId}/${Date.now()}.${ext}` — UUID-validated ID, no path traversal (T-04-02-06)
- Upload failure → `fastify.httpErrors.internalServerError` (500)
- Success → returns Supabase public URL via `getPublicUrl`

**Schema additions (both Plan 01 and this plan targeted these):**
- `packages/types/src/schemas/reservation.ts`: `photoUrl: z.string().url().nullable().optional()`
- `packages/api/src/db/schema/reservations.ts`: `photoUrl: text('photo_url').$type<string | null>()`

### Task 2 — Photo upload route and web API config (commit f16ad8a)

**`packages/api/src/routes/reservations.ts`:**
- Added `and` to drizzle-orm imports, added `uploadReservationPhoto` import from `photo-service.js`
- New route `POST /reservations/:id/photo`:
  - Verifies reservation exists and `isDeleted = false` (returns 404 otherwise)
  - Calls `request.file()` wrapped in try/catch to translate `@fastify/multipart` limit errors to 413
  - Reads stream into `Buffer.concat(chunks)` for Supabase upload
  - Delegates to `uploadReservationPhoto` (throws 415 or 500 as needed)
  - Persists `photoUrl` and `updatedAt = new Date()` to reservation row via Drizzle UPDATE
  - Fires `notifyReservationChange({ type: 'reservation_changed', reservationId })` fire-and-forget
  - Returns `{ photoUrl, message: 'Photo uploaded successfully' }` with 200

**`packages/web/src/lib/api-config.ts`:**
- Added `recover: (id) => /api/v1/reservations/${id}/recover` to `API_ENDPOINTS.reservations`
- Added `photo: (id) => /api/v1/reservations/${id}/photo` to `API_ENDPOINTS.reservations`

**`packages/web/src/lib/api-types.ts`:**
- Added `PhotoUploadResponseSchema = z.object({ photoUrl: z.string().url(), message: z.string() })`
- Added `PhotoUploadResponse` type inferred from schema

## Deviations from Plan

None — plan executed exactly as written. All three verification commands from the plan pass:
- `pnpm --filter @seatkit/api build` exits 0
- `pnpm --filter @seatkit/web build` exits 0
- All `grep` checks confirm each artifact is present with expected patterns

## Known Stubs

None — the photo upload route is fully wired end-to-end:
- Multipart parsing → MIME validation → Supabase Storage upload → DB persistence → response
- `photoUrl` field flows from Zod schema → Drizzle schema → GET /reservations response body

## Threat Flags

No new threat surface beyond what the plan's threat model already covers. All mitigations from STRIDE register implemented:

| Mitigation | Location | Status |
|---|---|---|
| T-04-02-01: MIME allowlist | photo-service.ts ALLOWED_MIME_TYPES | Implemented |
| T-04-02-02: 10 MB file limit | index.ts limits.fileSize + route catch | Implemented |
| T-04-02-03: Credential isolation | photo-service.ts reads env per-request | Implemented |
| T-04-02-04: Auth guard | index.ts onRequest hook (pre-existing) | Inherited |
| T-04-02-05: Cross-reservation upload | Accepted (all staff have equal access) | Accepted |
| T-04-02-06: Path traversal | IdParamsSchema UUID validation | Implemented |

## Self-Check: PASSED

| Item | Result |
|------|--------|
| packages/api/package.json contains @fastify/multipart | FOUND |
| packages/api/package.json contains @supabase/supabase-js | FOUND |
| packages/api/src/services/photo-service.ts | FOUND |
| packages/api/src/index.ts registers multipart | FOUND |
| packages/api/src/routes/reservations.ts has /photo route | FOUND |
| packages/web/src/lib/api-config.ts has recover + photo endpoints | FOUND |
| packages/web/src/lib/api-types.ts has PhotoUploadResponseSchema | FOUND |
| Commit 3c03a91 (Task 1) | FOUND |
| Commit f16ad8a (Task 2) | FOUND |
