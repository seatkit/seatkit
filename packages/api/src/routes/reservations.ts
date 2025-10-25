/**
 * Reservation API routes
 * CRUD endpoints for reservation management
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { reservations } from '../db/schema/index.js';

// Import Zod schemas from types package
import { ReservationSchema } from '@seatkit/types';

const reservationsRoutes: FastifyPluginAsync = async (fastify) => {
	// GET /api/reservations - List all reservations
	fastify.get(
		'/reservations',
		{
			schema: {
				description: 'List all reservations',
				tags: ['reservations'],
				response: {
					200: z.object({
						reservations: z.array(ReservationSchema),
						count: z.number(),
					}),
					500: z.object({
						error: z.string(),
						message: z.string(),
					}),
				},
			},
		},
		async (request, reply) => {
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
		},
	);
};

export default reservationsRoutes;