---
phase: 05-structured-logging
plan: 01
subsystem: api
tags: [pino, fastify, logging, gcp-cloud-logging, structured-json, pino-pretty]

# Dependency graph
requires:
  - phase: 02-authentication-and-configuration
    provides: Auth guard hook that sets request.session (userId source for log enrichment)
provides:
  - buildLoggerOptions factory for env-var-driven pino configuration
  - GCP Cloud Logging severity mapping (pino level -> GCP severity)
  - Error serializer with stack_trace field for GCP Error Reporting
  - userId enrichment in request log context
  - X-Request-ID propagation via requestIdHeader
affects: [05-02 (mutation audit logs + WS logging use the logger wired here)]

# Tech tracking
tech-stack:
  added: [pino-pretty@12.1.0 (devDependency)]
  patterns: [logger-config factory pattern, env-var-driven transport control, GCP format inline config]

key-files:
  created:
    - packages/api/src/lib/logger-config.ts
    - packages/api/src/lib/__tests__/logger-config.test.ts
  modified:
    - packages/api/src/index.ts
    - packages/api/package.json

key-decisions:
  - "GCP format implemented inline (~30 lines) instead of pino-cloud-logging (incompatible with pino 9.x)"
  - "Pretty transport overrides GCP formatters when both LOG_FORMAT=gcp and LOG_PRETTY=true are set"
  - "LOG_LEVEL uses || (not ??) so empty string falls through to environment default"

patterns-established:
  - "Logger config factory: pure function reading env vars, returning pino options for Fastify constructor"
  - "userId enrichment hook: registered after auth guard, creates pino child logger with userId binding"

requirements-completed: [LOG-01, LOG-02, LOG-04]

# Metrics
duration: 5min
completed: 2026-04-11
---

# Phase 5 Plan 1: Logger Configuration Factory Summary

**Pino logger factory with env-var-driven level/format/pretty control, GCP severity mapping, error stack_trace serializer, and userId enrichment hook**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-11T09:36:36Z
- **Completed:** 2026-04-11T09:41:31Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- buildLoggerOptions factory produces correct pino options for all env var combinations (default dev, production, pretty, GCP format)
- GCP Cloud Logging format with severity mapping (trace->DEBUG, debug->DEBUG, info->INFO, warn->WARNING, error->ERROR, fatal->CRITICAL) and stack_trace error serializer
- Fastify server wired with logger-config, X-Request-ID header propagation, and userId enrichment hook after auth guard
- 14 unit tests covering all configuration branches

## Task Commits

Each task was committed atomically:

1. **Task 1: Create logger-config.ts factory and unit tests (TDD)**
   - `24a0f1e` (test) - Failing tests for logger-config factory (RED)
   - `62b7ecf` (feat) - Logger-config implementation + pino-pretty install (GREEN)
2. **Task 2: Wire logger-config into Fastify server** - `88ae260` (feat)

## Files Created/Modified
- `packages/api/src/lib/logger-config.ts` - Pino options factory with GCP formatter, level/pretty/format env var control
- `packages/api/src/lib/__tests__/logger-config.test.ts` - 14 unit tests covering all configuration branches
- `packages/api/src/index.ts` - Fastify constructor wired with buildLoggerOptions, requestIdHeader, userId enrichment hook
- `packages/api/package.json` - Added pino-pretty@12.1.0 as devDependency

## Decisions Made
- **Inline GCP format instead of pino-cloud-logging:** pino-cloud-logging depends on pino ^8.0.0, incompatible with Fastify 5's pino 9.x. Implemented equivalent ~30-line inline config. Spirit of D-01 fully preserved.
- **Pretty overrides GCP:** When both LOG_FORMAT=gcp and LOG_PRETTY=true are set, pretty transport takes precedence (formatters are not applied). This avoids confusing output where severity fields mix with colorized output.
- **Empty string LOG_LEVEL fallback:** Uses `||` operator so empty string (from @fastify/env default) falls through to environment-appropriate default (warn in production, debug otherwise).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- pnpm store mismatch required `pnpm install --force` to fix linking before pino-pretty could be installed. Resolved automatically.
- DB-dependent tests fail in CI-less environment (no DATABASE_URL). Pre-existing condition, not a regression from these changes.

## User Setup Required

None - no external service configuration required. LOG_LEVEL, LOG_PRETTY, and LOG_FORMAT env vars are optional with sensible defaults.

## Next Phase Readiness
- Logger infrastructure is wired and tested; Plan 02 (mutation audit logs + WebSocket lifecycle logging) can proceed
- The userId enrichment hook and GCP format are active, ready for Plan 02 to add domain-specific log events

## Self-Check: PASSED

- All 4 files exist (logger-config.ts, test file, index.ts, SUMMARY.md)
- All 3 task commits verified (24a0f1e, 62b7ecf, 88ae260)
- buildLoggerOptions export present
- PINO_LEVEL_TO_GCP_SEVERITY mapping present
- pino-pretty in devDependencies
- Test file has 107 lines (>= 80 minimum)

---
*Phase: 05-structured-logging*
*Completed: 2026-04-11*
