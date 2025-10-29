/**
 * Reservation API Response Schemas
 * Defines response structures for reservation endpoints
 * Note: These use the database return types (which may have undefined)
 * rather than the strict Zod domain schemas (which use null)
 * @module schemas/reservations
 */

import type { Reservation } from '../db/schema/index.js';

/**
 * POST /api/reservations response
 */
export type CreateReservationResponse = {
	message: string;
	reservation: Reservation;
};

/**
 * PUT /api/reservations/:id response
 */
export type UpdateReservationResponse = {
	message: string;
	reservation: Reservation;
};

/**
 * DELETE /api/reservations/:id response
 */
export type DeleteReservationResponse = {
	message: string;
	reservation: Reservation;
};

/**
 * GET /api/reservations response
 */
export type ListReservationsResponse = {
	reservations: Reservation[];
	count: number;
};

/**
 * GET /api/reservations/:id response
 */
export type GetReservationResponse = {
	reservation: Reservation;
};
