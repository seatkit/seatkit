/**
 * Tables admin route tests — Phase 2 Plan 04
 * Task IDs: 2-config-01, 2-config-02 (see 02-VALIDATION.md)
 */

import { eq, like } from 'drizzle-orm';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { auth } from '../auth.js';
import { db } from '../db/index.js';
import { user as userTable } from '../db/schema/auth.js';
import { tables, restaurantSettings } from '../db/schema/index.js';
import { TABLE_DATA, DEFAULT_PRIORITY_ORDER } from '../db/seed-data.js';
import { createServer } from '../index.js';

import type { FastifyInstance } from 'fastify';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a test user idempotently — silently ignores "user already exists" errors.
 * This handles test DB state from prior runs without requiring cleanup between runs.
 */
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
	// set-cookie can be string | string[] — take first value
	const first = Array.isArray(raw) ? raw[0] : raw;
	if (!first) throw new Error(`No cookie value returned for ${email}`);
	return first;
}

// ── test suite ────────────────────────────────────────────────────────────────

describe('Tables Admin API (CONFIG-01)', () => {
	let app: FastifyInstance;
	const ADMIN_EMAIL = 'admin-tables@test.com';
	const ADMIN_PASSWORD = 'testpass123!';
	const STAFF_EMAIL = 'staff-tables@test.com';
	const STAFF_PASSWORD = 'staffpass123!';

	beforeAll(async () => {
		app = await createServer();

		// Seed base tables and settings (required by the engine + GET /tables)
		await db.insert(tables).values([...TABLE_DATA]).onConflictDoNothing({ target: tables.name });
		await db
			.insert(restaurantSettings)
			.values({ priorityOrder: [...DEFAULT_PRIORITY_ORDER] })
			.onConflictDoNothing();

		// Bootstrap test users idempotently
		await createUserIdempotent(ADMIN_EMAIL, ADMIN_PASSWORD, 'Test Admin', 'admin');
		await createUserIdempotent(STAFF_EMAIL, STAFF_PASSWORD, 'Test Staff');
	});

	afterAll(async () => {
		// Clean up test tables created during this suite (names start with 'T9' or 'T_')
		await db.delete(tables).where(like(tables.name, 'T9%'));
		await db.delete(tables).where(like(tables.name, 'T\\_%'));

		// Clean up test users directly via Drizzle (auth.api.removeUser requires an auth context)
		// Cascade delete: session/account rows are deleted automatically (onDelete: 'cascade')
		await db.delete(userTable).where(eq(userTable.email, ADMIN_EMAIL));
		await db.delete(userTable).where(eq(userTable.email, STAFF_EMAIL));

		await app.close();
	});

	describe('POST /api/v1/tables (2-config-01)', () => {
		it('admin creates a table; returns 201 with the new table', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			const res = await app.inject({
				method: 'POST',
				url: '/api/v1/tables',
				headers: { cookie },
				payload: { name: 'T99', maxCapacity: 4, minCapacity: 2 },
			});

			expect(res.statusCode).toBe(201);
			const body = res.json<{ table: { id: string; name: string; maxCapacity: number; isActive: boolean } }>();
			expect(body.table).toBeDefined();
			expect(body.table.name).toBe('T99');
			expect(body.table.maxCapacity).toBe(4);
			expect(body.table.isActive).toBe(true);
		});

		it('non-admin receives 403', async () => {
			const cookie = await signIn(app, STAFF_EMAIL, STAFF_PASSWORD);

			const res = await app.inject({
				method: 'POST',
				url: '/api/v1/tables',
				headers: { cookie },
				payload: { name: 'T98', maxCapacity: 4 },
			});

			expect(res.statusCode).toBe(403);
		});
	});

	describe('DELETE /api/v1/tables/:id (2-config-02)', () => {
		it('admin soft-deletes a table; GET /tables no longer includes it', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			// First create a table to delete
			const createRes = await app.inject({
				method: 'POST',
				url: '/api/v1/tables',
				headers: { cookie },
				payload: { name: 'T_DELETE_ME', maxCapacity: 2 },
			});
			expect(createRes.statusCode).toBe(201);
			const { table } = createRes.json<{ table: { id: string; name: string } }>();

			// Soft-delete it
			const deleteRes = await app.inject({
				method: 'DELETE',
				url: `/api/v1/tables/${table.id}`,
				headers: { cookie },
			});
			expect(deleteRes.statusCode).toBe(200);

			// Verify it no longer appears in GET /tables (which only returns isActive=true)
			const listRes = await app.inject({
				method: 'GET',
				url: '/api/v1/tables',
				headers: { cookie },
			});
			expect(listRes.statusCode).toBe(200);
			const listBody = listRes.json<{ tables: { id: string }[] }>();
			const ids = listBody.tables.map((t) => t.id);
			expect(ids).not.toContain(table.id);
		});

		it('returns 404 for non-existent table id', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			const res = await app.inject({
				method: 'DELETE',
				url: '/api/v1/tables/00000000-0000-0000-0000-000000000000',
				headers: { cookie },
			});

			expect(res.statusCode).toBe(404);
		});
	});

	describe('PUT /api/v1/tables/:id', () => {
		it('admin updates table capacity', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			// Create a table to update
			const createRes = await app.inject({
				method: 'POST',
				url: '/api/v1/tables',
				headers: { cookie },
				payload: { name: 'T_UPDATE_ME', maxCapacity: 2 },
			});
			expect(createRes.statusCode).toBe(201);
			const { table } = createRes.json<{ table: { id: string } }>();

			// Update its capacity
			const updateRes = await app.inject({
				method: 'PUT',
				url: `/api/v1/tables/${table.id}`,
				headers: { cookie },
				payload: { maxCapacity: 6, minCapacity: 2 },
			});
			expect(updateRes.statusCode).toBe(200);
			const updated = updateRes.json<{ table: { maxCapacity: number; minCapacity: number } }>();
			expect(updated.table.maxCapacity).toBe(6);
			expect(updated.table.minCapacity).toBe(2);

			// Cleanup (hard delete since this was created for testing only)
			await db.delete(tables).where(eq(tables.id, table.id));
		});
	});
});
