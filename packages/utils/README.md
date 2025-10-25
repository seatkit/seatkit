# @seatkit/utils

Shared utility functions for the SeatKit restaurant reservation management system.

## Installation

```bash
pnpm add @seatkit/utils
```

## Features

### Date/Time Utilities

Date operations for restaurant management. **All dates are handled in UTC** to avoid timezone ambiguity. The frontend is responsible for converting to/from local timezone for display.

```typescript
import { addMinutes, isSameDay, isBetween } from '@seatkit/utils/date';

// Immutable date operations
const startTime = new Date('2025-01-15T19:00:00Z');
const endTime = addMinutes(startTime, 90); // 90 minutes later, original unchanged

// Date comparisons (UTC-based)
const morning = new Date('2025-01-15T08:00:00Z');
const evening = new Date('2025-01-15T20:00:00Z');
isSameDay(morning, evening); // true - same UTC day

// Check reservation conflicts
const reservationTime = new Date('2025-01-15T19:30:00Z');
const dinnerStart = new Date('2025-01-15T18:00:00Z');
const dinnerEnd = new Date('2025-01-15T22:00:00Z');
isBetween(reservationTime, dinnerStart, dinnerEnd); // true
```

### Formatting Utilities

Consistent formatting for money and phone numbers:

```typescript
import {
	formatMoney,
	parseMoney,
	formatPhone,
	normalizePhone,
} from '@seatkit/utils/format';

// Money formatting (cents to display)
formatMoney(1050, 'USD'); // "$10.50"
formatMoney(1050, 'EUR'); // "€10.50"
formatMoney(1050, 'JPY'); // "¥11" (no decimals)

parseMoney('$10.50'); // 1050 cents

// Phone number formatting
formatPhone('5551234567'); // "(555) 123-4567"
formatPhone('+15551234567'); // "+1 (555) 123-4567"
normalizePhone('(555) 123-4567'); // "5551234567"
```

## Design Goals

1. **Performance**: Optimized for high-frequency operations
2. **Consistency**: Centralized formatting logic across frontend and backend
3. **Type Safety**: Full TypeScript support with strict mode
4. **Immutability**: Functions don't modify input parameters
5. **Simplicity**: Clean APIs without unnecessary complexity

## Testing

```bash
pnpm test              # Run tests
pnpm test:watch        # Watch mode
pnpm test --coverage   # With coverage report
```

## License

Apache-2.0
