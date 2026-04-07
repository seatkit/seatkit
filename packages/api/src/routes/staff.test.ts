/**
 * Staff management route tests — Phase 2 Plan 04
 * Task ID: 2-staff-01 (see 02-VALIDATION.md)
 */

import { eq } from 'drizzle-orm';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { auth } from '../auth.js';
import { db } from '../db/index.js';
import { user as userTable } from '../db/schema/auth.js';
import { tables, restaurantSettings } from '../db/schema/index.js';
import { TABLE_DATA, DEFAULT_PRIORITY_ORDER } from '../db/seed-data.js';
import { createServer } from '../index.js';

import type { FastifyInstance } from 'fastify';

// ── helpers ──────────────────────────────────────────────────────────────────

async function createUserIdempotent(
	email: string,
	password: string,
	name: string,
	role?: 'admin',
): Promise<void> {
	try {
		await auth.api.createUser({
			body: { email, password, name, ...(role ? { role } : {}) },
		});
	} catch (err: unknown) {
		const apiErr = err as { body?: { code?: string } };
		if (apiErr?.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') return;
		throw err;
	}
}

async function signIn(app: FastifyInstance, email: string, password: string): Promise<string> {
	const res = await app.inject({
		method: 'POST',
		url: '/api/auth/sign-in/email',
		payload: { email, password },
	});
	const raw = res.headers['set-cookie'];
	if (!raw) throw new Error(`Sign-in failed for ${email}: ${res.statusCode} ${res.body}`);
	const first = Array.isArray(raw) ? raw[0] : raw;
	if (!first) throw new Error(`No cookie value returned for ${email}`);
	return first;
}

// ── test suite ────────────────────────────────────────────────────────────────

describe('Staff Management API (CONFIG-04)', () => {
	let app: FastifyInstance;
	const ADMIN_EMAIL = 'admin-staff@test.com';
	const ADMIN_PASSWORD = 'staffadmin123!';
	const STAFF_EMAIL = 'staff-member@test.com';
	const STAFF_PASSWORD = 'staffmember123!';

	beforeAll(async () => {
		app = await createServer();

		// Seed base data
		await db.insert(tables).values([...TABLE_DATA]).onConflictDoNothing({ target: tables.name });
		await db
			.insert(restaurantSettings)
			.values({ priorityOrder: [...DEFAULT_PRIORITY_ORDER] })
			.onConflictDoNothing();

		// Bootstrap admin + staff users
		await createUserIdempotent(ADMIN_EMAIL, ADMIN_PASSWORD, 'Staff Test Admin', 'admin');
		await createUserIdempotent(STAFF_EMAIL, STAFF_PASSWORD, 'Test Staff Member');
	});

	afterAll(async () => {
		// Clean up test users directly via Drizzle
		await db.delete(userTable).where(eq(userTable.email, ADMIN_EMAIL));
		await db.delete(userTable).where(eq(userTable.email, STAFF_EMAIL));
		// Also clean up any invited users created during tests
		await db.delete(userTable).where(eq(userTable.email, 'invited-staff@test.com'));

		await app.close();
	});

	describe('GET /api/v1/staff', () => {
		it('admin can list all staff members', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			const res = await app.inject({
				method: 'GET',
				url: '/api/v1/staff',
				headers: { cookie },
			});

			expect(res.statusCode).toBe(200);
			const body = res.json<{ users: { id: string; email: string }[]; total: number }>();
			expect(Array.isArray(body.users)).toBe(true);
			expect(typeof body.total).toBe('number');
			// Verify our test users are present
			const emails = body.users.map((u) => u.email);
			expect(emails).toContain(ADMIN_EMAIL);
		});

		it('non-admin receives 403', async () => {
			const cookie = await signIn(app, STAFF_EMAIL, STAFF_PASSWORD);

			const res = await app.inject({
				method: 'GET',
				url: '/api/v1/staff',
				headers: { cookie },
			});

			expect(res.statusCode).toBe(403);
		});
	});

	describe('PUT /api/v1/staff/:id/role (2-staff-01)', () => {
		it('admin grants manager role; GET /staff returns role=manager', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			// Find the staff member's id
			const listRes = await app.inject({
				method: 'GET',
				url: '/api/v1/staff',
				headers: { cookie },
			});
			const { users } = listRes.json<{ users: { id: string; email: string; role: string | null }[] }>();
			const staffUser = users.find((u) => u.email === STAFF_EMAIL);
			if (!staffUser) throw new Error('Staff user not found in list');

			// Grant manager role
			const roleRes = await app.inject({
				method: 'PUT',
				url: `/api/v1/staff/${staffUser.id}/role`,
				headers: { cookie },
				payload: { role: 'manager' },
			});

			expect(roleRes.statusCode).toBe(200);

			// Verify via GET /staff — role should be updated
			const verifyRes = await app.inject({
				method: 'GET',
				url: '/api/v1/staff',
				headers: { cookie },
			});
			const { users: updated } = verifyRes.json<{ users: { id: string; email: string; role: string | null }[] }>();
			const updatedUser = updated.find((u) => u.email === STAFF_EMAIL);
			expect(updatedUser?.role).toBe('manager');
		});
	});

	describe('DELETE /api/v1/staff/:id', () => {
		it('admin removes staff member; user no longer appears in list', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			// Create a temporary staff user to remove
			await createUserIdempotent('temp-staff-delete@test.com', 'temppass123!', 'Temp Staff');

			// Find the temporary user
			const listRes = await app.inject({
				method: 'GET',
				url: '/api/v1/staff',
				headers: { cookie },
			});
			const { users } = listRes.json<{ users: { id: string; email: string }[] }>();
			const tempUser = users.find((u) => u.email === 'temp-staff-delete@test.com');
			if (!tempUser) throw new Error('Temp user not found in list');

			// Remove the user
			const deleteRes = await app.inject({
				method: 'DELETE',
				url: `/api/v1/staff/${tempUser.id}`,
				headers: { cookie },
			});

			expect(deleteRes.statusCode).toBe(200);

			// Verify user no longer appears in the list
			const verifyRes = await app.inject({
				method: 'GET',
				url: '/api/v1/staff',
				headers: { cookie },
			});
			const { users: remaining } = verifyRes.json<{ users: { id: string; email: string }[] }>();
			const emails = remaining.map((u) => u.email);
			expect(emails).not.toContain('temp-staff-delete@test.com');
		});
	});

	describe('POST /api/v1/staff/invite (2-staff-01)', () => {
		it('admin sends invite; returns 200 with message', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			const res = await app.inject({
				method: 'POST',
				url: '/api/v1/staff/invite',
				headers: { cookie },
				payload: { email: 'invited-staff@test.com', role: 'staff' },
			});

			// 200 = invite sent; 409 = already exists (acceptable in repeated test runs)
			expect([200, 409]).toContain(res.statusCode);
			if (res.statusCode === 200) {
				const body = res.json<{ message: string }>();
				expect(body.message).toContain('invited-staff@test.com');
			}
		});
	});
});
