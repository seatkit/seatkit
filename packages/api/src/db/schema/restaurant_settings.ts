/**
 * Restaurant settings schema
 * Single-row table for restaurant-level configuration.
 * Extended in Phase 2 with serviceCategories and serviceHours.
 */

import { pgTable, uuid, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Inline types until @seatkit/types adds ServiceCategory + ServiceHoursConfig
// TODO: extract to @seatkit/types in a future phase

export interface ServiceCategory {
	id: string;
	/** 'lunch' | 'dinner' | 'noBookingZone' */
	name: string;
	/** HH:MM format, e.g. '12:00' */
	startTime: string;
	/** HH:MM format, e.g. '14:30' */
	endTime: string;
	isActive: boolean;
}

export interface ServiceHoursConfig {
	/** Open days as 0–6 (0=Sun, 1=Mon, ..., 6=Sat) */
	openDays: number[];
	/** Default reservation duration in minutes */
	defaultDuration: number;
}

export const restaurantSettings = pgTable('restaurant_settings', {
	// Base entity fields
	id: uuid('id').defaultRandom().primaryKey(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),

	// Table assignment priority order — array of table names in fill order
	// Stored as a single JSON array for atomic reordering
	priorityOrder: jsonb('priority_order').$type<string[]>().notNull(),

	// Phase 2 additions — service configuration
	// Default: empty array → GET endpoints return [] and handle gracefully
	serviceCategories: jsonb('service_categories')
		.$type<ServiceCategory[]>()
		.default([])
		.$defaultFn(() => []),

	// Default: { openDays: [1,2,3,4,5,6], defaultDuration: 90 } (Mon-Sat, 90min)
	serviceHours: jsonb('service_hours')
		.$type<ServiceHoursConfig>()
		.default({ openDays: [1, 2, 3, 4, 5, 6], defaultDuration: 90 })
		.$defaultFn(() => ({ openDays: [1, 2, 3, 4, 5, 6], defaultDuration: 90 })),
});

export type RestaurantSettingsRecord = typeof restaurantSettings.$inferSelect;
export type NewRestaurantSettingsRecord = typeof restaurantSettings.$inferInsert;
