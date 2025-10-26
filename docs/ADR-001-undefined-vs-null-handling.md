# ADR-001: Use `undefined` for Optional Fields Instead of `null`

## Status
✅ **Accepted** - 2025-01-26

## Context

When integrating Zod schemas (domain-first) with Drizzle ORM (database layer), we encountered type mismatches between optional fields. The core issue was the difference between:

- **JavaScript/TypeScript convention**: `undefined` for absent optional properties
- **SQL/Database convention**: `NULL` for missing values

This manifested as type errors requiring `as any` casts when inserting data:

```typescript
// ❌ Before: Required type casting
const [createdReservation] = await db
  .insert(reservations)
  .values(reservationData as any) // Type mismatch!
  .returning();
```

### The Problem

With `exactOptionalPropertyTypes: true` in TypeScript config:
- Zod schemas infer `email?: string | undefined`
- Drizzle expected `email?: string` or `email: string | null`
- These are **different types** under strict TypeScript settings

### Alternative Solutions Considered

1. **Add conversion logic in routes**: Convert `undefined → null` manually
2. **Use drizzle-zod**: Generate Zod schemas from Drizzle (database-first)
3. **Relax TypeScript settings**: Remove `exactOptionalPropertyTypes`
4. **Align Drizzle with domain model**: Make Drizzle use `undefined` ✅

## Decision

**We chose to align the Drizzle schema with our domain-first Zod schemas by using `undefined` for all optional fields.**

### Rationale

1. **Maintains domain-first architecture**: Zod schemas remain the source of truth
2. **Zero conversion logic**: No manual transformations in API routes
3. **Type safety preserved**: Full TypeScript inference without casts
4. **Consistency**: Single convention across all layers
5. **PostgreSQL compatibility**: Database handles `undefined` as `NULL` automatically

### Implementation

Updated all optional Drizzle schema fields to use `undefined`:

```typescript
// ✅ After: Aligned with domain model
export const reservations = pgTable('reservations', {
  // Required fields
  date: timestamp('date').notNull(),
  customer: jsonb('customer').$type<CustomerInfo>().notNull(),

  // Optional fields use undefined (not null)
  tableIds: jsonb('table_ids').$type<string[] | undefined>(),
  notes: text('notes').$type<string | undefined>(),
  tags: jsonb('tags').$type<string[] | undefined>(),
  source: reservationSourceEnum('source').$type<'phone' | 'web' | 'walk_in' | 'email' | 'other' | undefined>(),
  confirmedAt: timestamp('confirmed_at').$type<Date | undefined>(),
  // ... other optional timestamp fields
});
```

Imported exact Zod types to ensure perfect alignment:

```typescript
import type { CustomerInfo } from '@seatkit/types';
```

### Result

Routes now work with full type safety and zero manual conversions:

```typescript
// ✅ Clean, type-safe code
const reservationData = {
  ...request.body,
  date: new Date(request.body.date),
  status: request.body.status || 'pending',
};

const [createdReservation] = await db
  .insert(reservations)
  .values(reservationData) // No casting needed!
  .returning();
```

## Consequences

### Positive
- ✅ Eliminates all `as any` type casts
- ✅ Maintains domain-first architecture
- ✅ Zero conversion logic in API routes
- ✅ Full TypeScript type safety
- ✅ Consistent with `exactOptionalPropertyTypes: true`

### Negative
- ⚠️ Requires custom `$type<T>()` annotations for all optional fields
- ⚠️ Deviates from default Drizzle conventions (which use `null`)
- ⚠️ Future Drizzle updates might conflict with this approach

### Mitigation
- Document this pattern clearly for all developers
- Consider this when adding new optional fields
- Monitor Drizzle releases for breaking changes to `$type()` API

## References

- **TypeScript `exactOptionalPropertyTypes`**: [Documentation](https://www.typescriptlang.org/tsconfig#exactOptionalPropertyTypes)
- **Drizzle `$type()` method**: [Custom types documentation](https://orm.drizzle.team/docs/custom-types)
- **Related GitHub issue**: Our reservations.ts type casting problem
- **Architecture document**: `/ARCHITECTURE.md` - Domain-first approach

---

## Pattern for Future Fields

When adding new optional fields, follow this pattern:

```typescript
// ❌ Don't: Default Drizzle (uses null)
newField: text('new_field'),

// ✅ Do: Align with domain (uses undefined)
newField: text('new_field').$type<string | undefined>(),
```

This ensures consistency with our domain-first architecture and maintains type safety.