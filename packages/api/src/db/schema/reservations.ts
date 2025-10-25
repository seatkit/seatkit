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

// Customer info is stored as JSONB since it's nested
export interface CustomerInfo {
	name: string;
	phone: string;
	email?: string;
	notes?: string;
}

// Reservations table (plural table name as agreed)
export const reservations = pgTable('reservations', {
	// Base entity fields
	id: uuid('id').defaultRandom().primaryKey(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),

	// When & Where
	date: timestamp('date').notNull(), // Reservation date and time
	duration: integer('duration').notNull(), // Expected duration in minutes
	tableIds: jsonb('table_ids').$type<string[]>(), // Assigned table IDs

	// Who
	customer: jsonb('customer').$type<CustomerInfo>().notNull(), // Customer contact info
	partySize: integer('party_size').notNull(), // Number of guests

	// What
	category: reservationCategoryEnum('category').notNull(),
	status: reservationStatusEnum('status').default('pending').notNull(),

	// Additional Info
	notes: text('notes'), // Internal staff notes
	tags: jsonb('tags').$type<string[]>(), // Flexible tagging

	// Metadata
	createdBy: varchar('created_by', { length: 255 }).notNull(), // User ID who created
	source: reservationSourceEnum('source'),
	confirmedAt: timestamp('confirmed_at'),
	seatedAt: timestamp('seated_at'),
	completedAt: timestamp('completed_at'),
	cancelledAt: timestamp('cancelled_at'),
	cancelledBy: varchar('cancelled_by', { length: 255 }), // User ID who cancelled
	cancellationReason: text('cancellation_reason'),
});

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;