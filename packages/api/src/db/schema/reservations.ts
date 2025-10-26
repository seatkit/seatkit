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
	tableIds: jsonb('table_ids').$type<string[] | undefined>(), // Assigned table IDs (optional)

	// Who
	customer: jsonb('customer').$type<CustomerInfo>().notNull(), // Customer contact info
	partySize: integer('party_size').notNull(), // Number of guests

	// What
	category: reservationCategoryEnum('category').notNull(),
	status: reservationStatusEnum('status').default('pending').notNull(),

	// Additional Info
	notes: text('notes').$type<string | undefined>(), // Internal staff notes (optional)
	tags: jsonb('tags').$type<string[] | undefined>(), // Flexible tagging (optional)

	// Metadata
	createdBy: varchar('created_by', { length: 255 }).notNull(), // User ID who created
	source: reservationSourceEnum('source').$type<'phone' | 'web' | 'walk_in' | 'email' | 'other' | undefined>(),
	confirmedAt: timestamp('confirmed_at').$type<Date | undefined>(),
	seatedAt: timestamp('seated_at').$type<Date | undefined>(),
	completedAt: timestamp('completed_at').$type<Date | undefined>(),
	cancelledAt: timestamp('cancelled_at').$type<Date | undefined>(),
	cancelledBy: varchar('cancelled_by', { length: 255 }).$type<string | undefined>(), // User ID who cancelled
	cancellationReason: text('cancellation_reason').$type<string | undefined>(),
});

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;