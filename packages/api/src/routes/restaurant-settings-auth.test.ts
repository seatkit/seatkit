/**
 * Restaurant settings auth tests — Phase 2 Plan 04
 * Task IDs: 2-config-03, 2-config-04 (see 02-VALIDATION.md)
 */

import { eq } from 'drizzle-orm';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { db } from '../db/index.js';
import { user as userTable } from '../db/schema/auth.js';
import { restaurantSettings, tables } from '../db/schema/index.js';
import { TABLE_DATA, DEFAULT_PRIORITY_ORDER } from '../db/seed-data.js';
import { createServer } from '../index.js';

import { createUserIdempotent, signIn } from './test-helpers.js';

import type { FastifyInstance } from 'fastify';

// ── test suite ────────────────────────────────────────────────────────────────

describe('Restaurant Settings — auth guard + config (CONFIG-02, CONFIG-03)', () => {
	let app: FastifyInstance;
	const ADMIN_EMAIL = 'admin-settings@test.com';
	const ADMIN_PASSWORD = 'settingspass123!';
	let settingsId: string;

	beforeAll(async () => {
		app = await createServer();

		// Seed base data — delete any existing settings rows first to ensure a
		// single-row state regardless of what other test files may have inserted
		// (restaurantSettings has no unique constraint beyond the random UUID PK,
		// so onConflictDoNothing would silently create duplicate rows otherwise).
		await db.insert(tables).values([...TABLE_DATA]).onConflictDoNothing({ target: tables.name });
		await db.delete(restaurantSettings);
		const [existing] = await db
			.insert(restaurantSettings)
			.values({ priorityOrder: [...DEFAULT_PRIORITY_ORDER] })
			.returning();

		// If insert returned nothing (row already exists), fetch the existing row
		if (existing) {
			settingsId = existing.id;
		} else {
			const [row] = await db.select().from(restaurantSettings).limit(1);
			if (!row) throw new Error('Failed to find or create restaurant settings row');
			settingsId = row.id;
		}

		// Bootstrap admin user
		await createUserIdempotent(ADMIN_EMAIL, ADMIN_PASSWORD, 'Settings Admin', 'admin');
	});

	afterAll(async () => {
		// Reset settings to clean state
		await db
			.update(restaurantSettings)
			.set({
				priorityOrder: [...DEFAULT_PRIORITY_ORDER],
				serviceCategories: [],
				serviceHours: { openDays: [1, 2, 3, 4, 5, 6], defaultDuration: 90 },
				updatedAt: new Date(),
			})
			.where(eq(restaurantSettings.id, settingsId));

		// Clean up test user
		await db.delete(userTable).where(eq(userTable.email, ADMIN_EMAIL));

		await app.close();
	});

	describe('PUT /api/v1/restaurant-settings (2-config-03, 2-config-04)', () => {
		it('unauthenticated PUT returns 401', async () => {
			const res = await app.inject({
				method: 'PUT',
				url: '/api/v1/restaurant-settings',
				payload: { priorityOrder: ['T1', 'T2'] },
			});

			expect(res.statusCode).toBe(401);
		});

		it('admin PUT with serviceHours persists and round-trips correctly', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			const serviceHours = { openDays: [1, 2, 3, 4, 5], defaultDuration: 60 };

			const putRes = await app.inject({
				method: 'PUT',
				url: '/api/v1/restaurant-settings',
				headers: { cookie },
				payload: { serviceHours },
			});

			expect(putRes.statusCode).toBe(200);
			const putBody = putRes.json<{ settings: { serviceHours: typeof serviceHours } }>();
			expect(putBody.settings.serviceHours).toEqual(serviceHours);

			// Round-trip via GET
			const getRes = await app.inject({
				method: 'GET',
				url: '/api/v1/restaurant-settings',
				headers: { cookie },
			});
			expect(getRes.statusCode).toBe(200);
			const getBody = getRes.json<{ settings: { serviceHours: typeof serviceHours } }>();
			expect(getBody.settings.serviceHours).toEqual(serviceHours);
		});

		it('admin PUT with priorityOrder round-trips correctly', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			const newOrder = ['T3', 'T1', 'T2', 'T4', 'T5', 'T6', 'T7'];
			const putRes = await app.inject({
				method: 'PUT',
				url: '/api/v1/restaurant-settings',
				headers: { cookie },
				payload: { priorityOrder: newOrder },
			});

			expect(putRes.statusCode).toBe(200);
			const putBody = putRes.json<{ settings: { priorityOrder: string[] } }>();
			expect(putBody.settings.priorityOrder).toEqual(newOrder);

			// Round-trip via GET
			const getRes = await app.inject({
				method: 'GET',
				url: '/api/v1/restaurant-settings',
				headers: { cookie },
			});
			expect(getRes.statusCode).toBe(200);
			const getBody = getRes.json<{ settings: { priorityOrder: string[] } }>();
			expect(getBody.settings.priorityOrder).toEqual(newOrder);
		});

		it('admin PUT with serviceCategories persists and round-trips correctly', async () => {
			const cookie = await signIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);

			const serviceCategories = [
				{
					id: 'lunch',
					name: 'Lunch',
					startTime: '12:00',
					endTime: '14:30',
					isActive: true,
				},
				{
					id: 'dinner',
					name: 'Dinner',
					startTime: '19:00',
					endTime: '22:00',
					isActive: true,
				},
			];

			const putRes = await app.inject({
				method: 'PUT',
				url: '/api/v1/restaurant-settings',
				headers: { cookie },
				payload: { serviceCategories },
			});

			expect(putRes.statusCode).toBe(200);
			const putBody = putRes.json<{ settings: { serviceCategories: typeof serviceCategories } }>();
			expect(putBody.settings.serviceCategories).toEqual(serviceCategories);

			// Round-trip via GET
			const getRes = await app.inject({
				method: 'GET',
				url: '/api/v1/restaurant-settings',
				headers: { cookie },
			});
			expect(getRes.statusCode).toBe(200);
			const getBody = getRes.json<{ settings: { serviceCategories: typeof serviceCategories } }>();
			expect(getBody.settings.serviceCategories).toEqual(serviceCategories);
		});
	});
});
