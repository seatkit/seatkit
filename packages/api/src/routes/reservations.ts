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
	VersionConflictError,
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
	// Requires `versionId` (optimistic lock token) in the request body.
	// Returns 409 with { conflict: true, current: Reservation } when versions diverge (COLLAB-03).
	const UpdateReservationBodySchema = UpdateReservationSchema.omit({
		id: true,
		updatedAt: true,
	}).extend({
		// Clients must echo back the version they last read.
		// Non-integer or missing value → 400 Bad Request (T-03-01-01 mitigation).
		versionId: z.number().int().positive(),
	});

	fastify.put(
		'/reservations/:id',
		{
			schema: {
				body: UpdateReservationBodySchema.describe('Update an existing reservation'),
				params: IdParamsSchema,
				response: { 200: ReservationResponseSchema },
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const { versionId, ...body } = request.body as z.infer<typeof UpdateReservationBodySchema>;
			try {
				const updated = await updateReservation(id, versionId, body, fastify);
				return reply.status(200).send({
					reservation: updated,
					message: 'Reservation updated successfully',
				});
			} catch (err: unknown) {
				if (err instanceof VersionConflictError) {
					// D-05: 409 body contains current server state so the client can retry.
					// Cast reply to bypass Fastify's response-schema narrowing (409 is not
					// in the declared schema, but we intentionally send it outside schema
					// serialization so the full conflict object is transmitted as-is).
					return (reply as unknown as { status(c: number): { send(d: unknown): unknown } })
						.status(409)
						.send({ conflict: true, current: err.current }); // intentional out-of-schema 409
				}
				throw err;
			}
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
