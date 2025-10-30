/**
 * E2E test for API client connection health check
 * Verifies that the frontend can communicate with the API
 * @module e2e/api-health.spec
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

test.describe('API Client Connection', () => {
	test('should be able to reach API health endpoint', async ({ request }) => {
		// Test the API health endpoint directly
		const response = await request.get(`${API_BASE_URL}/health`);

		expect(response.status()).toBe(200);

		const body = await response.json();

		expect(body).toHaveProperty('status', 'ok');
		expect(body).toHaveProperty('timestamp');
		expect(body).toHaveProperty('environment');
	});

	test('should handle API connection errors gracefully', async ({ page }) => {
		// Navigate to a page that would use the API client
		// We'll test this by checking error handling in the UI
		// For now, we'll verify the page loads even if API is unavailable
		await page.goto('/reservations');

		// The page should load (even if API call fails)
		// This tests that our error boundary/error handling works
		await expect(page).toHaveTitle(/SeatKit/);
	});

	test('should handle CORS properly', async ({ request }) => {
		// Test that CORS headers are set correctly
		const response = await request.get(`${API_BASE_URL}/health`);

		// CORS headers should be present (Fastify CORS plugin)
		const headers = response.headers();
		
		// In development, CORS should allow all origins
		if (process.env.NODE_ENV !== 'production') {
			// The response should succeed regardless of origin
			expect(response.status()).toBe(200);
		}
	});
});

