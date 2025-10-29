/**
 * Tests for reservation API routes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { createServer } from '../index.js';

import type {
	CreateReservationResponse,
	UpdateReservationResponse,
	DeleteReservationResponse,
	ListReservationsResponse,
	ErrorResponse,
} from '../schemas/index.js';
import type { FastifyInstance } from 'fastify';

describe('Reservations API', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = await createServer();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('POST /api/reservations', () => {
		it('should create a new reservation with valid data', async () => {
			const validReservation = {
				date: new Date().toISOString(),
				duration: 120,
				customer: {
					name: 'John Doe',
					phone: '+1-555-123-4567',
					email: 'john@example.com',
				},
				partySize: 4,
				category: 'dinner',
				createdBy: 'test-user-id',
				source: 'phone',
			};

			const response = await app.inject({
				method: 'POST',
				url: '/api/reservations',
				payload: validReservation,
			});

			expect(response.statusCode).toBe(201);

			const body = response.json<CreateReservationResponse>();
			expect(body.message).toBe('Reservation created successfully');
			expect(body.reservation).toBeDefined();
			expect(body.reservation.id).toBeDefined();
			expect(body.reservation.customer.name).toBe('John Doe');
			expect(body.reservation.status).toBe('pending');
		});

		it('should return 400 for invalid customer phone', async () => {
			const invalidReservation = {
				date: new Date().toISOString(),
				duration: 120,
				customer: {
					name: 'John Doe',
					phone: 'invalid-phone',
				},
				partySize: 4,
				category: 'dinner',
				createdBy: 'test-user-id',
			};

			const response = await app.inject({
				method: 'POST',
				url: '/api/reservations',
				payload: invalidReservation,
			});

			expect(response.statusCode).toBe(400);

			const body = response.json<ErrorResponse>();
			expect(body.error).toBe('Bad Request');
		});

		it('should return 400 for missing required fields', async () => {
			const incompleteReservation = {
				date: new Date().toISOString(),
				// Missing other required fields
			};

			const response = await app.inject({
				method: 'POST',
				url: '/api/reservations',
				payload: incompleteReservation,
			});

			expect(response.statusCode).toBe(400);
		});

		it('should default status to pending when not provided', async () => {
			const reservation = {
				date: new Date().toISOString(),
				duration: 90,
				customer: {
					name: 'Jane Smith',
					phone: '+1-555-987-6543',
				},
				partySize: 2,
				category: 'lunch',
				createdBy: 'test-user-id',
			};

			const response = await app.inject({
				method: 'POST',
				url: '/api/reservations',
				payload: reservation,
			});

			expect(response.statusCode).toBe(201);

			const body = response.json<CreateReservationResponse>();
			expect(body.reservation.status).toBe('pending');
		});
	});

	describe('GET /api/reservations', () => {
		it('should return list of reservations', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/reservations',
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<ListReservationsResponse>();
			expect(body.reservations).toBeDefined();
			expect(body.count).toBeDefined();
			expect(Array.isArray(body.reservations)).toBe(true);
		});
	});

	describe('PUT /api/reservations/:id', () => {
		let createdReservationId: string;

		beforeEach(async () => {
			// Create a reservation to update
			const reservation = {
				date: new Date().toISOString(),
				duration: 120,
				customer: {
					name: 'Update Test User',
					phone: '+1-555-111-2222',
				},
				partySize: 3,
				category: 'dinner',
				createdBy: 'test-user-id',
			};

			const createResponse = await app.inject({
				method: 'POST',
				url: '/api/reservations',
				payload: reservation,
			});

			const body = createResponse.json<CreateReservationResponse>();
			createdReservationId = body.reservation.id;
		});

		it('should update an existing reservation with valid data', async () => {
			const updateData = {
				partySize: 5,
				status: 'confirmed',
				customer: {
					name: 'Updated Name',
					phone: '+1-555-111-2222',
					email: 'updated@example.com',
				},
			};

			const response = await app.inject({
				method: 'PUT',
				url: `/api/reservations/${createdReservationId}`,
				payload: updateData,
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<UpdateReservationResponse>();
			expect(body.message).toBe('Reservation updated successfully');
			expect(body.reservation).toBeDefined();
			expect(body.reservation.id).toBe(createdReservationId);
			expect(body.reservation.partySize).toBe(5);
			expect(body.reservation.status).toBe('confirmed');
			expect(body.reservation.customer.name).toBe('Updated Name');
			expect(body.reservation.customer.email).toBe('updated@example.com');
		});

		it('should update reservation status to seated with seatedAt timestamp', async () => {
			const seatedAt = new Date().toISOString();
			const updateData = {
				status: 'seated',
				seatedAt,
			};

			const response = await app.inject({
				method: 'PUT',
				url: `/api/reservations/${createdReservationId}`,
				payload: updateData,
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<UpdateReservationResponse>();
			expect(body.reservation.status).toBe('seated');
			expect(body.reservation.seatedAt).toBe(seatedAt);
		});

		it('should update reservation status to cancelled with cancellation details', async () => {
			const cancelledAt = new Date().toISOString();
			const updateData = {
				status: 'cancelled',
				cancelledAt,
				cancelledBy: 'manager-user-id',
				cancellationReason: 'Customer requested cancellation',
			};

			const response = await app.inject({
				method: 'PUT',
				url: `/api/reservations/${createdReservationId}`,
				payload: updateData,
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<UpdateReservationResponse>();
			expect(body.reservation.status).toBe('cancelled');
			expect(body.reservation.cancelledAt).toBe(cancelledAt);
			expect(body.reservation.cancelledBy).toBe('manager-user-id');
			expect(body.reservation.cancellationReason).toBe(
				'Customer requested cancellation',
			);
		});

		it('should partially update only specified fields', async () => {
			const updateData = {
				notes: 'Customer requested window seat',
			};

			const response = await app.inject({
				method: 'PUT',
				url: `/api/reservations/${createdReservationId}`,
				payload: updateData,
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<UpdateReservationResponse>();
			expect(body.reservation.notes).toBe('Customer requested window seat');
			// Original fields should remain unchanged
			expect(body.reservation.customer.name).toBe('Update Test User');
			expect(body.reservation.partySize).toBe(3);
		});

		it('should return 404 for non-existent reservation', async () => {
			const nonExistentId = '00000000-0000-0000-0000-000000000000';
			const updateData = {
				partySize: 4,
			};

			const response = await app.inject({
				method: 'PUT',
				url: `/api/reservations/${nonExistentId}`,
				payload: updateData,
			});

			expect(response.statusCode).toBe(404);

			const body = response.json<ErrorResponse>();
			expect(body.error).toBe('Not Found');
			expect(body.message).toBe('Reservation not found');
		});

		it('should return 400 for invalid UUID format', async () => {
			const updateData = {
				partySize: 4,
			};

			const response = await app.inject({
				method: 'PUT',
				url: '/api/reservations/invalid-uuid',
				payload: updateData,
			});

			expect(response.statusCode).toBe(400);
		});

		it('should return 400 for invalid data', async () => {
			const updateData = {
				partySize: -5, // Invalid: must be positive
			};

			const response = await app.inject({
				method: 'PUT',
				url: `/api/reservations/${createdReservationId}`,
				payload: updateData,
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe('DELETE /api/reservations/:id', () => {
		let createdReservationId: string;

		beforeEach(async () => {
			// Create a reservation to delete
			const reservation = {
				date: new Date().toISOString(),
				duration: 90,
				customer: {
					name: 'Delete Test User',
					phone: '+1-555-333-4444',
				},
				partySize: 2,
				category: 'lunch',
				createdBy: 'test-user-id',
			};

			const createResponse = await app.inject({
				method: 'POST',
				url: '/api/reservations',
				payload: reservation,
			});

			const body = createResponse.json<CreateReservationResponse>();
			createdReservationId = body.reservation.id;
		});

		it('should delete an existing reservation', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: `/api/reservations/${createdReservationId}`,
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<DeleteReservationResponse>();
			expect(body.message).toBe('Reservation deleted successfully');
			expect(body.reservation).toBeDefined();
			expect(body.reservation.id).toBe(createdReservationId);
		});

		it('should verify reservation is actually deleted', async () => {
			// Delete the reservation
			await app.inject({
				method: 'DELETE',
				url: `/api/reservations/${createdReservationId}`,
			});

			// Try to delete again - should return 404
			const response = await app.inject({
				method: 'DELETE',
				url: `/api/reservations/${createdReservationId}`,
			});

			expect(response.statusCode).toBe(404);
		});

		it('should return 404 for non-existent reservation', async () => {
			const nonExistentId = '00000000-0000-0000-0000-000000000000';

			const response = await app.inject({
				method: 'DELETE',
				url: `/api/reservations/${nonExistentId}`,
			});

			expect(response.statusCode).toBe(404);

			const body = response.json<ErrorResponse>();
			expect(body.error).toBe('Not Found');
			expect(body.message).toBe('Reservation not found');
		});

		it('should return 400 for invalid UUID format', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: '/api/reservations/invalid-uuid',
			});

			expect(response.statusCode).toBe(400);
		});

		it('should return deleted reservation data in response', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: `/api/reservations/${createdReservationId}`,
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<DeleteReservationResponse>();
			expect(body.reservation.customer.name).toBe('Delete Test User');
			expect(body.reservation.partySize).toBe(2);
			expect(body.reservation.category).toBe('lunch');
		});
	});
});
