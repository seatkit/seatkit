# @seatkit/utils

Shared utility functions for the SeatKit restaurant reservation management system.

## Installation

```bash
pnpm add @seatkit/utils
```

## Features

### Date/Time Utilities

Optimized date operations for restaurant management:

```typescript
import {
	parseDateTime,
	formatDateTime,
	formatDateForDisplay,
	addMinutes,
	isSameDay,
	isToday,
	isBetween,
} from '@seatkit/utils/date';

// Fast ISO string parsing
const date = parseDateTime('2025-01-15T14:30:00Z');

// Format for display
formatDateForDisplay(date, 'short'); // "1/15/2025"
formatDateForDisplay(date, 'long'); // "January 15, 2025"

// Immutable date operations
const later = addMinutes(date, 90); // Original date unchanged

// Date comparisons (UTC-based)
isSameDay(date1, date2);
isToday(date);
isBetween(date, startTime, endTime);
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
