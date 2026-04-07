/**
 * Auth service
 * Bootstrap helpers for authentication setup.
 * Follows the same plain-module pattern as reservation-service.ts.
 */

import { eq } from 'drizzle-orm';

import { auth } from '../auth.js';
import { db } from '../db/index.js';
import { user } from '../db/schema/auth.js';

/**
 * Seed the initial admin account from environment variables.
 * Idempotent — no-ops if any users already exist.
 * Called once on API startup after the DB connection is established.
 *
 * Uses Drizzle directly for the existence check (avoids Better Auth admin
 * API's 401 when called without a session context) and signUpEmail for
 * creation (no auth required), then promotes to admin via setRole.
 */
export async function seedAdminIfEmpty(): Promise<void> {
	const email = process.env.ADMIN_EMAIL;
	const password = process.env.ADMIN_PASSWORD;

	if (!email || !password) {
		// Skip silently — operator has not configured env vars
		return;
	}

	// Check for existing users via Drizzle to avoid admin-API auth requirement
	const existing = await db.select({ id: user.id }).from(user).limit(1);
	if (existing.length > 0) {
		// Admin already exists — idempotent, skip
		return;
	}

	// Create the user via signUpEmail (no auth required)
	const result = await auth.api.signUpEmail({
		body: { email, password, name: 'Admin' },
	});

	// Promote to admin role directly in the DB
	await db.update(user).set({ role: 'admin' }).where(eq(user.id, result.user.id));

	/* eslint-disable no-console */
	console.log(`Admin account created for: ${email}`);
}
