/**
 * Integration tests for optimistic locking (version conflict) on PUT /api/v1/reservations/:id
 * Verifies COLLAB-03: concurrent writes are detected and rejected with full conflict data.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { reservations, tables, restaurantSettings } from '../../db/schema/index.js';
import { TABLE_DATA, DEFAULT_PRIORITY_ORDER } from '../../db/seed-data.js';
import { createServer } from '../../index.js';

import { createUserIdempotent, signIn } from '../test-helpers.js';

import type { Reservation } from '../../db/schema/reservations.js';
import type { FastifyInstance, InjectOptions } from 'fastify';

// Dedicated test admin for version conflict tests
const TEST_ADMIN_EMAIL = 'reservations-version-admin@test.com';
const TEST_ADMIN_PASSWORD = 'version-test-pass123!';

/** Minimal valid update payload (all optional fields omitted) */
const MINIMAL_UPDATE = {
	notes: 'Updated by version conflict test',
} as const;

/** Minimal valid reservation payload for creating test fixtures */
const BASE_RESERVATION = {
	date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
	duration: 90,
	customer: {
		name: 'Version Test Customer',
		phone: '+1-555-000-0001',
	},
	partySize: 2,
	category: 'lunch',
	createdBy: 'test-user-id',
} as const;

/** Response shape for a 409 conflict */
type ConflictResponse = {
	conflict: true;
	current: Reservation;
};

describe('Reservations API — Optimistic Locking', () => {
	let app: FastifyInstance;
	let sessionCookie: string;

	beforeAll(async () => {
		app = await createServer();

		// Seed tables and restaurant settings required by the engine's table assignment logic
		await db.insert(tables).values([...TABLE_DATA]).onConflictDoNothing({ target: tables.name });
		await db
			.insert(restaurantSettings)
			.values({ priorityOrder: [...DEFAULT_PRIORITY_ORDER] })
			.onConflictDoNothing();

		await createUserIdempotent(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, 'Version Test Admin', 'admin');
		sessionCookie = await signIn(app, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
	});

	afterAll(async () => {
		await app.close();
	});

	// Clean up all reservations before each test so table availability is not exhausted
	beforeEach(async () => {
		await db.delete(reservations);
	});

	// Authenticated inject helper — includes session cookie on every request
	const inject = (options: InjectOptions | string) =>
		app.inject({
			...(typeof options === 'string' ? { url: options } : options),
			headers: {
				...(typeof options === 'object' ? (options.headers as Record<string, string> | undefined) : undefined),
				...(sessionCookie ? { cookie: sessionCookie } : {}),
			},
		});

	/**
	 * Helper: create a reservation via POST and return the full body.
	 */
	async function createTestReservation(): Promise<Reservation> {
		const res = await inject({
			method: 'POST',
			url: '/api/v1/reservations',
			payload: BASE_RESERVATION,
		});
		expect(res.statusCode).toBe(201);
		const body = res.json<{ reservation: Reservation }>();
		return body.reservation;
	}

	/**
	 * Test 1: PUT with correct version → 200, response version is clientVersion + 1
	 */
	it('should return 200 and increment version when versionId matches current version', async () => {
		const created = await createTestReservation();
		const initialVersion = created.version;

		const res = await inject({
			method: 'PUT',
			url: `/api/v1/reservations/${created.id}`,
			payload: {
				...MINIMAL_UPDATE,
				versionId: initialVersion,
			},
		});

		expect(res.statusCode).toBe(200);

		const body = res.json<{ reservation: Reservation; message: string }>();
		expect(body.message).toBe('Reservation updated successfully');
		expect(body.reservation.id).toBe(created.id);
		// Version must be incremented by exactly 1
		expect(body.reservation.version).toBe(initialVersion + 1);
		expect(body.reservation.notes).toBe(MINIMAL_UPDATE.notes);
	});

	/**
	 * Test 2: PUT with stale version → 409 with conflict body containing current state
	 */
	it('should return 409 with conflict:true and current reservation when versionId is stale', async () => {
		const created = await createTestReservation();
		const staleVersion = 0; // DB has version 1, so 0 is always stale

		const res = await inject({
			method: 'PUT',
			url: `/api/v1/reservations/${created.id}`,
			payload: {
				...MINIMAL_UPDATE,
				versionId: staleVersion,
			},
		});

		expect(res.statusCode).toBe(409);

		const body = res.json<ConflictResponse>();
		expect(body.conflict).toBe(true);
		expect(body.current).toBeDefined();
		// current must contain the real server-side reservation
		expect(body.current.id).toBe(created.id);
		// current.version is what the client should use for their next attempt
		expect(typeof body.current.version).toBe('number');
		expect(body.current.version).toBeGreaterThan(staleVersion);
	});

	/**
	 * Test 3: PUT with stale version → database record unchanged (no partial write)
	 */
	it('should not modify the database record when a stale versionId is provided', async () => {
		const created = await createTestReservation();
		const originalNotes = created.notes;

		// Attempt update with stale version
		await inject({
			method: 'PUT',
			url: `/api/v1/reservations/${created.id}`,
			payload: {
				notes: 'This write should be rejected',
				versionId: 0, // stale
			},
		});

		// Re-fetch directly from DB to verify no write occurred
		const [dbRecord] = await db
			.select()
			.from(reservations)
			.where(eq(reservations.id, created.id))
			.limit(1);

		expect(dbRecord).toBeDefined();
		// Notes must not have been changed
		expect(dbRecord!.notes).toBe(originalNotes);
		// Version must still be the original value
		expect(dbRecord!.version).toBe(created.version);
	});

	/**
	 * Test 4: PUT with missing versionId → 400 Bad Request (Zod rejects missing field)
	 */
	it('should return 400 when versionId is missing from the request body', async () => {
		const created = await createTestReservation();

		const res = await inject({
			method: 'PUT',
			url: `/api/v1/reservations/${created.id}`,
			payload: {
				// Deliberately omitting versionId
				notes: 'Missing versionId test',
			},
		});

		expect(res.statusCode).toBe(400);
	});
});
