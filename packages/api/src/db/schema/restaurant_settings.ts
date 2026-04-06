/**
 * Restaurant settings schema
 * Single-row table for restaurant-level configuration.
 * Designed to be extended in Phase 2 with: serviceHours, slotDuration, timezone, etc.
 */

import { pgTable, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const restaurantSettings = pgTable('restaurant_settings', {
	// Base entity fields
	id: uuid('id').defaultRandom().primaryKey(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),

	// Table assignment priority order — array of table names in fill order
	// Stored as a single JSON array for atomic reordering (one write = one transaction)
	// Phase 2 admin UI will PUT the whole array in one request
	priorityOrder: jsonb('priority_order').$type<string[]>().notNull(),

	// Phase 2 placeholders (add columns here, not new tables):
	// serviceHours, slotDurationMinutes, timezone, restaurantName, etc.
});

export type RestaurantSettingsRecord = typeof restaurantSettings.$inferSelect;
export type NewRestaurantSettingsRecord = typeof restaurantSettings.$inferInsert;
