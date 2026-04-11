/**
 * Reservation API routes — /api/v1/reservations
 * Thin route handlers: validate → delegate to reservation-service → return
 */

import { CreateReservationSchema, ReservationSchema, UpdateReservationSchema } from '@seatkit/types';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/index.js';
import { reservations } from '../db/schema/index.js';
import { uploadReservationPhoto } from '../services/photo-service.js';
import {
	createReservation,
	updateReservation,
	softDeleteReservation,
	recoverReservation,
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

const ListQuerySchema = z.object({
	includeDeleted: z
		.string()
		.optional()
		.transform(v => v === 'true'),
});

const reservationsRoutes: FastifyPluginAsync = async fastify => {
	// GET /api/v1/reservations
	// Excludes soft-deleted rows by default; pass ?includeDeleted=true to include them.
	fastify.get(
		'/reservations',
		{
			schema: {
				querystring: ListQuerySchema,
				response: { 200: ListReservationsResponseSchema },
			},
		},
		async (request, _reply) => {
			const { includeDeleted } = request.query as z.infer<typeof ListQuerySchema>;
			const allReservations = includeDeleted
				? await db.select().from(reservations)
				: await db.select().from(reservations).where(eq(reservations.isDeleted, false));
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
			request.log.warn(
				{
					event: 'reservation.created',
					reservationId: reservation.id,
					fields: {
						date: reservation.date,
						startTime: reservation.startTime,
						partySize: reservation.partySize,
						category: reservation.category,
					},
				},
				'Reservation created',
			);
			const response = await reply.status(201).send({
				reservation,
				message: 'Reservation created successfully',
			});
			// Fire-and-forget: notify WebSocket clients of the new reservation.
			// Must not block the HTTP response (T-03-02-03: payload contains only id, no PII).
			fastify.notifyReservationChange({
				type: 'reservation_changed',
				reservationId: reservation.id,
			}).catch((err) => {
				request.log.error({ err, reservationId: reservation.id }, 'Failed to notify reservation change');
			});
			return response;
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
				request.log.warn(
					{
						event: 'reservation.updated',
						reservationId: updated.id,
						fields: {
							...(body.date !== undefined && { date: body.date }),
							...(body.startTime !== undefined && { startTime: body.startTime }),
							...(body.endTime !== undefined && { endTime: body.endTime }),
							...(body.partySize !== undefined && { partySize: body.partySize }),
							...(body.status !== undefined && { status: body.status }),
							...(body.category !== undefined && { category: body.category }),
							...(body.isDeleted !== undefined && { isDeleted: body.isDeleted }),
						},
					},
					'Reservation updated',
				);
				const response = await reply.status(200).send({
					reservation: updated,
					message: 'Reservation updated successfully',
				});
				// Fire-and-forget: notify WebSocket clients of the update (success path only — not 409).
				fastify.notifyReservationChange({
					type: 'reservation_changed',
					reservationId: updated.id,
				}).catch((err) => {
					request.log.error({ err, reservationId: updated.id }, 'Failed to notify reservation change');
				});
				return response;
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

	// DELETE /api/v1/reservations/:id — soft-delete (sets isDeleted=true, does not purge row)
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
			const deleted = await softDeleteReservation(id, fastify);
			request.log.warn(
				{
					event: 'reservation.deleted',
					reservationId: deleted.id,
				},
				'Reservation soft-deleted',
			);
			const response = await reply.status(200).send({
				reservation: deleted,
				message: 'Reservation deleted successfully',
			});
			// Fire-and-forget: notify WebSocket clients of the soft-deletion.
			fastify.notifyReservationChange({
				type: 'reservation_deleted',
				reservationId: deleted.id,
			}).catch((err) => {
				request.log.error({ err, reservationId: deleted.id }, 'Failed to notify reservation change');
			});
			return response;
		},
	);

	// POST /api/v1/reservations/:id/recover — recover a soft-deleted reservation
	fastify.post(
		'/reservations/:id/recover',
		{
			schema: {
				params: IdParamsSchema,
				response: { 200: ReservationResponseSchema },
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };
			const recovered = await recoverReservation(id, fastify);
			request.log.warn(
				{
					event: 'reservation.recovered',
					reservationId: recovered.id,
				},
				'Reservation recovered',
			);
			const response = await reply.status(200).send({
				reservation: recovered,
				message: 'Reservation recovered successfully',
			});
			// Fire-and-forget: notify WebSocket clients of the recovery.
			fastify.notifyReservationChange({
				type: 'reservation_changed',
				reservationId: recovered.id,
			}).catch((err) => {
				request.log.error({ err, reservationId: recovered.id }, 'Failed to notify reservation change');
			});
			return response;
		},
	);
	// POST /api/v1/reservations/:id/photo — attach a photo to a reservation (RES-10)
	fastify.post(
		'/reservations/:id/photo',
		{
			schema: {
				params: IdParamsSchema,
				response: {
					200: z.object({
						photoUrl: z.string().url(),
						message: z.string(),
					}),
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params as { id: string };

			// Verify reservation exists and is not deleted
			const [reservation] = await db
				.select()
				.from(reservations)
				.where(and(eq(reservations.id, id), eq(reservations.isDeleted, false)));
			if (!reservation) throw fastify.httpErrors.notFound('Reservation not found');

			// Parse multipart upload — @fastify/multipart handles 10 MB bodyLimit per index.ts config
			let file: Awaited<ReturnType<typeof request.file>>;
			try {
				file = await request.file();
			} catch (err: unknown) {
				// @fastify/multipart throws RequestFileTooLargeError on limit exceeded — surface as 413
				const msg = err instanceof Error ? err.message : String(err);
				if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('too large')) {
					throw fastify.httpErrors.payloadTooLarge('File too large. Maximum size is 10 MB.');
				}
				throw err;
			}

			if (!file) throw fastify.httpErrors.badRequest('No file provided');

			// Read file into buffer
			const chunks: Buffer[] = [];
			for await (const chunk of file.file) {
				chunks.push(chunk as Buffer);
			}
			const fileBuffer = Buffer.concat(chunks);

			// Upload to Supabase Storage (throws 415 on invalid MIME, 500 on upload failure)
			const photoUrl = await uploadReservationPhoto(id, fileBuffer, file.mimetype, fastify);

			// Persist URL to the reservation row
			await db
				.update(reservations)
				.set({ photoUrl, updatedAt: new Date() })
				.where(eq(reservations.id, id));

			// Fire-and-forget: notify WebSocket clients of the photo update
			fastify.notifyReservationChange({ type: 'reservation_changed', reservationId: id }).catch((err) => {
				request.log.error({ err, reservationId: id }, 'Failed to notify reservation change');
			});

			return reply.status(200).send({
				photoUrl,
				message: 'Photo uploaded successfully',
			});
		},
	);
};

export default reservationsRoutes;
