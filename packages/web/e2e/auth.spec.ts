/**
 * Auth E2E tests — Phase 2
 * Requirements: AUTH-01 (login), AUTH-03 (logout), AUTH-05 (redirect)
 * Task IDs: 2-e2e-01, 2-e2e-02, 2-e2e-03
 */

import { test, expect } from '@playwright/test';

// Test credentials must match ADMIN_EMAIL + ADMIN_PASSWORD env vars configured in .env.test
// or the seeded admin account from seedAdminIfEmpty()
const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@seatkit.test';
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'changeme123';

const API_SERVER_AVAILABLE = process.env.API_SERVER_AVAILABLE !== 'false';

test.describe('Authentication flows', () => {
	test.beforeEach(async ({ page }) => {
		// Clear cookies before each test to ensure unauthenticated state
		await page.context().clearCookies();
	});

	test('login form submits; redirects to / on success (2-e2e-01)', async ({ page }) => {
		test.skip(!API_SERVER_AVAILABLE, 'API server required for login');
		await page.goto('/login');

		// Fill and submit login form
		await page.fill('#email', TEST_EMAIL);
		await page.fill('#password', TEST_PASSWORD);
		await page.click('button[type="submit"]');

		// Should redirect to home
		await page.waitForURL('/', { timeout: 10_000 });
		expect(page.url()).toContain('/');
	});

	test('sign out button redirects to /login (2-e2e-02)', async ({ page }) => {
		test.skip(!API_SERVER_AVAILABLE, 'API server required for login');
		// Log in first
		await page.goto('/login');
		await page.fill('#email', TEST_EMAIL);
		await page.fill('#password', TEST_PASSWORD);
		await page.click('button[type="submit"]');
		await page.waitForURL('/', { timeout: 10_000 });

		// Navigate to settings to access sign-out
		await page.goto('/settings/tables');

		// Click sign out
		await page.click('button:has-text("Sign out")');

		// Should redirect to login
		await page.waitForURL('/login', { timeout: 10_000 });
		expect(page.url()).toContain('/login');
	});

	test('direct navigation to /settings without cookie redirects to /login (2-e2e-03)', async ({ page }) => {
		// No login — go directly to settings
		await page.goto('/settings/tables');

		// Middleware should redirect to /login
		await page.waitForURL('/login', { timeout: 10_000 });
		expect(page.url()).toContain('/login');
	});
});
