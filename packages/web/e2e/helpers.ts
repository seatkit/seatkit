import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Navigate to /reservations, find the first timeline block, and open its drawer.
 *
 * Returns `false` when the page redirects to /login (unauthenticated) or when no
 * timeline blocks exist (empty data). The caller should call `test.skip()` and
 * `return` when this function returns false.
 */
export async function openFirstReservationDrawer(page: Page): Promise<boolean> {
	await page.goto('/reservations');
	if (page.url().includes('/login')) return false;

	const block = page.locator('[data-testid="timeline-block"]').first();
	if ((await block.count()) === 0) return false;

	await block.click();
	await expect(page.getByRole('dialog')).toBeVisible();
	return true;
}
