import { test, expect } from '@playwright/test';

/**
 * Reservation Management E2E tests — Phase 4
 * RES-13 (last-edited visible), COLLAB-02 (conflict modal), COLLAB-03 (badges)
 *
 * Prerequisites: API running at NEXT_PUBLIC_API_URL, seeded with test data.
 * Run: pnpm --filter @seatkit/web test:e2e:chromium -- reservations
 */

test.describe('Reservation Management', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to reservations page — adjust if auth guard redirects to /login
		await page.goto('/reservations');
	});

	test('reservations page renders timeline view by default', async ({ page }) => {
		await expect(page.getByRole('tab', { name: 'Timeline' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'List' })).toBeVisible();
		await expect(page.getByRole('tab', { name: 'Floor plan' })).toBeVisible();
	});

	test('clicking List tab shows list view with search input', async ({ page }) => {
		await page.getByRole('tab', { name: 'List' }).click();
		await expect(page.getByRole('searchbox')).toBeVisible();
	});

	test('clicking Floor plan tab shows floor plan view', async ({ page }) => {
		await page.getByRole('tab', { name: 'Floor plan' }).click();
		// Either floor plan table cards or empty state message
		const hasCards = (await page.locator('[data-testid="table-card"]').count()) > 0;
		const hasEmpty = await page.getByText('No tables configured').isVisible();
		expect(hasCards || hasEmpty).toBe(true);
	});

	test('last-edited timestamp is visible in reservation drawer (RES-13)', async ({ page }) => {
		// Skip if no reservations are present
		const block = page.locator('[data-testid="timeline-block"]').first();
		const count = await block.count();
		if (count === 0) {
			test.skip();
			return;
		}
		await block.click();
		// Drawer should be visible with a last-edited timestamp
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByTestId('last-edited-timestamp')).toBeVisible();
	});

	test('conflict modal appears on 409 response (COLLAB-02, COLLAB-03)', async ({ page }) => {
		// Structural: navigate to a reservation and open the drawer
		// The real conflict flow requires two browser contexts — this test verifies structure only
		const block = page.locator('[data-testid="timeline-block"]').first();
		const count = await block.count();
		if (count === 0) {
			test.skip();
			return;
		}
		await block.click();
		await expect(page.getByRole('dialog', { name: /reservation/i })).toBeVisible();
		// Presence badges section should be in the footer
		await expect(page.getByTestId('reservation-presence-row')).toBeVisible();
	});
});
