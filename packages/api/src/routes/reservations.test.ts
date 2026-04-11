/**
 * Tests for reservation API routes
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { setupIntegrationSuite } from './test-helpers.js';

import type {
	CreateReservationResponse,
	UpdateReservationResponse,
	DeleteReservationResponse,
	ListReservationsResponse,
	ErrorResponse,
} from '../schemas/index.js';

// Dedicated test admin — self-contained credentials so this file does not
// depend on global seedAdminIfEmpty or test execution order.
const TEST_ADMIN_EMAIL = 'reservations-admin@test.com';
const TEST_ADMIN_PASSWORD = 'reservations-test-pass123!';

describe('Reservations API', () => {
	const { inject } = setupIntegrationSuite({
		email: TEST_ADMIN_EMAIL,
		password: TEST_ADMIN_PASSWORD,
		displayName: 'Reservations Test Admin',
	});

	describe('POST /api/v1/reservations', () => {
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

			const response = await inject({
				method: 'POST',
				url: '/api/v1/reservations',
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

			const response = await inject({
				method: 'POST',
				url: '/api/v1/reservations',
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

			const response = await inject({
				method: 'POST',
				url: '/api/v1/reservations',
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

			const response = await inject({
				method: 'POST',
				url: '/api/v1/reservations',
				payload: reservation,
			});

			expect(response.statusCode).toBe(201);

			const body = response.json<CreateReservationResponse>();
			expect(body.reservation.status).toBe('pending');
		});
	});

	describe('GET /api/reservations', () => {
		it('should return list of reservations', async () => {
			const response = await inject({
				method: 'GET',
				url: '/api/v1/reservations',
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
		let createdReservationVersion: number;

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

			const createResponse = await inject({
				method: 'POST',
				url: '/api/v1/reservations',
				payload: reservation,
			});

			const body = createResponse.json<CreateReservationResponse>();
			createdReservationId = body.reservation.id;
			// Track version so tests can supply a valid versionId (optimistic locking)
			createdReservationVersion = body.reservation.version;
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
				versionId: createdReservationVersion,
			};

			const response = await inject({
				method: 'PUT',
				url: `/api/v1/reservations/${createdReservationId}`,
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
				versionId: createdReservationVersion,
			};

			const response = await inject({
				method: 'PUT',
				url: `/api/v1/reservations/${createdReservationId}`,
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
				versionId: createdReservationVersion,
			};

			const response = await inject({
				method: 'PUT',
				url: `/api/v1/reservations/${createdReservationId}`,
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
				versionId: createdReservationVersion,
			};

			const response = await inject({
				method: 'PUT',
				url: `/api/v1/reservations/${createdReservationId}`,
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
				versionId: 1,
			};

			const response = await inject({
				method: 'PUT',
				url: `/api/v1/reservations/${nonExistentId}`,
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
				versionId: 1,
			};

			const response = await inject({
				method: 'PUT',
				url: '/api/v1/reservations/invalid-uuid',
				payload: updateData,
			});

			expect(response.statusCode).toBe(400);
		});

		it('should return 400 for invalid data', async () => {
			const updateData = {
				partySize: -5, // Invalid: must be positive
				versionId: createdReservationVersion,
			};

			const response = await inject({
				method: 'PUT',
				url: `/api/v1/reservations/${createdReservationId}`,
				payload: updateData,
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe('DELETE /api/reservations/:id', () => {
		let createdReservationId: string;

		beforeEach(async () => {
			// Create a reservation to delete — use a future date so it is classified
			// as 'inAdvance' and the 'lunch' category is preserved (not overridden to walk_in)
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 7);
			const reservation = {
				date: futureDate.toISOString(),
				duration: 90,
				customer: {
					name: 'Delete Test User',
					phone: '+1-555-333-4444',
				},
				partySize: 2,
				category: 'lunch',
				createdBy: 'test-user-id',
			};

			const createResponse = await inject({
				method: 'POST',
				url: '/api/v1/reservations',
				payload: reservation,
			});

			const body = createResponse.json<CreateReservationResponse>();
			createdReservationId = body.reservation.id;
		});

		it('should soft-delete an existing reservation and return isDeleted=true', async () => {
			const response = await inject({
				method: 'DELETE',
				url: `/api/v1/reservations/${createdReservationId}`,
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<DeleteReservationResponse>();
			expect(body.message).toBe('Reservation deleted successfully');
			expect(body.reservation).toBeDefined();
			expect(body.reservation.id).toBe(createdReservationId);
			// Soft-delete: isDeleted flag is set, row still exists
			expect(body.reservation.isDeleted).toBe(true);
			expect(body.reservation.deletedAt).toBeDefined();
		});

		it('should return 404 when soft-deleting an already-deleted reservation', async () => {
			// First soft-delete
			await inject({
				method: 'DELETE',
				url: `/api/v1/reservations/${createdReservationId}`,
			});

			// Second soft-delete should 404 (WHERE isDeleted=false finds nothing)
			const response = await inject({
				method: 'DELETE',
				url: `/api/v1/reservations/${createdReservationId}`,
			});

			expect(response.statusCode).toBe(404);
		});

		it('should return 404 for non-existent reservation', async () => {
			const nonExistentId = '00000000-0000-0000-0000-000000000000';

			const response = await inject({
				method: 'DELETE',
				url: `/api/v1/reservations/${nonExistentId}`,
			});

			expect(response.statusCode).toBe(404);

			const body = response.json<ErrorResponse>();
			expect(body.error).toBe('Not Found');
		});

		it('should return 400 for invalid UUID format', async () => {
			const response = await inject({
				method: 'DELETE',
				url: '/api/v1/reservations/invalid-uuid',
			});

			expect(response.statusCode).toBe(400);
		});

		it('should return soft-deleted reservation data in response', async () => {
			const response = await inject({
				method: 'DELETE',
				url: `/api/v1/reservations/${createdReservationId}`,
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<DeleteReservationResponse>();
			expect(body.reservation.customer.name).toBe('Delete Test User');
			expect(body.reservation.partySize).toBe(2);
			expect(body.reservation.category).toBe('lunch');
		});

		it('GET /api/v1/reservations excludes soft-deleted reservations by default', async () => {
			// Soft-delete the reservation
			await inject({
				method: 'DELETE',
				url: `/api/v1/reservations/${createdReservationId}`,
			});

			// Default list should not include it
			const response = await inject({
				method: 'GET',
				url: '/api/v1/reservations',
			});

			expect(response.statusCode).toBe(200);
			const body = response.json<ListReservationsResponse>();
			const ids = body.reservations.map((r: { id: string }) => r.id);
			expect(ids).not.toContain(createdReservationId);
		});

		it('GET /api/v1/reservations?includeDeleted=true includes soft-deleted reservations', async () => {
			// Soft-delete the reservation
			await inject({
				method: 'DELETE',
				url: `/api/v1/reservations/${createdReservationId}`,
			});

			// With includeDeleted=true it should appear
			const response = await inject({
				method: 'GET',
				url: '/api/v1/reservations?includeDeleted=true',
			});

			expect(response.statusCode).toBe(200);
			const body = response.json<ListReservationsResponse>();
			const ids = body.reservations.map((r: { id: string }) => r.id);
			expect(ids).toContain(createdReservationId);
		});
	});

	describe('POST /api/reservations/:id/recover', () => {
		let softDeletedId: string;

		beforeEach(async () => {
			// Create then soft-delete a reservation to recover
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 7);
			const createRes = await inject({
				method: 'POST',
				url: '/api/v1/reservations',
				payload: {
					date: futureDate.toISOString(),
					duration: 90,
					customer: { name: 'Recover Test User', phone: '+1-555-777-8888' },
					partySize: 2,
					category: 'lunch',
					createdBy: 'test-user-id',
				},
			});
			const createBody = createRes.json<CreateReservationResponse>();
			softDeletedId = createBody.reservation.id;

			await inject({
				method: 'DELETE',
				url: `/api/v1/reservations/${softDeletedId}`,
			});
		});

		it('should recover a soft-deleted reservation and return isDeleted=false with status=pending', async () => {
			const response = await inject({
				method: 'POST',
				url: `/api/v1/reservations/${softDeletedId}/recover`,
			});

			expect(response.statusCode).toBe(200);

			const body = response.json<{ reservation: { isDeleted: boolean; status: string; id: string }; message: string }>();
			expect(body.message).toBe('Reservation recovered successfully');
			expect(body.reservation.id).toBe(softDeletedId);
			expect(body.reservation.isDeleted).toBe(false);
			expect(body.reservation.status).toBe('pending');
		});

		it('should return 404 when recovering a non-deleted reservation', async () => {
			// Recover it first
			await inject({
				method: 'POST',
				url: `/api/v1/reservations/${softDeletedId}/recover`,
			});

			// Second recover attempt should 404 (WHERE isDeleted=true finds nothing)
			const response = await inject({
				method: 'POST',
				url: `/api/v1/reservations/${softDeletedId}/recover`,
			});

			expect(response.statusCode).toBe(404);
		});

		it('should return 404 when recovering a non-existent reservation', async () => {
			const nonExistentId = '00000000-0000-0000-0000-000000000000';

			const response = await inject({
				method: 'POST',
				url: `/api/v1/reservations/${nonExistentId}/recover`,
			});

			expect(response.statusCode).toBe(404);
		});
	});
});
