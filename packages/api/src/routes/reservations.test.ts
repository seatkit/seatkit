/**
 * Tests for reservation API routes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from '../index.js';
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

			const body = JSON.parse(response.body);
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

			const body = JSON.parse(response.body);
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

			const body = JSON.parse(response.body);
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

			const body = JSON.parse(response.body);
			expect(body.reservations).toBeDefined();
			expect(body.count).toBeDefined();
			expect(Array.isArray(body.reservations)).toBe(true);
		});
	});
});
