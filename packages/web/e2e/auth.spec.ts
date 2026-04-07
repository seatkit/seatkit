/**
 * Auth E2E tests — Phase 2 Wave 0 stubs
 * Task IDs: 2-e2e-01, 2-e2e-02, 2-e2e-03 (see 02-VALIDATION.md)
 */

import { test } from '@playwright/test';

test.describe('Authentication flows', () => {
	test.fixme('login form submits; redirects to / on success (2-e2e-01)', async () => {});
	test.fixme('sign out button redirects to /login (2-e2e-02)', async () => {});
	test.fixme(
		'direct navigation to /settings without cookie redirects to /login (2-e2e-03)',
		async () => {},
	);
});
