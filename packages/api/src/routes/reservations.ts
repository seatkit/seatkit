/**
 * Reservation API routes — /api/v1/reservations
 * Thin route handlers: validate → delegate to reservation-service → return
 */

import { CreateReservationSchema, ReservationSchema, UpdateReservationSchema } from '@seatkit/types';
import { z } from 'zod';

import { db } from '../db/index.js';
import { reservations } from '../db/schema/index.js';
import {
	createReservation,
	updateReservation,
	deleteReservation,
} from '../services/reservation-service.js';

import type { FastifyPluginAsync } from 'fastify';

const IdParamsSchema = z.object({
	id: z.string().uuid('Invalid UUID format'),
});

const ReservationResponseSchema = z.object({
	reservation: ReservationSchema,
	message: z.string(),
});

const ListReservationsResponseSchema = z.object({
	reservations: z.array(ReservationSchema),
	count: z.number().int().nonnegative(),
});

const reservationsRoutes: FastifyPluginAsync = async fastify => {
	// GET /api/v1/reservations
	fastify.get(
		'/reservations',
		{
			schema: {
				response: { 200: ListReservationsResponseSchema },
			},
		},
		async (_request, _reply) => {
			const allReservations = await db.select().from(reservations);
			return { reservations: allReservations, count: allReservations.length };
		},
	);

	// POST /api/v1/reservations
	fastify.post(
		'/reservations',
		{
			schema: {
				body: CreateReservationSchema.describe('Create a new restaurant reservation'),
				response: { 201: ReservationResponseSchema },
			},
		},
		async (request, reply) => {
			const reservation = await createReservation(
				request.body as z.infer<typeof CreateReservationSchema>,
				fastify,
			);
			return reply.status(201).send({
				reservation,
				message: 'Reservation created successfully',
			});
		},
	);

	// PUT /api/v1/reservations/:id
	fastify.put(
		'/reservations/:id',
		{
			schema: {
				body: UpdateReservationSchema.omit({ id: true, updatedAt: true }).describe(
					'Update an existing reservation',
				),
				params: IdParamsSchema,
				response: { 200: ReservationResponseSchema },
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const body = request.body as z.infer<typeof UpdateReservationSchema>;
			const updated = await updateReservation(id, body, fastify);
			return reply.status(200).send({
				reservation: updated,
				message: 'Reservation updated successfully',
			});
		},
	);

	// DELETE /api/v1/reservations/:id
	fastify.delete(
		'/reservations/:id',
		{
			schema: {
				params: IdParamsSchema,
				response: { 200: ReservationResponseSchema },
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const deleted = await deleteReservation(id, fastify);
			return reply.status(200).send({
				reservation: deleted,
				message: 'Reservation deleted successfully',
			});
		},
	);
};

export default reservationsRoutes;
