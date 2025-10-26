/**
 * Reservation API routes
 * CRUD endpoints for reservation management
 */

import { CreateReservationSchema } from '@seatkit/types';

import { db } from '../db/index.js';
import { reservations } from '../db/schema/index.js';

import type { FastifyPluginAsync } from 'fastify';
import type { CreateReservation } from '@seatkit/types';

const reservationsRoutes: FastifyPluginAsync = async fastify => {
	// GET /api/reservations - List all restaurant reservations
	fastify.get('/reservations', async (request, reply) => {
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
		Body: CreateReservation;
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
				} as const;

				const [createdReservation] = await db
					.insert(reservations)
					.values(reservationData as any) // Type assertion needed due to exact optional types
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
};

export default reservationsRoutes;
