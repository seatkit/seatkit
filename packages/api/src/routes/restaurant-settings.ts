/**
 * Restaurant settings routes — /api/v1/restaurant-settings
 * GET: read current settings. PUT: update priority order.
 * Phase 2 will add auth guard to the PUT endpoint.
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { restaurantSettings } from '../db/schema/index.js';

import type { FastifyPluginAsync } from 'fastify';

const UpdatePriorityOrderSchema = z.object({
	priorityOrder: z.array(z.string().min(1)).min(1).describe(
		'Table priority order — array of table names (e.g. ["T1","T2"]) in fill order',
	),
});

const RestaurantSettingsSchema = z.object({
	id: z.string().uuid(),
	createdAt: z.date(),
	updatedAt: z.date(),
	priorityOrder: z.array(z.string()),
});

const SettingsResponseSchema = z.object({
	settings: RestaurantSettingsSchema,
});

const UpdateSettingsResponseSchema = z.object({
	settings: RestaurantSettingsSchema,
	message: z.string(),
});

const restaurantSettingsRoutes: FastifyPluginAsync = async fastify => {
	// GET /api/v1/restaurant-settings
	fastify.get(
		'/restaurant-settings',
		{
			schema: {
				response: { 200: SettingsResponseSchema },
			},
		},
		async (_request, _reply) => {
			const [settings] = await db.select().from(restaurantSettings).limit(1);
			if (!settings) {
				throw fastify.httpErrors.notFound(
					'Restaurant settings not found. Run db:seed to initialize.',
				);
			}
			return { settings };
		},
	);

	// PUT /api/v1/restaurant-settings
	fastify.put(
		'/restaurant-settings',
		{
			schema: {
				body: UpdatePriorityOrderSchema.describe('Update table assignment priority order'),
				response: { 200: UpdateSettingsResponseSchema },
			},
		},
		async (request, _reply) => {
			const body = request.body as z.infer<typeof UpdatePriorityOrderSchema>;
			const [existing] = await db.select().from(restaurantSettings).limit(1);
			if (!existing) {
				throw fastify.httpErrors.notFound('Restaurant settings not found. Run db:seed first.');
			}

			const [updated] = await db
				.update(restaurantSettings)
				.set({
					priorityOrder: body.priorityOrder,
					updatedAt: new Date(),
				})
				.where(eq(restaurantSettings.id, existing.id))
				.returning();

			if (!updated) {
				throw fastify.httpErrors.internalServerError('Failed to update restaurant settings');
			}

			return { settings: updated, message: 'Priority order updated successfully' };
		},
	);
};

export default restaurantSettingsRoutes;
