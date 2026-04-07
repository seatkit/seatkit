# Coding Conventions

**Analysis Date:** 2026-04-06

## Naming Patterns

**Files:**
- TypeScript source files: lowercase with hyphens (e.g., `reservation.ts`, `glass-container.tsx`)
- Test files: same name as source with `.test.ts` or `.test.tsx` suffix (e.g., `reservation.test.ts`)
- Config files: camelCase or kebab-case (e.g., `vitest.config.ts`, `eslint.config.js`)
- Index/barrel files: `index.ts` for re-exports

**Functions:**
- Exported functions: camelCase (e.g., `formatMoney`, `addMinutes`, `isSameDay`, `apiRequest`)
- Internal/helper functions: camelCase (e.g., `conditionalProp`, `handleKeyboardInteraction`)
- Async functions: camelCase with async keyword (e.g., `async function createServer()`)

**Variables:**
- Regular variables: camelCase (e.g., `mockFetch`, `result`, `baseClassName`)
- Constants: UPPER_CASE (e.g., `NODE_ENV`, `PORT`, `TEST_DATABASE_URL`)
- React component instances: PascalCase (e.g., `LiquidGlass`)

**Types:**
- Type aliases: PascalCase (e.g., `Result<T, E>`, `Ok<T>`, `Err<E>`, `GlassContainerProps`)
- Zod schemas: PascalCase with Schema suffix (e.g., `ReservationStatusSchema`, `CustomerInfoSchema`, `CreateReservationSchema`)
- Extracted types from schemas: PascalCase matching schema name (e.g., `Reservation`, `CustomerInfo`, `CreateReservation`)
- Generic type parameters: single uppercase letter (e.g., `<T>`, `<E>`, `<F>`)

**Constants & Enums:**
- Schema enum values: lowercase with underscores (e.g., `'pending'`, `'walk_in'`, `'lunch'`)
- Object literal properties: any format allowed (ruled by `objectLiteralProperty` ESLint rule)

## Code Style

**Formatting:**
- Tool: Prettier
- Print width: 80 characters
- Indentation: tabs (tabWidth: 2 for calculation, but uses actual tabs)
- Semicolons: required
- Single quotes: yes
- Trailing commas: all (in arrays/objects)
- Arrow function parens: avoid when possible (`(x) => x * 2` becomes `x => x * 2`)
- Bracket spacing: yes (`{ name: 'John' }`)

**Linting:**
- Tool: ESLint with @typescript-eslint
- Config: `@seatkit/eslint-config` shared package
- Strict TypeScript checking enabled:
  - No implicit any (warn level)
  - No unsafe assignments (error)
  - Explicit function return types required (error)
  - Explicit module boundary types required (error)
  - Promise handling rules enforced (no floating promises, await thenable, no misused promises)

## Import Organization

**Order:**
1. Built-in modules (`import fs from 'fs'`)
2. External packages (`import { z } from 'zod'`)
3. Internal modules (`import { db } from '../db/index.js'`)
4. Parent/sibling imports (`import { GlassContainer } from '../../components/glass-container.js'`)
5. Index imports (`import from './'`)
6. Type imports (`import type { Result } from '@seatkit/types'`)

**Specifics:**
- Type imports preferred via `import type` syntax (enforced)
- Always use explicit imports over wildcard imports (except for barrel exports)
- Alphabetize within groups (case-insensitive)
- No duplicate imports from same module
- ESM imports with `.js` extensions required for TypeScript files

**Path Aliases:**
- Workspace imports use full package names: `@seatkit/types`, `@seatkit/utils`, `@seatkit/api`
- No path aliases configured; relative imports used within packages

## Error Handling

**Patterns:**
- **Zod validation errors**: Caught and converted using `zodErrorToValidationError()` from `@seatkit/types/utils/validation`
  - See `packages/types/src/utils/validation.ts` for helper functions
- **HTTP errors**: Use `@fastify/sensible` plugin for standard HTTP error objects
  - Throw HTTP errors directly: `throw fastify.httpErrors.notFound('message')`
  - No try-catch needed; Fastify catches and converts to proper HTTP responses
  - See `packages/api/src/routes/reservations.ts` for examples
- **Functional error handling**: Result type (`Ok<T> | Err<E>`) for non-throwing patterns
  - Use `isOk()` and `isErr()` type guards for pattern matching
  - Functions available: `ok()`, `err()`, `unwrap()`, `unwrapOr()`, `map()`, `mapErr()`, `andThen()`, `fromPromise()`, `tryCatch()`
  - See `packages/types/src/utils/result.ts` for full implementation
- **Async errors**: `fromPromise()` wraps Promise rejections in Result type
- **Sync errors**: `tryCatch()` wraps sync function exceptions in Result type

**Database operations:**
- Drizzle ORM used for database access
- Errors thrown directly; framework handles serialization
- Database connection pooling configured via environment variables

## Logging

**Framework:** Fastify built-in logger

**Patterns:**
- Use `fastify.log.info()`, `fastify.log.error()`, `fastify.log.debug()`, `fastify.log.warn()`
- Log level determined by NODE_ENV: 'info' for production, 'debug' for development
- Structured logging with object payloads: `fastify.log.info({ id: userId }, 'Description')`
- Error logging includes error object: `fastify.log.error({ error }, 'Failed operation')`
- See `packages/api/src/routes/reservations.ts` for patterns

**Console usage:**
- Discouraged for library code (warn level)
- Acceptable for server startup/shutdown messages
- Use `console.log()` for startup messages, Fastify logger for request-level logs

## Comments

**When to Comment:**
- JSDoc comments for public functions and types (required for exported items)
- JSDoc comments for complex algorithms or non-obvious business logic
- Inline comments for explanatory notes, workarounds, or context
- Comments for important decisions or gotchas (e.g., timezone handling, date serialization)

**JSDoc/TSDoc:**
- All exported functions have JSDoc blocks with `@param`, `@returns`, `@example` tags
- Module-level JSDoc with `@module` tag at top of file
- Inline types documented with JSDoc comments explaining purpose
- See `packages/utils/src/date.ts` for excellent examples with detailed explanations

**Example patterns:**
```typescript
/**
 * Add minutes to a date (immutable)
 *
 * Returns a new Date object without modifying the original.
 * Useful for calculating reservation end times.
 *
 * @param date - The starting date
 * @param minutes - Number of minutes to add (can be negative)
 * @returns A new Date object with minutes added
 *
 * @example
 * const startTime = new Date('2025-01-15T19:00:00Z');
 * const endTime = addMinutes(startTime, 90);
 */
export function addMinutes(date: Date, minutes: number): Date { ... }
```

## Function Design

**Size:** Functions kept short and focused (typically < 30 lines)
- API route handlers wrapped in async IIFE or callback pattern
- Helper functions extracted for repeated logic (e.g., `conditionalProp()`, `handleKeyboardInteraction()`)

**Parameters:**
- Explicit parameters preferred over object destructuring when 1-2 params
- Object destructuring for 3+ parameters or configuration objects
- Type annotations always explicit (no implicit any)
- Optional parameters marked with `?` in type definition

**Return Values:**
- Explicit return type annotations required by linting rules
- Async functions return `Promise<T>` or `Promise<Result<T, E>>`
- HTTP handlers return typed response bodies (typed via Fastify type provider)
- Void return explicitly stated for side-effect-only functions

**Arrow functions:**
- Preferred over function declarations for callbacks
- Single expression: parentheses optional (`x => x * 2`)
- Multiple statements: braces required with explicit return

## Module Design

**Exports:**
- Named exports preferred for most functions and types
- Default export only for Fastify route plugin functions
- Barrel files (`index.ts`) for grouping related exports from a package
- All exported items are public API; internal items stay within files

**Barrel Files:**
- Used in `@seatkit/types/src/utils/index.ts` to re-export utilities
- Used in `@seatkit/types/src/schemas/index.ts` to re-export all schemas
- Single purpose: make imports from package root cleaner
- See `packages/types/src/index.ts` for full example

**Re-exports:**
- Use `export * from './module.js'` for complete re-exports
- Use `export { Item } from './module.js'` for selective re-exports
- Type imports use `export type { Type } from './module.js'`

**Subpath exports:**
- Test utilities available via subpath: `@seatkit/utils/test-utils`
- Production code cannot import from test utilities
- Configured in package.json with `exports` field

## Date Handling

**Critical Pattern:** All dates in SeatKit are UTC-based

- Store dates in UTC in database
- Serialize dates as ISO strings in JSON responses (handled by custom Fastify serializer)
- Frontend responsible for converting to/from restaurant's local timezone
- Use `z.coerce.date()` in Zod schemas for automatic ISO string parsing to Date objects
- Use UTC methods: `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()` (never local time methods)
- See `packages/utils/src/date.ts` for utility functions

## Package-Specific Conventions

**@seatkit/types:**
- Zod schemas are source of truth for validation and type definitions
- Extract TypeScript types from schemas using `z.infer<typeof Schema>`
- Test every schema variant (Create, Update, Filters)

**@seatkit/api:**
- Route definitions as Fastify plugins (async functions)
- Schemas passed to Fastify route handler options for automatic validation
- Custom serializer handles Date → ISO string conversion
- Prefix routes in registration: `fastify.register(plugin, { prefix: '/api' })`

**@seatkit/web:**
- React components use forwardRef for ref forwarding when appropriate
- Props interfaces named `ComponentNameProps`
- Components may have `displayName` set for debugging

**@seatkit/ui:**
- Component variants defined with CVA (class-variance-authority)
- Props interface extends both base props and CVA variant props
- Components exported from `src/index.ts`

---

*Convention analysis: 2026-04-06*
