/**
 * Restaurant settings routes — /api/v1/restaurant-settings
 * GET: read current settings.
 * PUT: update priority order, service categories, or service hours.
 * Phase 2: auth guard via onRequest hook in index.ts; service config fields added (CONFIG-02/03).
 */

import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { restaurantSettings } from '../db/schema/index.js';

import type { FastifyPluginAsync } from 'fastify';

// ── Schemas ───────────────────────────────────────────────────────────────────

const ServiceCategorySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
	endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
	isActive: z.boolean(),
});

const ServiceHoursConfigSchema = z.object({
	openDays: z.array(z.number().int().min(0).max(6)),
	defaultDuration: z.number().int().min(15).max(480),
});

const UpdateSettingsSchema = z.object({
	priorityOrder: z.array(z.string().min(1)).min(1).optional().describe(
		'Table priority order — array of table names in fill order',
	),
	serviceCategories: z.array(ServiceCategorySchema).optional().describe(
		'Service category configuration (lunch, dinner, noBookingZone)',
	),
	serviceHours: ServiceHoursConfigSchema.optional().describe(
		'Restaurant service hours configuration',
	),
});

const RestaurantSettingsSchema = z.object({
	id: z.string().uuid(),
	createdAt: z.date(),
	updatedAt: z.date(),
	priorityOrder: z.array(z.string()),
	serviceCategories: z.array(ServiceCategorySchema).nullable(),
	serviceHours: ServiceHoursConfigSchema.nullable(),
});

const SettingsResponseSchema = z.object({
	settings: RestaurantSettingsSchema,
});

const UpdateSettingsResponseSchema = z.object({
	settings: RestaurantSettingsSchema,
	message: z.string(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

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
				body: UpdateSettingsSchema.describe(
					'Update restaurant settings (priority order, service categories, service hours)',
				),
				response: { 200: UpdateSettingsResponseSchema },
			},
		},
		async (request, _reply) => {
			const body = request.body as z.infer<typeof UpdateSettingsSchema>;
			const [existing] = await db.select().from(restaurantSettings).limit(1);
			if (!existing) {
				throw fastify.httpErrors.notFound('Restaurant settings not found. Run db:seed first.');
			}

			const [updated] = await db
				.update(restaurantSettings)
				.set({
					...(body.priorityOrder !== undefined && { priorityOrder: body.priorityOrder }),
					...(body.serviceCategories !== undefined && { serviceCategories: body.serviceCategories }),
					...(body.serviceHours !== undefined && { serviceHours: body.serviceHours }),
					updatedAt: new Date(),
				})
				.where(eq(restaurantSettings.id, existing.id))
				.returning();

			if (!updated) {
				throw fastify.httpErrors.internalServerError('Failed to update restaurant settings');
			}

			return { settings: updated, message: 'Settings updated successfully' };
		},
	);
};

export default restaurantSettingsRoutes;
