# SeatKit - Technical Context & Development Standards

> **Purpose**: Development guidance, coding standards, and technical best practices
> **Audience**: Current and future contributors to SeatKit
> **Based on**: Phase 1 architectural decisions + production Swift app learnings
> **Last Updated**: 2025-10-25

---

## 🏗 Technical Architecture Overview

### Package Structure & Dependencies

```
seatkit/
├── packages/
│   ├── types/           # Foundation: Zod schemas + TypeScript types
│   │   └── depends on: zod
│   ├── utils/           # Shared utilities
│   │   └── depends on: types
│   ├── engine/          # Business logic & algorithms
│   │   └── depends on: types, utils
│   ├── ui/              # Design system components
│   │   └── depends on: types, shadcn/ui
│   ├── api/             # Backend API server
│   │   └── depends on: types, utils, engine
│   ├── web/             # Frontend application
│   │   └── depends on: types, utils, ui, engine (client-safe parts)
│   └── config/          # Shared tooling configurations
└── tools/              # Development utilities
```

### Build Dependencies Flow

```mermaid
graph TD
    A[config] --> B[types]
    B --> C[utils]
    B --> D[engine]
    B --> E[ui]
    C --> F[api]
    D --> F
    C --> G[web]
    E --> G
    D --> G
```

**Key Principles**:

- **types** is the foundation - no circular dependencies
- **engine** contains pure business logic - no UI dependencies
- **web** can import from engine but only client-safe code
- **api** has full access to engine for server-side operations

---

## 💻 Development Environment

### Required Tools

```bash
# Core runtime
node >= 20.0.0          # Primary: Node.js 22.x
pnpm >= 8.0.0           # Package manager

# Development tools (installed via packages)
typescript >= 5.0       # Type checking
turbo >= 1.10          # Monorepo build orchestration
vitest >= 1.0          # Testing framework
eslint >= 8.0          # Code linting
prettier >= 3.0        # Code formatting
```

### Development Setup

```bash
# Clone and install
git clone <repository>
cd seatkit
pnpm install

# Development commands
pnpm dev                # Start all packages in dev mode
pnpm build              # Build all packages
pnpm test               # Run all tests
pnpm lint               # Lint all code
pnpm type-check         # TypeScript checking

# Package-specific commands
pnpm --filter @seatkit/api dev     # Run only API in dev mode
pnpm --filter @seatkit/web build   # Build only web package
```

### IDE Configuration

**VS Code Settings** (`.vscode/settings.json`):

```json
{
	"typescript.preferences.importModuleSpecifier": "relative",
	"editor.formatOnSave": true,
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": true,
		"source.organizeImports": true
	},
	"files.associations": {
		"*.css": "tailwindcss"
	}
}
```

**Required VS Code Extensions**:

- TypeScript + JavaScript
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Auto Import - ES6, TS, JSX, TSX

---

## 📏 Code Quality Standards

### TypeScript Configuration

**Base TypeScript Config** (`packages/config/tsconfig.base.json`):

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "ESNext",
		"moduleResolution": "bundler",
		"allowImportingTsExtensions": true,
		"noEmit": true,

		// Maximum strictness (Phase 1 decision)
		"strict": true,
		"noUncheckedIndexedAccess": true,
		"noImplicitOverride": true,
		"exactOptionalPropertyTypes": true,

		// Modern features
		"allowSyntheticDefaultImports": true,
		"esModuleInterop": true,
		"resolveJsonModule": true,
		"isolatedModules": true,

		// Path mapping for monorepo
		"baseUrl": ".",
		"paths": {
			"@seatkit/types": ["../types/src"],
			"@seatkit/utils": ["../utils/src"],
			"@seatkit/engine": ["../engine/src"],
			"@seatkit/ui": ["../ui/src"]
		}
	}
}
```

### ESLint Configuration

**Shared ESLint Config** (`packages/config/eslint.config.js`):

```javascript
export default [
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
		},
		rules: {
			// Error prevention
			'no-unused-vars': 'error',
			'no-console': 'warn',
			'no-debugger': 'error',

			// Code quality
			'prefer-const': 'error',
			'no-var': 'error',
			'object-shorthand': 'error',

			// Import organization
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
					'newlines-between': 'always',
				},
			],
		},
	},
];
```

### Prettier Configuration

**Code Formatting** (`.prettierrc`):

```json
{
	"semi": true,
	"trailingComma": "es5",
	"singleQuote": true,
	"printWidth": 100,
	"tabWidth": 2,
	"useTabs": false
}
```

---

## 🏷 Naming Conventions

### File and Directory Naming

```
PascalCase:     Component files, Class files
camelCase:      Function files, variable files, regular TypeScript files
kebab-case:     Directory names, script files, config files
SCREAMING_CASE: Constants, environment variables
```

**Examples**:

```
✅ Good:
src/
├── components/
│   ├── ReservationCard.tsx
│   ├── TableLayout.tsx
│   └── index.ts
├── services/
│   ├── reservationService.ts
│   ├── tableService.ts
│   └── index.ts
├── utils/
│   ├── dateUtils.ts
│   ├── validationUtils.ts
│   └── constants.ts
└── types/
    ├── Reservation.ts
    └── index.ts

❌ Bad:
src/
├── Components/           # Should be lowercase
├── reservation_service.ts # Should be camelCase
├── ReservationUtils.ts   # Utils should be camelCase
└── table-types.ts        # Types should be PascalCase
```

### Variable and Function Naming

```typescript
// ✅ Good naming
const reservationList = [...];
const isValidTimeSlot = (time: string) => boolean;
const calculateTableCapacity = (table: Table) => number;

class ReservationService {
  private readonly dataRepository: ReservationRepository;

  public async createReservation(data: CreateReservationData): Promise<Reservation> {
    // ...
  }
}

// ❌ Bad naming
const res_list = [...];           // Abbreviation, snake_case
const checkTime = (t) => {...};   // Unclear function purpose
const calc = (table) => {...};    // Abbreviation

class resService {                // Should be PascalCase
  private repo;                   // Should be descriptive

  async create(d) {               // Unclear parameter
    // ...
  }
}
```

### Type and Interface Naming

```typescript
// ✅ Good type naming
interface Reservation {
  id: string;
  guestName: string;
  partySize: number;
}

type ReservationStatus = 'pending' | 'confirmed' | 'canceled';
type CreateReservationData = Omit<Reservation, 'id'>;

// Zod schemas match their types
export const ReservationSchema = z.object({...});
export type Reservation = z.infer<typeof ReservationSchema>;

// ❌ Bad type naming
interface IReservation {...}      // Avoid Hungarian notation
interface reservationData {...}   // Should be PascalCase
type resStatus = string;          // Should be descriptive
```

---

## 🗂 Package Organization Guidelines

### @seatkit/types Package

**Purpose**: Central type definitions and validation schemas

**Structure**:

```
packages/types/
├── src/
│   ├── reservation.ts      # Reservation entity + Zod schema
│   ├── table.ts           # Table entity + schema
│   ├── sales.ts           # Sales entities + schemas
│   ├── user.ts            # User/Profile entities + schemas
│   ├── common.ts          # Shared types (dates, IDs, etc.)
│   └── index.ts           # Re-export all types
├── package.json
└── README.md
```

**Example Implementation**:

```typescript
// packages/types/src/reservation.ts
import { z } from 'zod';

// Enums first
export const ReservationStatusSchema = z.enum([
	'pending',
	'confirmed',
	'canceled',
	'noShow',
	'showedUp',
	'late',
]);

// Main schema
export const ReservationSchema = z.object({
	id: z.string().uuid(),
	guestName: z.string().min(1).max(100),
	partySize: z.number().int().min(1).max(20),
	dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	startTime: z.string().regex(/^\d{2}:\d{2}$/),
	status: ReservationStatusSchema,
	// ... other fields
});

// Export types
export type Reservation = z.infer<typeof ReservationSchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

// Export creation/update types
export type CreateReservationData = Omit<Reservation, 'id'>;
export type UpdateReservationData = Partial<Omit<Reservation, 'id'>>;
```

### @seatkit/engine Package

**Purpose**: Pure business logic, no dependencies on UI or database

**Structure**:

```
packages/engine/
├── src/
│   ├── reservation/
│   │   ├── ReservationService.ts
│   │   ├── timeSlotValidation.ts
│   │   └── conflictResolution.ts
│   ├── table/
│   │   ├── TableAssignmentService.ts
│   │   ├── capacityCalculation.ts
│   │   └── layoutAlgorithms.ts
│   ├── sales/
│   │   ├── SalesCalculationService.ts
│   │   └── analyticsEngine.ts
│   └── index.ts
├── package.json
└── README.md
```

**Design Principles**:

- **Pure Functions**: No side effects where possible
- **Dependency Injection**: Services receive dependencies via constructor
- **Interface-Based**: Define interfaces, inject implementations
- **Testable**: Easy to mock dependencies

**Example Service**:

```typescript
// packages/engine/src/reservation/ReservationService.ts
import type { Reservation, CreateReservationData } from '@seatkit/types';

interface ReservationRepository {
	save(reservation: Reservation): Promise<void>;
	findById(id: string): Promise<Reservation | null>;
	findConflicts(
		date: string,
		startTime: string,
		endTime: string,
	): Promise<Reservation[]>;
}

export class ReservationService {
	constructor(private readonly repository: ReservationRepository) {}

	async createReservation(data: CreateReservationData): Promise<Reservation> {
		// Validate business rules
		await this.validateTimeSlot(data.dateString, data.startTime, data.endTime);

		// Create reservation
		const reservation: Reservation = {
			id: crypto.randomUUID(),
			...data,
		};

		// Save to repository
		await this.repository.save(reservation);

		return reservation;
	}

	private async validateTimeSlot(
		date: string,
		startTime: string,
		endTime?: string,
	): Promise<void> {
		const conflicts = await this.repository.findConflicts(
			date,
			startTime,
			endTime,
		);
		if (conflicts.length > 0) {
			throw new Error('Time slot conflict detected');
		}
	}
}
```

---

## 🧪 Testing Standards

### Testing Philosophy

- **Unit Tests**: Test business logic in isolation
- **Integration Tests**: Test API endpoints and database operations
- **E2E Tests**: Test critical user workflows
- **Visual Tests**: Test UI components (Storybook + Chromatic)

### Test Organization

```
packages/engine/
├── src/
│   ├── reservation/
│   │   ├── ReservationService.ts
│   │   └── ReservationService.test.ts     # Co-located unit tests
├── tests/
│   ├── integration/                        # Cross-service integration tests
│   └── fixtures/                          # Test data and mocks
```

### Unit Test Standards

**Framework**: Vitest (chosen for speed and ESM compatibility)

```typescript
// packages/engine/src/reservation/ReservationService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReservationService } from './ReservationService';

describe('ReservationService', () => {
	let service: ReservationService;
	let mockRepository: MockReservationRepository;

	beforeEach(() => {
		mockRepository = {
			save: vi.fn(),
			findById: vi.fn(),
			findConflicts: vi.fn().mockResolvedValue([]),
		};
		service = new ReservationService(mockRepository);
	});

	describe('createReservation', () => {
		it('should create reservation with valid data', async () => {
			const reservationData = {
				guestName: 'John Doe',
				partySize: 2,
				dateString: '2025-10-25',
				startTime: '19:30',
				// ... other required fields
			};

			const result = await service.createReservation(reservationData);

			expect(result.id).toBeDefined();
			expect(result.guestName).toBe('John Doe');
			expect(mockRepository.save).toHaveBeenCalledWith(result);
		});

		it('should throw error for conflicting time slots', async () => {
			mockRepository.findConflicts.mockResolvedValue([existingReservation]);

			const reservationData = {
				/* ... */
			};

			await expect(service.createReservation(reservationData)).rejects.toThrow(
				'Time slot conflict detected',
			);
		});
	});
});
```

### Integration Test Standards

```typescript
// packages/api/tests/integration/reservations.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('POST /api/reservations', () => {
	it('should create reservation and return 201', async () => {
		const reservationData = {
			guestName: 'John Doe',
			partySize: 2,
			dateString: '2025-10-25',
			startTime: '19:30',
		};

		const response = await request(app)
			.post('/api/reservations')
			.send(reservationData)
			.expect(201);

		expect(response.body).toMatchObject({
			id: expect.any(String),
			guestName: 'John Doe',
			partySize: 2,
		});
	});

	it('should return 400 for invalid data', async () => {
		const invalidData = {
			guestName: '', // Invalid: empty name
			partySize: 0, // Invalid: zero party size
		};

		const response = await request(app)
			.post('/api/reservations')
			.send(invalidData)
			.expect(400);

		expect(response.body.error).toBeDefined();
	});
});
```

---

## 🔒 Error Handling Standards

### Error Types and Handling

```typescript
// packages/types/src/errors.ts
export abstract class AppError extends Error {
	abstract readonly statusCode: number;
	abstract readonly code: string;

	constructor(
		message: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class ValidationError extends AppError {
	readonly statusCode = 400;
	readonly code = 'VALIDATION_ERROR';
}

export class ConflictError extends AppError {
	readonly statusCode = 409;
	readonly code = 'CONFLICT_ERROR';
}

export class NotFoundError extends AppError {
	readonly statusCode = 404;
	readonly code = 'NOT_FOUND_ERROR';
}
```

### API Error Handling

```typescript
// packages/api/src/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@seatkit/types/errors';
import { ZodError } from 'zod';

export function errorHandler(
	error: Error,
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (error instanceof AppError) {
		res.status(error.statusCode).json({
			error: {
				code: error.code,
				message: error.message,
				...(error.context && { context: error.context }),
			},
		});
		return;
	}

	if (error instanceof ZodError) {
		res.status(400).json({
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Invalid input data',
				details: error.errors,
			},
		});
		return;
	}

	// Unknown error
	console.error('Unhandled error:', error);
	res.status(500).json({
		error: {
			code: 'INTERNAL_SERVER_ERROR',
			message: 'An unexpected error occurred',
		},
	});
}
```

---

## 📊 Performance Guidelines

### Performance Budgets

- **Bundle Size**: <500KB for initial page load
- **API Response**: <200ms for 95% of requests
- **Database Queries**: <100ms for simple reads, <500ms for complex queries
- **Real-time Updates**: <1 second end-to-end propagation

### Database Query Optimization

```typescript
// ✅ Good: Use proper indexing and selective queries
class ReservationRepository {
	async findByDate(date: string): Promise<Reservation[]> {
		// Index on (date, start_time) for fast retrieval
		return this.db.reservation.findMany({
			where: { dateString: date },
			orderBy: { startTime: 'asc' },
			select: {
				// Only select needed fields
				id: true,
				guestName: true,
				startTime: true,
				partySize: true,
				status: true,
			},
		});
	}
}

// ❌ Bad: N+1 queries and unnecessary data
class BadReservationRepository {
	async findByDate(date: string): Promise<Reservation[]> {
		const reservations = await this.db.reservation.findMany({
			where: { dateString: date },
		});

		// N+1 query problem
		for (const reservation of reservations) {
			reservation.table = await this.db.table.findFirst({
				where: { id: reservation.tableId },
			});
		}

		return reservations;
	}
}
```

### Frontend Performance

```typescript
// ✅ Good: Proper memoization and optimizations
import { memo, useMemo } from 'react';

interface ReservationListProps {
  reservations: Reservation[];
  filter: string;
}

export const ReservationList = memo(({ reservations, filter }: ReservationListProps) => {
  // Expensive filtering/sorting memoized
  const filteredReservations = useMemo(() => {
    return reservations
      .filter(r => r.guestName.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [reservations, filter]);

  return (
    <div>
      {filteredReservations.map(reservation => (
        <ReservationRow key={reservation.id} reservation={reservation} />
      ))}
    </div>
  );
});

// Memoize individual rows to prevent unnecessary re-renders
const ReservationRow = memo(({ reservation }: { reservation: Reservation }) => {
  return <div>{reservation.guestName} - {reservation.startTime}</div>;
});
```

---

## 🔐 Security Guidelines

### Input Validation and Sanitization

```typescript
// Always validate at boundaries using Zod
app.post('/api/reservations', async (req, res, next) => {
	try {
		// Parse and validate with Zod
		const reservationData = CreateReservationSchema.parse(req.body);

		const reservation =
			await reservationService.createReservation(reservationData);
		res.status(201).json(reservation);
	} catch (error) {
		next(error);
	}
});
```

### Environment Variables and Secrets

```typescript
// packages/api/src/config.ts
import { z } from 'zod';

const ConfigSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']),
	PORT: z.coerce.number().default(3000),
	DATABASE_URL: z.string().url(),
	JWT_SECRET: z.string().min(32),
	// Never commit secrets to code
});

export const config = ConfigSchema.parse(process.env);
```

### Authentication and Authorization

```typescript
// JWT token validation middleware
import jwt from 'jsonwebtoken';

export function requireAuth(
	req: AuthRequest,
	res: Response,
	next: NextFunction,
) {
	const token = req.headers.authorization?.replace('Bearer ', '');

	if (!token) {
		return res.status(401).json({ error: 'Authentication required' });
	}

	try {
		const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
		req.user = payload;
		next();
	} catch (error) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

// Role-based authorization
export function requireRole(role: UserRole) {
	return (req: AuthRequest, res: Response, next: NextFunction) => {
		if (!req.user || req.user.role !== role) {
			return res.status(403).json({ error: 'Insufficient permissions' });
		}
		next();
	};
}
```

---

## 🚀 Deployment Standards

### Build Configuration

```json
// turbo.json - Monorepo build pipeline
{
	"pipeline": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": ["dist/**", "build/**"]
		},
		"test": {
			"dependsOn": ["^build"]
		},
		"lint": {
			"outputs": []
		},
		"type-check": {
			"dependsOn": ["^build"]
		}
	}
}
```

### Docker Configuration

```dockerfile
# Dockerfile (multi-stage build)
FROM node:22-alpine AS base
RUN npm install -g pnpm turbo

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY packages/*/package.json ./packages/*/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN turbo build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder --chown=nodejs:nodejs /app/packages/api/dist ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs
EXPOSE 3000
CMD ["node", "index.js"]
```

### Environment Configuration

```bash
# .env.example
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/seatkit
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
CORS_ORIGIN=http://localhost:5173
```

---

This technical context document serves as the definitive guide for all SeatKit development. It ensures consistency, maintainability, and quality across all packages and contributors.
