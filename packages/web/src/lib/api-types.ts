/**
 * API Types
 * Type definitions and Zod schemas for API requests and responses
 * @module lib/api-types
 */

import { ReservationSchema } from '@seatkit/types';
import { z } from 'zod';

/**
 * API response wrapper for list endpoints
 */
export const ListReservationsResponseSchema = z.object({
	reservations: z.array(ReservationSchema),
	count: z.number().int().nonnegative(),
});

export type ListReservationsResponse = z.infer<
	typeof ListReservationsResponseSchema
>;

/**
 * API response wrapper for create endpoint
 */
export const CreateReservationResponseSchema = z.object({
	reservation: ReservationSchema,
	message: z.string(),
});

export type CreateReservationResponse = z.infer<
	typeof CreateReservationResponseSchema
>;

/**
 * API response wrapper for update endpoint
 */
export const UpdateReservationResponseSchema = z.object({
	reservation: ReservationSchema,
	message: z.string(),
});

export type UpdateReservationResponse = z.infer<
	typeof UpdateReservationResponseSchema
>;

/**
 * API response wrapper for delete endpoint
 */
export const DeleteReservationResponseSchema = z.object({
	reservation: ReservationSchema,
	message: z.string(),
});

export type DeleteReservationResponse = z.infer<
	typeof DeleteReservationResponseSchema
>;

/**
 * API error response
 */
export type ApiErrorResponse = {
	error: string;
	message: string;
	details?: string[];
};

/**
 * API request options
 */
export type ApiRequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	headers?: Record<string, string>;
	body?: unknown;
	signal?: AbortSignal;
};
