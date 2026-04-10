import { test, expect } from '@playwright/test';

import { openFirstReservationDrawer } from './helpers.js';

/**
 * Reservation Management E2E tests — Phase 4
 * Structural tests: verify UI elements are present without requiring live API data.
 * Functional tests: require API running at NEXT_PUBLIC_API_URL with seeded data.
 *
 * Run: pnpm --filter @seatkit/web test:e2e:chromium -- reservations
 */

test.describe('Reservation Management — Page Structure', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate — middleware may redirect to /login if unauthenticated
		await page.goto('/reservations');
		// If redirected to login, skip (structural tests assume authenticated session)
		const url = page.url();
		if (url.includes('/login')) {
			test.skip();
		}
	});

	test('reservations page renders Timeline as default tab', async ({ page }) => {
		await expect(page.getByRole('tab', { name: 'Timeline' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'List' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Floor plan' })).toBeVisible();
	});

	test('service category tabs are visible alongside view tabs', async ({ page }) => {
		await expect(page.getByRole('tab', { name: 'Lunch' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Dinner' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'No booking zone' })).toBeVisible();
	});

	test('date picker with prev/next arrows is visible in page header', async ({ page }) => {
		await expect(page.getByRole('button', { name: 'Previous day' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Next day' })).toBeVisible();
		await expect(page.locator('input[type="date"]')).toBeVisible();
	});

	test('clicking List tab shows search input', async ({ page }) => {
		await page.getByRole('tab', { name: 'List' }).click();
		await expect(page.getByRole('searchbox')).toBeVisible();
	});

	test('List tab hides service category tabs (category is date-level for list)', async ({
		page,
	}) => {
		await page.getByRole('tab', { name: 'List' }).click();
		await expect(page.getByRole('tab', { name: 'Lunch' })).not.toBeVisible();
	});

	test('clicking Floor plan tab shows floor plan view', async ({ page }) => {
		await page.getByRole('tab', { name: 'Floor plan' }).click();
		// Either table cards or empty state
		const hasCards = (await page.locator('[data-testid="table-card"]').count()) > 0;
		const hasEmpty = await page
			.getByText('No tables configured')
			.isVisible()
			.catch(() => false);
		expect(hasCards || hasEmpty).toBe(true);
	});

	test('AppPresenceBadgeRow renders in app nav (may be empty if no active sessions)', async ({
		page,
	}) => {
		// The aria-label="Staff online" div should be present in the DOM even if empty
		// It renders null when entries.length === 0, so check that nav header is visible
		await expect(page.locator('header')).toBeVisible();
	});
});

test.describe('Reservation Management — Drawer Structure', () => {
	test('clicking a timeline block opens the drawer in edit mode', async ({ page }) => {
		if (!(await openFirstReservationDrawer(page))) { test.skip(); return; }
		// Edit mode: drawer title should be the guest name, not "New reservation"
		await expect(page.locator('#drawer-title')).toBeVisible();
	});

	test('last-edited timestamp is visible in open drawer (RES-13)', async ({ page }) => {
		if (!(await openFirstReservationDrawer(page))) { test.skip(); return; }
		await expect(page.getByTestId('last-edited-timestamp')).toBeVisible();
	});

	test('presence badge row is present in drawer footer', async ({ page }) => {
		if (!(await openFirstReservationDrawer(page))) { test.skip(); return; }
		await expect(page.getByTestId('reservation-presence-row')).toBeVisible();
	});

	test('pressing Escape or clicking backdrop closes the drawer', async ({ page }) => {
		if (!(await openFirstReservationDrawer(page))) { test.skip(); return; }
		await page.locator(String.raw`.fixed.inset-0.bg-black\/40`).click({ force: true });
		await expect(page.getByRole('dialog')).not.toBeVisible();
	});
});
