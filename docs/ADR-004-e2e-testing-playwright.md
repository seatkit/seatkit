# ADR-004: Playwright for End-to-End Testing

## Status
✅ **Accepted** - 2025-10-30

## Context

SeatKit requires comprehensive end-to-end testing to ensure:

- **User workflows work correctly**: Create → Read → Update → Delete reservations
- **Cross-browser compatibility**: Works on Chrome, Firefox, Safari, mobile browsers
- **Real API integration**: Tests against actual backend, not mocks
- **Regression prevention**: Catch breaking changes before production
- **Confidence in deployments**: Automated testing before merging PRs
- **Real-time features**: Validate optimistic updates, WebSocket sync (Phase 2)

The project previously documented Playwright as the E2E framework choice (ARCHITECTURE.md, Phase 3) but lacked implementation details, CI integration strategy, and test database patterns.

### The Problem

Multiple E2E testing solutions exist with different trade-offs:

1. **Framework choice**: Playwright vs Cypress vs Puppeteer
2. **Test environment**: Against localhost vs deployed staging
3. **Database strategy**: Shared test DB vs per-test isolation
4. **CI integration**: Parallel execution, browser matrix, artifacts
5. **Test organization**: Co-located with features vs centralized

### Alternative Solutions Considered

#### 1. **Cypress** (Popular Alternative)
**Pros**:
- Popular, large community
- Great developer experience
- Time-travel debugging
- Auto-waiting for elements
- Video recording built-in

**Cons**:
- Runs inside browser (no true multi-tab testing)
- Slower than Playwright
- Limited multi-browser support (Chrome-focused)
- No native mobile testing
- More flaky in CI

**Verdict**: ❌ Playwright better performance and browser coverage

---

#### 2. **Puppeteer** (Google's Headless Browser)
**Pros**:
- Chrome DevTools Protocol integration
- Fast execution
- Good for scraping and automation

**Cons**:
- Chrome/Chromium only (no Firefox/Safari)
- Lower-level API (more boilerplate)
- Less ergonomic for testing
- No built-in test runner

**Verdict**: ❌ Too limited, Playwright is a superset of Puppeteer

---

#### 3. **Selenium WebDriver** (Legacy Standard)
**Pros**:
- Industry standard (15+ years)
- Supports all browsers
- Mature ecosystem

**Cons**:
- Slow execution
- Requires separate drivers per browser
- Flaky tests common
- Verbose API
- Not modern/ergonomic

**Verdict**: ❌ Legacy tool, Playwright is the modern replacement

---

#### 4. **Playwright** ✅ (Modern E2E Framework)
**Pros**:
- **Fast execution**: 2-3x faster than Cypress
- **Multi-browser**: Chromium, Firefox, WebKit (Safari engine)
- **Mobile testing**: Device emulation for responsive testing
- **Auto-waiting**: Smart waits for elements, network requests
- **Parallel execution**: Run tests concurrently in CI
- **Trace viewer**: Visual debugging with DOM snapshots, network logs
- **Built-in test runner**: No need for Jest/Vitest
- **Strong TypeScript support**: Excellent type safety
- **Codegen**: Record tests visually

**Cons**:
- Newer than Cypress (smaller community)
- Steeper initial learning curve
- More powerful = more complex

**Verdict**: ✅ **Best choice** - Performance, multi-browser, TypeScript support

---

## Decision

**We will use Playwright for all end-to-end testing in the SeatKit web application.**

### Specific Choices

1. **E2E Framework**: Playwright v1.40+
2. **Test Environment**: Localhost (dev) + deployed (pre-production, future)
3. **Database Strategy**: Shared PostgreSQL test database with cleanup between tests
4. **Browsers**: Chromium (primary), Firefox, WebKit (CI matrix)
5. **Test Organization**: Co-located with features (`e2e/` in `packages/web/`)
6. **CI Integration**: GitHub Actions with parallel execution
7. **Artifacts**: Screenshots on failure, trace files, videos for debugging
8. **Reporting**: HTML report + GitHub Actions annotations

### Rationale

1. **Performance**: Playwright 2-3x faster than Cypress (critical for CI)
2. **Multi-browser**: Real Safari testing via WebKit engine
3. **Mobile Testing**: Built-in device emulation for responsive validation
4. **TypeScript**: Full type safety matches project standards
5. **Modern API**: Clean, ergonomic API reduces test boilerplate
6. **Parallel Execution**: Speed up CI by running tests concurrently
7. **Debugging**: Trace viewer and codegen improve developer experience
8. **Ecosystem Fit**: Works well with Next.js, Vitest, Turborepo
9. **Future-proof**: Actively developed by Microsoft, growing adoption

### Implementation

#### Playwright Configuration

```typescript
// packages/web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html'],
    ['github'], // GitHub Actions annotations
    ['list'], // Console output
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Test against multiple browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Test Structure

```
packages/web/
├── e2e/
│   ├── reservations/
│   │   ├── list.spec.ts          # List view tests
│   │   ├── create.spec.ts        # Create form tests
│   │   ├── edit.spec.ts          # Edit form tests
│   │   ├── delete.spec.ts        # Delete operation tests
│   │   └── filters.spec.ts       # Filter and search tests
│   ├── auth/
│   │   ├── login.spec.ts         # Auth flow (Phase 2)
│   │   └── logout.spec.ts
│   ├── fixtures/
│   │   ├── test-data.ts          # Shared test data
│   │   └── api-helpers.ts        # API setup/teardown
│   └── utils/
│       ├── db-helpers.ts         # Database cleanup utilities
│       └── test-helpers.ts       # Common test utilities
└── playwright.config.ts
```

#### Example Test (CRUD Flow)

```typescript
// e2e/reservations/crud-flow.spec.ts
import { test, expect } from '@playwright/test';
import { setupTestDatabase, cleanupReservations } from '../utils/db-helpers';

test.describe('Reservation CRUD Flow', () => {
  test.beforeEach(async () => {
    await setupTestDatabase();
  });

  test.afterEach(async () => {
    await cleanupReservations();
  });

  test('complete reservation lifecycle', async ({ page }) => {
    // Navigate to reservations page
    await page.goto('/reservations');
    await expect(page.getByRole('heading', { name: /reservations/i })).toBeVisible();

    // CREATE: Add new reservation
    await page.getByRole('button', { name: /new reservation/i }).click();
    await page.getByLabel(/guest name/i).fill('John Doe');
    await page.getByLabel(/phone/i).fill('+1234567890');
    await page.getByLabel(/date/i).fill('2025-11-15');
    await page.getByLabel(/time/i).fill('19:00');
    await page.getByLabel(/party size/i).fill('4');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify success notification
    await expect(page.getByText(/reservation created/i)).toBeVisible();

    // READ: Verify reservation appears in list
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('+1234567890')).toBeVisible();

    // UPDATE: Edit reservation
    await page.getByRole('button', { name: /edit.*john doe/i }).click();
    await page.getByLabel(/party size/i).clear();
    await page.getByLabel(/party size/i).fill('6');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify update
    await expect(page.getByText(/updated successfully/i)).toBeVisible();
    await expect(page.getByText(/6 guests/i)).toBeVisible();

    // DELETE: Remove reservation
    await page.getByRole('button', { name: /delete.*john doe/i }).click();
    await page.getByRole('button', { name: /confirm delete/i }).click();

    // Verify deletion
    await expect(page.getByText(/deleted successfully/i)).toBeVisible();
    await expect(page.getByText('John Doe')).not.toBeVisible();
  });

  test('optimistic updates work correctly', async ({ page }) => {
    await page.goto('/reservations');

    // Create reservation
    await page.getByRole('button', { name: /new reservation/i }).click();
    await page.getByLabel(/guest name/i).fill('Jane Smith');
    // ... fill other fields
    await page.getByRole('button', { name: /save/i }).click();

    // Verify optimistic UI (appears immediately)
    await expect(page.getByText('Jane Smith')).toBeVisible({ timeout: 100 });

    // Wait for actual API response
    await expect(page.getByText(/created successfully/i)).toBeVisible({ timeout: 2000 });
  });
});
```

#### Database Helper Utilities

```typescript
// e2e/utils/db-helpers.ts
import { sql } from '@seatkit/utils/db';

export async function setupTestDatabase() {
  // Ensure test database exists and is migrated
  // This runs before each test file
  await sql`
    -- Ensure migrations are applied
    SELECT 1
  `;
}

export async function cleanupReservations() {
  // Clean up test data after each test
  await sql`
    DELETE FROM reservations WHERE customer->>'name' LIKE 'Test%' OR customer->>'name' IN ('John Doe', 'Jane Smith')
  `;
}

export async function seedTestReservations(count: number = 10) {
  // Seed test data for read operations
  const reservations = Array.from({ length: count }, (_, i) => ({
    customer: { name: `Test User ${i}`, phone: `+1234567${String(i).padStart(3, '0')}` },
    date: new Date(Date.now() + i * 86400000), // i days from now
    partySize: 2 + (i % 6),
    status: 'pending',
  }));

  for (const reservation of reservations) {
    await sql`
      INSERT INTO reservations (customer, date, party_size, status)
      VALUES (${reservation.customer}, ${reservation.date}, ${reservation.partySize}, ${reservation.status})
    `;
  }
}
```

#### CI Integration (GitHub Actions)

```yaml
# .github/workflows/ci.yml (addition to existing workflow)
jobs:
  # ... existing jobs (lint, test, build)

  e2e-test:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [lint, test] # Run after unit tests pass

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: seatkit_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
      fail-fast: false

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build

      - name: Install Playwright browsers
        run: pnpm --filter @seatkit/web playwright install --with-deps ${{ matrix.browser }}

      - name: Run migrations
        run: pnpm --filter @seatkit/api db:migrate:test
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/seatkit_test

      - name: Start API server (background)
        run: pnpm --filter @seatkit/api dev &
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/seatkit_test

      - name: Run Playwright tests
        run: pnpm --filter @seatkit/web test:e2e --project=${{ matrix.browser }}
        env:
          BASE_URL: http://localhost:3000
          API_URL: http://localhost:3001

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.browser }}
          path: packages/web/playwright-report/
          retention-days: 7

      - name: Upload trace files
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces-${{ matrix.browser }}
          path: packages/web/test-results/
          retention-days: 7
```

#### Package Scripts

```json
// packages/web/package.json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:chromium": "playwright test --project=chromium",
    "test:e2e:firefox": "playwright test --project=firefox",
    "test:e2e:webkit": "playwright test --project=webkit",
    "test:e2e:mobile": "playwright test --project='Mobile Chrome' --project='Mobile Safari'",
    "test:e2e:codegen": "playwright codegen http://localhost:3000"
  }
}
```

## Consequences

### Positive
- ✅ Fast execution (2-3x faster than Cypress)
- ✅ Multi-browser coverage (Chromium, Firefox, WebKit)
- ✅ Mobile testing included (responsive validation)
- ✅ Full TypeScript type safety
- ✅ Parallel execution speeds up CI
- ✅ Rich debugging (trace viewer, screenshots, videos)
- ✅ Auto-waiting reduces flaky tests
- ✅ Codegen tool speeds up test authoring
- ✅ Works seamlessly with Next.js dev server
- ✅ Real API integration (not mocks)

### Negative
- ⚠️ Steeper learning curve than Cypress
- ⚠️ Requires test database setup and cleanup
- ⚠️ Longer CI time due to browser matrix (mitigated by parallel execution)
- ⚠️ Test isolation requires careful cleanup between tests
- ⚠️ WebKit tests may be flakier than Chromium

### Mitigation
- Provide comprehensive test examples and documentation
- Use `test.beforeEach()` and `test.afterEach()` for database cleanup
- Configure retries (2 attempts in CI) for flaky tests
- Use Playwright's trace viewer for debugging failures
- Run browser matrix in parallel (4 workers in CI)
- Store artifacts (traces, screenshots) for failed tests
- Start with Chromium tests, add Firefox/WebKit coverage incrementally

## References

- **Playwright Documentation**: [https://playwright.dev/](https://playwright.dev/)
- **Playwright with Next.js**: [https://playwright.dev/docs/test-webserver](https://playwright.dev/docs/test-webserver)
- **GitHub Actions Integration**: [https://playwright.dev/docs/ci-intro](https://playwright.dev/docs/ci-intro)
- **Best Practices**: [https://playwright.dev/docs/best-practices](https://playwright.dev/docs/best-practices)
- **Trace Viewer**: [https://playwright.dev/docs/trace-viewer](https://playwright.dev/docs/trace-viewer)
- **Architecture document**: [/ARCHITECTURE.md](/ARCHITECTURE.md)
- **Existing CI workflow**: [/.github/workflows/ci.yml](/.github/workflows/ci.yml)

---

## Pattern for Future Tests

### Test Organization

Follow this structure for new features:

```typescript
// e2e/{feature}/{action}.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to feature, seed data, etc.
    await page.goto('/feature');
  });

  test.afterEach(async () => {
    // Cleanup: Remove test data from database
  });

  test('should do specific action', async ({ page }) => {
    // Arrange: Setup preconditions

    // Act: Perform user action
    await page.getByRole('button', { name: /action/i }).click();

    // Assert: Verify expected outcome
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

### Naming Conventions

- **Test files**: `{feature}.spec.ts` (e.g., `create.spec.ts`, `list.spec.ts`)
- **Test suites**: `test.describe('Feature Name', () => {...})`
- **Test cases**: `test('should do X when Y', async ({ page }) => {...})`
- **Selectors**: Prefer `getByRole()` > `getByLabel()` > `getByText()` > CSS selectors

### Locator Best Practices

```typescript
// ✅ Do: Use semantic selectors (accessible, resilient)
await page.getByRole('button', { name: /submit/i });
await page.getByLabel(/email address/i);
await page.getByPlaceholder(/search.../i);

// ❌ Don't: Use fragile CSS selectors
await page.locator('.btn-primary');
await page.locator('#submit-button');
```

This ensures tests remain stable as UI implementation changes while maintaining accessibility.
