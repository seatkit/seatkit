/**
 * Reservations table schema
 * Drizzle ORM schema for customer reservations
 */

import {
	pgTable,
	uuid,
	timestamp,
	varchar,
	integer,
	jsonb,
	pgEnum,
	text,
	boolean,
} from 'drizzle-orm/pg-core';

import type { CustomerInfo } from '@seatkit/types';

// Enum definitions that match our Zod schemas
export const reservationStatusEnum = pgEnum('reservation_status', [
	'pending',
	'confirmed',
	'seated',
	'completed',
	'cancelled',
	'no_show',
]);

export const reservationCategoryEnum = pgEnum('reservation_category', [
	'lunch',
	'dinner',
	'special',
	'walk_in',
]);

export const reservationSourceEnum = pgEnum('reservation_source', [
	'phone',
	'web',
	'walk_in',
	'email',
	'other',
]);


// Reservations table (plural table name as agreed)
export const reservations = pgTable('reservations', {
	// Base entity fields
	id: uuid('id').defaultRandom().primaryKey(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),

	// When & Where
	date: timestamp('date').notNull(), // Reservation date and time
	duration: integer('duration').notNull(), // Expected duration in minutes
	tableIds: jsonb('table_ids').$type<string[] | null>(), // Assigned table IDs (optional)

	// Who
	customer: jsonb('customer').$type<CustomerInfo>().notNull(), // Customer contact info
	partySize: integer('party_size').notNull(), // Number of guests

	// What
	category: reservationCategoryEnum('category').notNull(),
	status: reservationStatusEnum('status').default('pending').notNull(),

	// Additional Info
	notes: text('notes').$type<string | null>(), // Internal staff notes (optional)
	tags: jsonb('tags').$type<string[] | null>(), // Flexible tagging (optional)

	// Metadata
	createdBy: varchar('created_by', { length: 255 }).notNull(), // User ID who created
	source: reservationSourceEnum('source').$type<'phone' | 'web' | 'walk_in' | 'email' | 'other' | null>(),
	confirmedAt: timestamp('confirmed_at').$type<Date | null>(),
	seatedAt: timestamp('seated_at').$type<Date | null>(),
	completedAt: timestamp('completed_at').$type<Date | null>(),
	cancelledAt: timestamp('cancelled_at').$type<Date | null>(),
	cancelledBy: varchar('cancelled_by', { length: 255 }).$type<string | null>(), // User ID who cancelled
	cancellationReason: text('cancellation_reason').$type<string | null>(),

	// Optimistic locking — COLLAB-03
	// Incremented atomically on each successful update.
	// Clients must include the current version in PUT requests; a mismatch returns 409.
	version: integer('version').notNull().default(1),
});

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;