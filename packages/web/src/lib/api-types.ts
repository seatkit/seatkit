/**
 * API Types
 * Type definitions for API requests and responses
 * @module lib/api-types
 */

import type { Reservation } from '@seatkit/types';

/**
 * API response wrapper for list endpoints
 */
export type ListReservationsResponse = {
	reservations: Reservation[];
	count: number;
};

/**
 * API response wrapper for create endpoint
 */
export type CreateReservationResponse = {
	reservation: Reservation;
	message: string;
};

/**
 * API response wrapper for update endpoint
 */
export type UpdateReservationResponse = {
	reservation: Reservation;
	message: string;
};

/**
 * API response wrapper for delete endpoint
 */
export type DeleteReservationResponse = {
	reservation: Reservation;
	message: string;
};

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

