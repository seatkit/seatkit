// Wave 0 stub — implementations in Tasks 01-02 and 01-03
/**
 * Integration tests for optimistic locking (version conflict) on PUT /api/v1/reservations/:id
 * Verifies COLLAB-03: concurrent writes are detected and rejected with full conflict data.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { db } from '../../db/index.js';
import { reservations, tables, restaurantSettings } from '../../db/schema/index.js';
import { TABLE_DATA, DEFAULT_PRIORITY_ORDER } from '../../db/seed-data.js';
import { createServer } from '../../index.js';

import { createUserIdempotent, signIn } from '../test-helpers.js';

import type { FastifyInstance, InjectOptions } from 'fastify';

// Dedicated test admin for version conflict tests
const TEST_ADMIN_EMAIL = 'reservations-version-admin@test.com';
const TEST_ADMIN_PASSWORD = 'version-test-pass123!';

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

	// Clean up all reservations before each test
	beforeEach(async () => {
		await db.delete(reservations);
	});

	// Authenticated inject helper
	const inject = (options: InjectOptions | string) =>
		app.inject({
			...(typeof options === 'string' ? { url: options } : options),
			headers: {
				...(typeof options === 'object' ? (options.headers as Record<string, string> | undefined) : undefined),
				...(sessionCookie ? { cookie: sessionCookie } : {}),
			},
		});

	/**
	 * Test 1: PUT with correct version → 200, response version is clientVersion + 1
	 */
	it.todo('should return 200 and increment version when versionId matches current version');

	/**
	 * Test 2: PUT with stale version → 409 with conflict body
	 */
	it.todo('should return 409 with conflict:true and current reservation when versionId is stale');

	/**
	 * Test 3: PUT with stale version → database record unchanged
	 */
	it.todo('should not modify the database record when a stale versionId is provided');

	/**
	 * Test 4: PUT with missing versionId → 400 Bad Request
	 */
	it.todo('should return 400 when versionId is missing from the request body');
});
