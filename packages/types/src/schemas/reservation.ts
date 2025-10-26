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
	source: z.enum(['phone', 'web', 'walk_in', 'email', 'other']).nullable().optional(), // Optional during creation
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
