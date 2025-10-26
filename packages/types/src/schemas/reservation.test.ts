/**
 * Tests for reservation schema
 * @module schemas/reservation.test
 */

import { describe, it, expect } from 'vitest';
import {
	ReservationStatusSchema,
	ReservationCategorySchema,
	CustomerInfoSchema,
	ReservationSchema,
	CreateReservationSchema,
	UpdateReservationSchema,
	ReservationFiltersSchema,
} from './reservation.js';

describe('ReservationStatusSchema', () => {
	it('should validate status values', () => {
		expect(ReservationStatusSchema.parse('pending')).toBe('pending');
		expect(ReservationStatusSchema.parse('confirmed')).toBe('confirmed');
		expect(() => ReservationStatusSchema.parse('invalid')).toThrow();
	});
});

describe('ReservationCategorySchema', () => {
	it('should validate category values', () => {
		expect(ReservationCategorySchema.parse('lunch')).toBe('lunch');
		expect(ReservationCategorySchema.parse('dinner')).toBe('dinner');
		expect(() => ReservationCategorySchema.parse('invalid')).toThrow();
	});
});

describe('CustomerInfoSchema', () => {
	it('should validate customer information', () => {
		const customer = {
			name: 'John Doe',
			phone: '+1-555-123-4567',
			email: 'john@example.com',
		};
		expect(CustomerInfoSchema.parse(customer)).toEqual(customer);
	});

	it('should allow optional email', () => {
		const customer = {
			name: 'John Doe',
			phone: '+1-555-123-4567',
		};
		expect(CustomerInfoSchema.parse(customer)).toEqual(customer);
	});

	it('should reject missing required fields', () => {
		expect(() => CustomerInfoSchema.parse({ name: 'John' })).toThrow();
	});
});

describe('ReservationSchema', () => {
	const validReservation = {
		id: '550e8400-e29b-41d4-a716-446655440000',
		createdAt: '2025-01-15T14:30:00Z',
		updatedAt: '2025-01-15T14:30:00Z',
		date: '2025-01-20T19:00:00Z',
		duration: 90,
		customer: {
			name: 'John Doe',
			phone: '+1-555-123-4567',
			email: 'john@example.com',
		},
		partySize: 4,
		category: 'dinner' as const,
		status: 'confirmed' as const,
		createdBy: 'user-123',
	};

	it('should validate complete reservation', () => {
		expect(ReservationSchema.parse(validReservation)).toEqual(validReservation);
	});

	it('should allow optional fields', () => {
		const withOptional = {
			...validReservation,
			tableIds: ['table-1', 'table-2'],
			notes: 'Window seat preferred',
			tags: ['vip', 'birthday'],
			source: 'phone' as const,
		};
		expect(ReservationSchema.parse(withOptional)).toEqual(withOptional);
	});

	it('should reject invalid party size', () => {
		expect(() =>
			ReservationSchema.parse({ ...validReservation, partySize: 0 }),
		).toThrow();
	});

	it('should reject invalid duration', () => {
		expect(() =>
			ReservationSchema.parse({ ...validReservation, duration: -30 }),
		).toThrow();
	});
});

describe('CreateReservationSchema', () => {
	it('should omit auto-generated fields', () => {
		const input = {
			date: '2025-01-20T19:00:00Z',
			duration: 90,
			customer: {
				name: 'John Doe',
				phone: '+1-555-123-4567',
			},
			partySize: 4,
			category: 'dinner' as const,
			createdBy: 'user-123',
		};
		expect(CreateReservationSchema.parse(input)).toEqual(input);
	});

	it('should allow optional status', () => {
		const input = {
			date: '2025-01-20T19:00:00Z',
			duration: 90,
			customer: {
				name: 'John Doe',
				phone: '+1-555-123-4567',
			},
			partySize: 4,
			category: 'dinner' as const,
			createdBy: 'user-123',
			status: 'confirmed' as const,
		};
		expect(CreateReservationSchema.parse(input)).toEqual(input);
	});
});

describe('UpdateReservationSchema', () => {
	it('should require id and updatedAt', () => {
		const update = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			updatedAt: '2025-01-15T15:00:00Z',
			status: 'seated' as const,
		};
		expect(UpdateReservationSchema.parse(update)).toEqual(update);
	});

	it('should reject missing id', () => {
		expect(() =>
			UpdateReservationSchema.parse({
				updatedAt: '2025-01-15T15:00:00Z',
				status: 'seated',
			}),
		).toThrow();
	});
});

describe('ReservationFiltersSchema', () => {
	it('should validate query filters', () => {
		const filters = {
			dateFrom: '2025-01-15T00:00:00Z',
			dateTo: '2025-01-31T23:59:59Z',
			status: ['pending', 'confirmed'] as const,
			category: ['dinner'] as const,
		};
		expect(ReservationFiltersSchema.parse(filters)).toEqual(filters);
	});

	it('should allow all optional fields', () => {
		expect(ReservationFiltersSchema.parse({})).toEqual({});
	});
});
