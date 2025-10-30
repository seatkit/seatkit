import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
	test('should load and display SeatKit heading', async ({ page }) => {
		await page.goto('/');

		// Verify page title
		await expect(page).toHaveTitle(/SeatKit/);

		// Verify main heading is visible
		await expect(page.getByRole('heading', { name: /seatkit/i })).toBeVisible();

		// Verify description text
		await expect(
			page.getByText(/restaurant reservation management system/i),
		).toBeVisible();

		// Verify reservations link exists
		await expect(
			page.getByRole('link', { name: /view reservations/i }),
		).toBeVisible();
	});

	test('should navigate to reservations page', async ({ page }) => {
		await page.goto('/');

		// Click the reservations link
		await page.getByRole('link', { name: /view reservations/i }).click();

		// Wait for navigation
		await page.waitForURL('/reservations');

		// Verify URL changed
		expect(page.url()).toContain('/reservations');
	});
});
