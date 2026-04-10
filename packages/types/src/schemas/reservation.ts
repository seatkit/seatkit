/**
 * Reservation domain schema
 * Represents a customer booking at the restaurant
 * @module schemas/reservation
 */

import { z } from 'zod';

import {
	BaseEntitySchema,
	DateTimeSchema,
	PhoneSchema,
	EmailSchema,
	NonEmptyStringSchema,
	PositiveIntSchema,
} from './common.js';

/**
 * Acceptance state — whether a reservation has been confirmed by the restaurant (RES-06)
 */
export const AcceptanceStateSchema = z.enum(['toConfirm', 'confirmed']);

export type AcceptanceState = z.infer<typeof AcceptanceStateSchema>;

/**
 * Reservation status lifecycle
 */
export const ReservationStatusSchema = z.enum([
	'pending', // Initial state when reservation is created
	'confirmed', // Customer confirmed the reservation
	'seated', // Party has been seated at their table
	'completed', // Service completed, party has left
	'cancelled', // Cancelled by customer or restaurant
	'no_show', // Customer did not show up
]);

export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

/**
 * Reservation categories for different service types
 */
export const ReservationCategorySchema = z.enum([
	'lunch', // Lunch service
	'dinner', // Dinner service
	'special', // Special events (private dining, tasting menu, etc.)
	'walk_in', // Walk-in without prior reservation
]);

export type ReservationCategory = z.infer<typeof ReservationCategorySchema>;

/**
 * Customer contact information
 */
export const CustomerInfoSchema = z.object({
	name: NonEmptyStringSchema,
	phone: PhoneSchema,
	email: EmailSchema.optional(),
	notes: z.string().optional(), // Dietary restrictions, special requests, etc.
});

export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

/**
 * Core reservation schema
 */
export const ReservationSchema = BaseEntitySchema.extend({
	// When & Where
	date: DateTimeSchema, // Reservation date and time
	duration: PositiveIntSchema, // Expected duration in minutes
	tableIds: z.array(z.string()).nullable(), // Assigned table IDs (can be null from database)

	// Who
	customer: CustomerInfoSchema,
	partySize: PositiveIntSchema, // Number of guests

	// What
	category: ReservationCategorySchema,
	status: ReservationStatusSchema,

	// Additional Info
	notes: z.string().nullable(), // Internal staff notes (can be null from database)
	tags: z.array(z.string()).nullable(), // Flexible tagging (can be null from database)

	// Metadata
	createdBy: z.string(), // User ID who created the reservation
	source: z.enum(['phone', 'web', 'walk_in', 'email', 'other']).nullable(),
	confirmedAt: DateTimeSchema.nullable(),
	seatedAt: DateTimeSchema.nullable(),
	completedAt: DateTimeSchema.nullable(),
	cancelledAt: DateTimeSchema.nullable(),
	cancelledBy: z.string().nullable(), // User ID who cancelled (can be null)
	cancellationReason: z.string().nullable(),

	// Optimistic locking — clients must echo this back on PUT requests (COLLAB-03)
	version: z.number().int().positive(),

	// Soft-delete — RES-03, RES-04
	isDeleted: z.boolean().default(false),
	deletedAt: DateTimeSchema.nullable().optional(),

	// Acceptance state — RES-06
	acceptanceState: AcceptanceStateSchema.default('toConfirm'),

	// Large group flag — RES-08
	isLargeGroup: z.boolean().default(false),

	// Preferred language — RES-09 (e.g., 'en', 'ja', 'it', 'fr')
	preferredLanguage: z.string().max(50).nullable().optional(),

	// Emoji tag — RES-12
	emoji: z.string().max(10).nullable().optional(),

	// Photo attachment URL — RES-10
	photoUrl: z.string().url().nullable().optional(),
});

export type Reservation = z.infer<typeof ReservationSchema>;

/**
 * Input schema for creating a new reservation
 * Omits auto-generated fields and makes nullable fields optional
 */
export const CreateReservationSchema = ReservationSchema.omit({
	id: true,
	createdAt: true,
	updatedAt: true,
	version: true, // Server-managed optimistic lock counter
	status: true, // Status defaults to 'pending'
	confirmedAt: true,
	seatedAt: true,
	completedAt: true,
	cancelledAt: true,
	cancelledBy: true, // Not needed during creation
	cancellationReason: true, // Not needed during creation
}).extend({
	status: ReservationStatusSchema.optional(),
	tableIds: z.array(z.string()).nullable().optional(), // Optional during creation
	notes: z.string().nullable().optional(), // Optional during creation
	tags: z.array(z.string()).nullable().optional(), // Optional during creation
	source: z
		.enum(['phone', 'web', 'walk_in', 'email', 'other'])
		.nullable()
		.optional(), // Optional during creation
	isDeleted: z.boolean().default(false).optional(),
	deletedAt: DateTimeSchema.nullable().optional(),
	acceptanceState: AcceptanceStateSchema.default('toConfirm').optional(),
	isLargeGroup: z.boolean().default(false).optional(),
	preferredLanguage: z.string().max(50).nullable().optional(),
	emoji: z.string().max(10).nullable().optional(),
});

export type CreateReservation = z.infer<typeof CreateReservationSchema>;

/**
 * Input schema for updating an existing reservation
 * All fields optional except ID
 */
export const UpdateReservationSchema = ReservationSchema.partial().required({
	id: true,
	updatedAt: true,
});

export type UpdateReservation = z.infer<typeof UpdateReservationSchema>;

/**
 * Query filters for searching reservations
 */
export const ReservationFiltersSchema = z.object({
	dateFrom: DateTimeSchema.optional(),
	dateTo: DateTimeSchema.optional(),
	status: z.array(ReservationStatusSchema).optional(),
	category: z.array(ReservationCategorySchema).optional(),
	customerName: z.string().optional(),
	customerPhone: z.string().optional(),
	partySize: PositiveIntSchema.optional(),
	tableIds: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
});

export type ReservationFilters = z.infer<typeof ReservationFiltersSchema>;
