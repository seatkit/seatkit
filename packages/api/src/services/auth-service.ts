/**
 * Auth service
 * Bootstrap helpers for authentication setup.
 * Follows the same plain-module pattern as reservation-service.ts.
 */

import { auth } from '../auth.js';

/**
 * Seed the initial admin account from environment variables.
 * Idempotent — no-ops if any users already exist.
 * Called once on API startup after the DB connection is established.
 */
export async function seedAdminIfEmpty(): Promise<void> {
	const email = process.env.ADMIN_EMAIL;
	const password = process.env.ADMIN_PASSWORD;

	if (!email || !password) {
		// Skip silently — operator has not configured env vars
		return;
	}

	const existing = await auth.api.listUsers({ query: { limit: 1 } });
	if (existing.users.length > 0) {
		// Admin already exists — idempotent, skip
		return;
	}

	await auth.api.createUser({
		body: {
			email,
			password,
			name: 'Admin',
			role: 'admin',
		},
	});

	/* eslint-disable no-console */
	console.log(`Admin account created for: ${email}`);
}
