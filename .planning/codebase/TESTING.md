# Testing Patterns

**Analysis Date:** 2026-04-06

## Test Framework

**Runner:**
- Vitest
- Shared config: `vitest.shared.ts` (root of monorepo)
- Individual package configs extend shared config via `createPackageConfig()` helper function

**Assertion Library:**
- Vitest's built-in expect API (chai-compatible)
- Additional: `@testing-library/react` for React component testing
- User interaction: `@testing-library/user-event` for simulating user actions

**Run Commands:**
```bash
pnpm test              # Run all tests in monorepo
pnpm test:watch       # Watch mode (if configured)
pnpm coverage         # Run with coverage reporting
```

**Environment:**
- Default test environment: Node.js (`environment: 'node'`)
- Browser environment for @seatkit/web and @seatkit/ui: jsdom (`environment: 'jsdom'`)
- Test database URL: `postgresql://localhost:5432/seatkit_test` (configurable via TEST_DATABASE_URL env var)
- Global test setup available: Can add global setup files per package via `globalSetup` config

## Test File Organization

**Location:**
- Co-located with source files in same directory
- Pattern: `[component-name].test.ts` or `[component-name].test.tsx`
- Separate test database used (not production database)

**Naming:**
- Test files: `*.test.ts` or `*.test.tsx`
- Test suites: describe blocks matching component/function name

**Structure:**
```
packages/
├── types/
│   └── src/
│       ├── schemas/
│       │   ├── reservation.ts
│       │   └── reservation.test.ts
│       └── utils/
│           ├── result.ts
│           └── result.test.ts
├── api/
│   └── src/
│       ├── routes/
│       │   ├── reservations.ts
│       │   └── reservations.test.ts
└── ui/
    └── src/
        ├── components/
        │   ├── glass-container.tsx
        │   └── glass-container.test.tsx
```

## Test Structure

**Suite Organization:**
```typescript
describe('ComponentOrFunctionName', () => {
	// Setup
	let state: any;

	beforeAll(async () => {
		// One-time setup for all tests in suite
	});

	afterAll(async () => {
		// One-time teardown
	});

	beforeEach(async () => {
		// Setup before each test
	});

	afterEach(async () => {
		// Cleanup after each test
	});

	describe('scenario or grouped tests', () => {
		it('should do specific thing', () => {
			expect(result).toBe(expected);
		});
	});
});
```

**Patterns:**
- Setup with `beforeEach()` (not in test body) for isolation
- Teardown with `afterEach()` for cleanup (esp. important for database tests)
- Grouped describes for related test scenarios
- One assertion focus per `it()` block when possible, multiple allowed for related assertions

**Database test pattern:**
```typescript
describe('Reservations API', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = await createServer();
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(async () => {
		// Reset state before each test if needed
	});

	it('should create a reservation', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/api/reservations',
			payload: testData,
		});
		expect(response.statusCode).toBe(201);
	});
});
```

## Mocking

**Framework:** Vitest's `vi` module

**Patterns:**
```typescript
import { vi } from 'vitest';

// Mock function
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock return value
mockFetch.mockResolvedValueOnce(response);

// Mock reject
mockFetch.mockRejectedValueOnce(new Error('Network error'));

// Clear mocks
vi.clearAllMocks();

// Assert on mock
expect(mockFetch).toHaveBeenCalledWith(url, options);
expect(mockFetch).toHaveBeenCalledTimes(1);

// Spy on modules
vi.mock('./api-config.js', () => ({
	API_BASE_URL: 'http://localhost:3001',
}));
```

See `packages/web/src/lib/api-client.test.ts` for comprehensive mocking examples.

**What to Mock:**
- External API calls (network requests)
- Module dependencies with `vi.mock()` for import-time mocking
- Browser APIs like `fetch` when testing network logic
- Time-dependent operations via `vi.useFakeTimers()` (if needed)

**What NOT to Mock:**
- Database queries (use test database instead)
- Fastify app in route tests (use `app.inject()` for real request testing)
- Zod schemas (always validate against real schemas)
- Utility functions from `@seatkit/utils` (test them directly)
- React components' internal logic (test their behavior, not implementation)

**Integration test approach:**
- For API routes: start actual server, use real database
- For Zod validation: parse actual data through schema
- For React components: render and interact (don't mock internals)

## Fixtures and Factories

**Test Data:**
Factory functions create valid test data:
```typescript
const validReservation = {
	id: '550e8400-e29b-41d4-a716-446655440000',
	createdAt: '2025-01-15T14:30:00Z',
	updatedAt: '2025-01-15T14:30:00Z',
	date: '2025-01-20T19:00:00Z',
	duration: 90,
	customer: {
		name: 'John Doe',
		phone: '+1-555-123-4567',
		email: 'john@example.com',
	},
	partySize: 4,
	category: 'dinner' as const,
	status: 'confirmed' as const,
	createdBy: 'user-123',
	// ... other required fields
};
```

**Location:**
- Test utilities: `@seatkit/utils/test-utils` subpath export
- Available utilities: `createMockResponse()`, `createMockErrorResponse()`, `createMockErrorResponseWithoutJson()`
- Inline data for small, simple fixtures
- Shared fixtures in dedicated utility modules for complex/repeated data

**Creating mock responses:**
```typescript
import {
	createMockResponse,
	createMockErrorResponse,
} from '@seatkit/utils/test-utils';

// Success response
mockFetch.mockResolvedValueOnce(createMockResponse(data));

// Error response
mockFetch.mockResolvedValueOnce(
	createMockErrorResponse(errorObject, 400, 'Bad Request')
);
```

## Coverage

**Requirements:** Not enforced by CI, but generated
- Coverage reports generated after test runs
- Provider: v8
- Reporters: text, json, html (default excludes config files and dist)
- Exclude patterns: node_modules, dist, .next, *.d.ts, *.config.{js,ts}

**View Coverage:**
```bash
pnpm coverage          # Generate coverage report
open coverage/index.html  # View HTML report (macOS)
```

**Current status:**
- @seatkit/types: Comprehensive test coverage (13+ test files)
- @seatkit/utils: Complete test coverage
- @seatkit/api: Test coverage for all CRUD endpoints
- @seatkit/ui: Component tests for core components
- @seatkit/web: Integration tests for client-side logic

## Test Types

**Unit Tests:**
- Scope: Single function or module
- Approach: Test pure functions, utilities, schema validation
- Examples:
  - `packages/types/src/schemas/reservation.test.ts` - schema validation
  - `packages/types/src/utils/result.test.ts` - Result type utilities
  - `packages/utils/src/date.test.ts` - date utilities
  - `packages/ui/src/components/glass-container.test.tsx` - component behavior
- Setup: Minimal; no databases or servers needed

**Integration Tests:**
- Scope: Multiple modules working together (typically API endpoint + database)
- Approach: Start real server, hit endpoints, verify database changes
- Examples:
  - `packages/api/src/routes/reservations.test.ts` - full CRUD endpoint testing
  - `packages/web/src/lib/api-client.test.ts` - API client with mock fetch
- Setup: Database connection, Fastify app instance, or mocked HTTP layer

**E2E Tests:**
- Scope: Full user workflows in browser
- Framework: Playwright (configured in `packages/web/playwright.config.ts`)
- Status: Infrastructure in place but tests not yet implemented
- When used: Test critical reservation workflows end-to-end

## Common Patterns

**Async Testing:**
```typescript
// Pattern 1: async/await
it('should fetch data', async () => {
	const result = await apiRequest('/endpoint');
	expect(result).toBeDefined();
});

// Pattern 2: using .rejects
it('should handle errors', async () => {
	await expect(apiRequest('/invalid')).rejects.toThrow();
});

// Pattern 3: Promise chaining (less preferred)
it('should work', () => {
	return apiRequest('/endpoint').then(result => {
		expect(result).toBeDefined();
	});
});
```

**Error Testing:**
```typescript
// Test error creation
it('should create ApiError with details', () => {
	const error = new ApiError(400, 'Bad Request', {
		error: 'Bad Request',
		message: 'Invalid input',
		details: ['Field required'],
	});
	expect(error.status).toBe(400);
	expect(error.message).toBe('Invalid input');
});

// Test error throwing
it('should throw validation error', async () => {
	const response = await app.inject({
		method: 'POST',
		url: '/api/reservations',
		payload: invalidData,
	});
	expect(response.statusCode).toBe(400);
	const body = response.json<ErrorResponse>();
	expect(body.error).toBe('Bad Request');
});

// Test error propagation
it('should propagate Err through chain', () => {
	const result = andThen(err('error'), (x: number) => ok(x * 2));
	expect(isErr(result) && result.error).toBe('error');
});
```

**Schema/Validation Testing:**
```typescript
// Valid data
it('should validate valid data', () => {
	const result = ReservationSchema.parse(validData);
	expect(result.id).toBeDefined();
	expect(result.date).toBeInstanceOf(Date);
});

// Invalid data
it('should reject invalid data', () => {
	expect(() => {
		ReservationSchema.parse({ ...validData, partySize: -1 });
	}).toThrow();
});

// Optional fields
it('should allow optional fields', () => {
	const data = { ...validData, tags: ['vip'] };
	const result = ReservationSchema.parse(data);
	expect(result.tags).toEqual(['vip']);
});

// Type coercion
it('should coerce date strings to Date objects', () => {
	const result = ReservationSchema.parse({
		...validData,
		date: '2025-01-20T19:00:00Z',
	});
	expect(result.date).toBeInstanceOf(Date);
});
```

**React Component Testing:**
```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

it('should render with children', () => {
	render(<GlassContainer>Content</GlassContainer>);
	expect(screen.getByText('Content')).toBeInTheDocument();
});

it('should handle click events', async () => {
	const handleClick = vi.fn();
	const user = userEvent.setup();

	render(<GlassContainer onClick={handleClick}>Click</GlassContainer>);
	await user.click(screen.getByText('Click'));

	expect(handleClick).toHaveBeenCalledTimes(1);
});

it('should apply classes when glass is disabled', () => {
	const { container } = render(
		<GlassContainer glass={false} className="custom">Content</GlassContainer>
	);
	const element = container.firstChild as HTMLElement;
	expect(element.className).toContain('custom');
});
```

**HTTP Testing with Fastify:**
```typescript
it('should create a reservation', async () => {
	const response = await app.inject({
		method: 'POST',
		url: '/api/reservations',
		payload: validReservation,
	});

	expect(response.statusCode).toBe(201);
	const body = response.json<CreateReservationResponse>();
	expect(body.message).toBe('Reservation created successfully');
	expect(body.reservation.id).toBeDefined();
});

it('should return 404 for missing resource', async () => {
	const response = await app.inject({
		method: 'GET',
		url: '/api/reservations/00000000-0000-0000-0000-000000000000',
	});

	expect(response.statusCode).toBe(404);
});
```

## Timeouts

**Default values:**
- Test timeout: 10 seconds
- Hook timeout: 10 seconds
- API package override: 15 seconds (for database operations)

**When tests timeout:**
- Check for missing `await` keywords
- Verify database connection is working
- Check for infinite loops or deadlocks
- Increase timeout if operation is legitimately slow (but prefer optimizing instead)

## Running Tests

**Full test suite:**
```bash
pnpm test
```

**Watch mode (package-specific):**
```bash
cd packages/api
pnpm test --watch
```

**With coverage:**
```bash
pnpm test --coverage
```

**Specific test file:**
```bash
pnpm test packages/types/src/schemas/reservation.test.ts
```

**Specific test suite:**
```bash
pnpm test -t "ReservationSchema"
```

**Specific test:**
```bash
pnpm test -t "should validate complete reservation"
```

## Database Testing

**Configuration:**
- Test database: `seatkit_test` (separate from development/production)
- Connection string: `TEST_DATABASE_URL` env var
- Pool type: Forks (in vitest config) for test isolation
- Single fork mode: API tests use `singleFork: true` to prevent parallel issues

**Setup/Teardown:**
- Use `beforeAll()` to initialize server/database connection once
- Use `afterAll()` to close connections
- Use `beforeEach()` to set up test data if needed (not typical for read-heavy tests)
- Use `afterEach()` to clean up state (if tests interfere with each other)

**Patterns:**
```typescript
describe('Reservations API', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		// One-time setup
		app = await createServer();
		// Database migrations should be run before tests start
	});

	afterAll(async () => {
		// One-time teardown
		await app.close();
		// Database connection closes with Fastify
	});

	beforeEach(async () => {
		// Optional: reset state before each test
		// Can truncate tables if tests don't need persistent data
	});
});
```

---

*Testing analysis: 2026-04-06*
