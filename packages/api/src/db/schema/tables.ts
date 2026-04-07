/**
 * Tables schema
 * Physical restaurant tables — capacity and floor plan position data
 */

import {
	pgTable,
	uuid,
	timestamp,
	varchar,
	integer,
	boolean,
} from 'drizzle-orm/pg-core';

export const tables = pgTable('tables', {
	// Base entity fields
	id: uuid('id').defaultRandom().primaryKey(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),

	// Identity — 'T1', 'T2', ..., 'T7'
	name: varchar('name', { length: 50 }).notNull().unique(),

	// Capacity
	maxCapacity: integer('max_capacity').notNull(),
	minCapacity: integer('min_capacity').notNull().default(1),

	// Floor plan position (grid coordinates from KoenjiApp layout)
	// col maps to positionX, row maps to positionY
	positionX: integer('position_x'),
	positionY: integer('position_y'),

	// Permanent deactivation flag (does NOT mean occupied)
	// Availability is computed from reservations, not stored here (per RESEARCH anti-patterns)
	isActive: boolean('is_active').notNull().default(true),
});

export type TableRecord = typeof tables.$inferSelect;
export type NewTableRecord = typeof tables.$inferInsert;
