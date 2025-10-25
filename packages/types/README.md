# @seatkit/types

Core type definitions and Zod schemas for SeatKit.

## Overview

This package provides the foundational type system for the entire SeatKit ecosystem. It includes:

- **Zod Schemas**: Runtime-validated schemas for all domain entities
- **TypeScript Types**: Type-safe interfaces inferred from schemas
- **Validation Utilities**: Helper functions for common validation patterns
- **Result Types**: Functional error handling without exceptions

## Installation

```bash
pnpm add @seatkit/types
```

## Usage

### Basic Schema Validation

```typescript
import { ReservationSchema, validate } from '@seatkit/types';

const reservationData = {
	date: '2025-01-15T19:00:00Z',
	duration: 120,
	customer: {
		name: 'John Doe',
		phone: '+1-555-123-4567',
		email: 'john@example.com',
	},
	partySize: 4,
	category: 'dinner',
};

const result = validate(ReservationSchema, reservationData);

if (result.ok) {
	console.log('Valid reservation:', result.value);
} else {
	console.error('Validation failed:', result.error.fields);
}
```

### Type-Safe Operations

```typescript
import type { Reservation, Table, CreateReservation } from '@seatkit/types';

function createReservation(data: CreateReservation): Reservation {
	// TypeScript ensures data matches CreateReservation schema
	// ...
}
```

### Result Type for Error Handling

```typescript
import { Result, ok, err, isOk } from '@seatkit/types';

function findTable(id: string): Result<Table, Error> {
	const table = database.get(id);

	if (!table) {
		return err(new Error('Table not found'));
	}

	return ok(table);
}

const result = findTable('table-123');

if (isOk(result)) {
	console.log('Found table:', result.value);
} else {
	console.error('Error:', result.error.message);
}
```

## Domain Entities

### Reservation

Customer bookings with time, party size, status, and category tracking.

### Table

Physical restaurant tables with capacity, position, and availability.

### Session

Active user sessions for collaborative editing and real-time presence.

### Sales

Daily sales data with category breakdowns and metrics.

### Profile

User accounts with roles, permissions, and preferences.

### Restaurant

Restaurant configuration including operating hours and reservation settings.

## Validation Utilities

### `validate(schema, data)`

Synchronous validation returning a Result type.

### `validateAsync(schema, data)`

Async validation for schemas with async refinements.

### `validatePartial(schema, data)`

Validates only provided fields (useful for PATCH operations).

## Result Type

Functional error handling inspired by Rust's `Result<T, E>`:

- `ok(value)` - Create success result
- `err(error)` - Create error result
- `isOk(result)` - Type guard for success
- `isErr(result)` - Type guard for error
- `map(result, fn)` - Transform success value
- `andThen(result, fn)` - Chain operations

## Philosophy

1. **Single Source of Truth**: Types are derived from Zod schemas
2. **Runtime Safety**: All external data is validated
3. **Type Safety**: TypeScript catches errors at compile time
4. **Functional Patterns**: Result types over exceptions
5. **Explicit Over Implicit**: Clear, predictable behavior

## Contributing

This package is the foundation of SeatKit. Changes here impact all packages. Please:

1. Maintain backward compatibility when possible
2. Add tests for new schemas
3. Update documentation
4. Consider migration paths for breaking changes

## License

Apache-2.0
