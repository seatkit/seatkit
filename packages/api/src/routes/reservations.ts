/**
 * Reservation API routes
 * CRUD endpoints for reservation management
 */

import {
	CreateReservationSchema,
	UpdateReservationSchema,
} from '@seatkit/types';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { reservations } from '../db/schema/index.js';

import type {
	CreateReservationResponse,
	UpdateReservationResponse,
	DeleteReservationResponse,
	ListReservationsResponse,
	ErrorResponse,
} from '../schemas/index.js';
import type { CreateReservation, UpdateReservation } from '@seatkit/types';
import type { FastifyPluginAsync } from 'fastify';

// Params schema for routes with ID parameter
const IdParamsSchema = z.object({
	id: z.string().uuid('Invalid UUID format'),
});

const reservationsRoutes: FastifyPluginAsync = async fastify => {
	// GET /api/reservations - List all restaurant reservations
	fastify.get<{
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Reply: ListReservationsResponse | ErrorResponse;
	}>('/reservations', async (request, reply) => {
		try {
			fastify.log.info('Fetching reservations from database');

			// Query all reservations from database
			const allReservations = await db.select().from(reservations);

			fastify.log.info(`Found ${allReservations.length} reservations`);

			return {
				reservations: allReservations,
				count: allReservations.length,
			};
		} catch (error) {
			fastify.log.error({ error }, 'Failed to fetch reservations');

			return reply.status(500).send({
				error: 'Internal server error',
				message: 'Failed to fetch reservations',
			});
		}
	});

	// POST /api/reservations - Create a new reservation
	fastify.post<{
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Body: CreateReservation;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Reply: CreateReservationResponse | ErrorResponse;
	}>(
		'/reservations',
		{
			schema: {
				body: CreateReservationSchema.describe(
					'Create a new restaurant reservation',
				),
			},
		},
		async (request, reply) => {
			try {
				fastify.log.info('Creating new reservation');

				// Convert ISO string to Date object for database insertion
				const reservationData = {
					...request.body,
					date: new Date(request.body.date),
					status: request.body.status || 'pending',
				};

				const [createdReservation] = await db
					.insert(reservations)
					.values(reservationData)
					.returning();

				if (!createdReservation) {
					fastify.log.error('Database insertion failed - no data returned');
					return reply.status(500).send({
						error: 'Database error',
						message: 'Failed to create reservation',
					});
				}

				fastify.log.info(
					{
						id: createdReservation.id,
					},
					'Reservation created successfully',
				);

				return reply.status(201).send({
					reservation: createdReservation,
					message: 'Reservation created successfully',
				});
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				const errorName = error instanceof Error ? error.name : 'UnknownError';

				fastify.log.error(
					{
						error: errorMessage,
						name: errorName,
					},
					'Failed to create reservation',
				);

				// Handle validation errors
				if (error instanceof Error && error.name === 'ZodError') {
					return reply.status(400).send({
						error: 'Validation error',
						message: 'Invalid reservation data provided',
						details: error.message.split('\n'),
					});
				}

				// Handle database constraint errors
				if (error instanceof Error && error.message.includes('constraint')) {
					return reply.status(400).send({
						error: 'Database constraint error',
						message: 'Invalid data provided',
					});
				}

				// Generic error response
				return reply.status(500).send({
					error: 'Internal server error',
					message: 'Failed to create reservation',
				});
			}
		},
	);

	// PUT /api/reservations/:id - Update an existing reservation
	fastify.put<{
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Params: { id: string };
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Body: Omit<UpdateReservation, 'id' | 'updatedAt'>;
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Reply: UpdateReservationResponse | ErrorResponse;
	}>(
		'/reservations/:id',
		{
			schema: {
				body: UpdateReservationSchema.omit({
					id: true,
					updatedAt: true,
				}).describe('Update an existing reservation'),
				params: IdParamsSchema,
			},
		},
		async (request, reply) => {
			try {
				const { id } = request.params;
				fastify.log.info({ id }, 'Updating reservation');

				// Check if reservation exists
				const [existingReservation] = await db
					.select()
					.from(reservations)
					.where(eq(reservations.id, id))
					.limit(1);

				if (!existingReservation) {
					fastify.log.warn({ id }, 'Reservation not found');
					return reply.status(404).send({
						error: 'Not found',
						message: 'Reservation not found',
					});
				}

				// Prepare update data with proper date conversions
				const updateData: Record<string, unknown> = {
					...request.body,
					updatedAt: new Date(),
				};

				// Convert date string fields to Date objects if present
				if (request.body.date) {
					updateData.date = new Date(request.body.date);
				}
				if (request.body.confirmedAt) {
					updateData.confirmedAt = new Date(request.body.confirmedAt);
				}
				if (request.body.seatedAt) {
					updateData.seatedAt = new Date(request.body.seatedAt);
				}
				if (request.body.completedAt) {
					updateData.completedAt = new Date(request.body.completedAt);
				}
				if (request.body.cancelledAt) {
					updateData.cancelledAt = new Date(request.body.cancelledAt);
				}

				// Update reservation in database
				const [updatedReservation] = await db
					.update(reservations)
					.set(updateData)
					.where(eq(reservations.id, id))
					.returning();

				if (!updatedReservation) {
					fastify.log.error('Database update failed - no data returned');
					return reply.status(500).send({
						error: 'Database error',
						message: 'Failed to update reservation',
					});
				}

				fastify.log.info(
					{
						id: updatedReservation.id,
					},
					'Reservation updated successfully',
				);

				return reply.status(200).send({
					reservation: updatedReservation,
					message: 'Reservation updated successfully',
				});
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				const errorName = error instanceof Error ? error.name : 'UnknownError';

				fastify.log.error(
					{
						error: errorMessage,
						name: errorName,
					},
					'Failed to update reservation',
				);

				// Handle validation errors
				if (error instanceof Error && error.name === 'ZodError') {
					return reply.status(400).send({
						error: 'Validation error',
						message: 'Invalid reservation data provided',
						details: error.message.split('\n'),
					});
				}

				// Handle database constraint errors
				if (error instanceof Error && error.message.includes('constraint')) {
					return reply.status(400).send({
						error: 'Database constraint error',
						message: 'Invalid data provided',
					});
				}

				// Generic error response
				return reply.status(500).send({
					error: 'Internal server error',
					message: 'Failed to update reservation',
				});
			}
		},
	);

	// DELETE /api/reservations/:id - Delete a reservation
	fastify.delete<{
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Params: { id: string };
		// eslint-disable-next-line @typescript-eslint/naming-convention
		Reply: DeleteReservationResponse | ErrorResponse;
	}>(
		'/reservations/:id',
		{
			schema: {
				params: IdParamsSchema,
			},
		},
		async (request, reply) => {
			try {
				const { id } = request.params;
				fastify.log.info({ id }, 'Deleting reservation');

				// Check if reservation exists
				const [existingReservation] = await db
					.select()
					.from(reservations)
					.where(eq(reservations.id, id))
					.limit(1);

				if (!existingReservation) {
					fastify.log.warn({ id }, 'Reservation not found');
					return reply.status(404).send({
						error: 'Not found',
						message: 'Reservation not found',
					});
				}

				// Delete reservation from database
				const [deletedReservation] = await db
					.delete(reservations)
					.where(eq(reservations.id, id))
					.returning();

				if (!deletedReservation) {
					fastify.log.error('Database deletion failed - no data returned');
					return reply.status(500).send({
						error: 'Database error',
						message: 'Failed to delete reservation',
					});
				}

				fastify.log.info(
					{
						id: deletedReservation.id,
					},
					'Reservation deleted successfully',
				);

				return reply.status(200).send({
					message: 'Reservation deleted successfully',
					reservation: deletedReservation,
				});
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error ? error.message : 'Unknown error';
				const errorName = error instanceof Error ? error.name : 'UnknownError';

				fastify.log.error(
					{
						error: errorMessage,
						name: errorName,
					},
					'Failed to delete reservation',
				);

				// Generic error response
				return reply.status(500).send({
					error: 'Internal server error',
					message: 'Failed to delete reservation',
				});
			}
		},
	);
};

export default reservationsRoutes;
