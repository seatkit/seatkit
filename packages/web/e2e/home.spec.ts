/**
 * Home route E2E tests
 * Since auth was added in Phase 02, the root route requires a session.
 * Unauthenticated behaviour is tested here; authenticated navigation
 * tests are skipped unless the API server is available.
 */

import { test, expect } from '@playwright/test';

const API_SERVER_AVAILABLE = process.env.API_SERVER_AVAILABLE !== 'false';

const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@seatkit.test';
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'changeme123';

test.describe('Home Page', () => {
	test('unauthenticated visit to / redirects to /login', async ({ page }) => {
		await page.context().clearCookies();
		await page.goto('/');

		await page.waitForURL('/login', { timeout: 10_000 });
		expect(page.url()).toContain('/login');
	});

	test('should navigate to reservations page when authenticated', async ({ page }) => {
		test.skip(!API_SERVER_AVAILABLE, 'API server required for login');

		await page.goto('/login');
		await page.fill('#email', TEST_EMAIL);
		await page.fill('#password', TEST_PASSWORD);
		await page.click('button[type="submit"]');
		await page.waitForURL('/', { timeout: 10_000 });

		await page.goto('/reservations');
		await page.waitForURL('/reservations');
		expect(page.url()).toContain('/reservations');
	});
});
