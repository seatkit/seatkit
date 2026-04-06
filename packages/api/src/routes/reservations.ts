/**
 * Reservation API routes — /api/v1/reservations
 * Thin route handlers: validate → delegate to reservation-service → return
 */

import { CreateReservationSchema, UpdateReservationSchema } from '@seatkit/types';
import { z } from 'zod';
import { db } from '../db/index.js';
import { reservations } from '../db/schema/index.js';
import {
	createReservation,
	updateReservation,
	deleteReservation,
} from '../services/reservation-service.js';

import type {
	CreateReservationResponse,
	UpdateReservationResponse,
	DeleteReservationResponse,
	ListReservationsResponse,
	ErrorResponse,
} from '../schemas/index.js';
import type { CreateReservation, UpdateReservation } from '@seatkit/types';
import type { FastifyPluginAsync } from 'fastify';

const IdParamsSchema = z.object({
	id: z.string().uuid('Invalid UUID format'),
});

const reservationsRoutes: FastifyPluginAsync = async fastify => {
	// GET /api/v1/reservations
	fastify.get<{ Reply: ListReservationsResponse | ErrorResponse }>(
		'/reservations',
		async (_request, _reply) => {
			const allReservations = await db.select().from(reservations);
			return { reservations: allReservations, count: allReservations.length };
		},
	);

	// POST /api/v1/reservations
	fastify.post<{
		Body: CreateReservation;
		Reply: CreateReservationResponse | ErrorResponse;
	}>(
		'/reservations',
		{
			schema: {
				body: CreateReservationSchema.describe('Create a new restaurant reservation'),
			},
		},
		async (request, reply) => {
			const reservation = await createReservation(request.body, fastify);
			return reply.status(201).send({
				reservation,
				message: 'Reservation created successfully',
			});
		},
	);

	// PUT /api/v1/reservations/:id
	fastify.put<{
		Params: { id: string };
		Body: Omit<UpdateReservation, 'id' | 'updatedAt'>;
		Reply: UpdateReservationResponse | ErrorResponse;
	}>(
		'/reservations/:id',
		{
			schema: {
				body: UpdateReservationSchema.omit({ id: true, updatedAt: true }).describe(
					'Update an existing reservation',
				),
				params: IdParamsSchema,
			},
		},
		async (request, reply) => {
			const updated = await updateReservation(request.params.id, request.body, fastify);
			return reply.status(200).send({
				reservation: updated,
				message: 'Reservation updated successfully',
			});
		},
	);

	// DELETE /api/v1/reservations/:id
	fastify.delete<{
		Params: { id: string };
		Reply: DeleteReservationResponse | ErrorResponse;
	}>(
		'/reservations/:id',
		{
			schema: { params: IdParamsSchema },
		},
		async (request, reply) => {
			const deleted = await deleteReservation(request.params.id, fastify);
			return reply.status(200).send({
				reservation: deleted,
				message: 'Reservation deleted successfully',
			});
		},
	);
};

export default reservationsRoutes;
