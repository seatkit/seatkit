import { describe, it, expect } from 'vitest';

import { overlaps, isTableOccupied, type ReservationLike } from './availability.js';

describe('overlaps', () => {
	it('returns true when intervals genuinely overlap', () => {
		const start1 = new Date('2025-01-15T19:00:00Z');
		const end1 = new Date('2025-01-15T21:00:00Z');
		const start2 = new Date('2025-01-15T20:00:00Z');
		const end2 = new Date('2025-01-15T22:00:00Z');
		expect(overlaps(start1, end1, start2, end2)).toBe(true);
	});

	it('returns false for back-to-back reservations (end1 === start2 is NOT an overlap)', () => {
		const start1 = new Date('2025-01-15T19:00:00Z');
		const end1 = new Date('2025-01-15T21:00:00Z');
		const start2 = new Date('2025-01-15T21:00:00Z');
		const end2 = new Date('2025-01-15T23:00:00Z');
		expect(overlaps(start1, end1, start2, end2)).toBe(false);
	});

	it('returns false when first interval is entirely before second', () => {
		const start1 = new Date('2025-01-15T18:00:00Z');
		const end1 = new Date('2025-01-15T19:00:00Z');
		const start2 = new Date('2025-01-15T20:00:00Z');
		const end2 = new Date('2025-01-15T22:00:00Z');
		expect(overlaps(start1, end1, start2, end2)).toBe(false);
	});

	it('returns false when second interval is entirely before first', () => {
		const start1 = new Date('2025-01-15T20:00:00Z');
		const end1 = new Date('2025-01-15T22:00:00Z');
		const start2 = new Date('2025-01-15T18:00:00Z');
		const end2 = new Date('2025-01-15T19:00:00Z');
		expect(overlaps(start1, end1, start2, end2)).toBe(false);
	});

	it('returns true when intervals are identical', () => {
		const start = new Date('2025-01-15T19:00:00Z');
		const end = new Date('2025-01-15T21:00:00Z');
		expect(overlaps(start, end, start, end)).toBe(true);
	});
});

describe('isTableOccupied', () => {
	const tableId = 'table-1';

	const makeReservation = (
		overrides: Partial<ReservationLike> = {},
	): ReservationLike => ({
		id: 'res-1',
		date: new Date('2025-01-15T19:00:00Z'),
		duration: 120,
		tableIds: [tableId],
		status: 'confirmed',
		...overrides,
	});

	it('returns true when an active reservation overlaps on that table', () => {
		const reservation = makeReservation();
		// Query: 19:30–21:30 overlaps with 19:00–21:00
		const start = new Date('2025-01-15T19:30:00Z');
		const end = new Date('2025-01-15T21:30:00Z');
		expect(isTableOccupied(tableId, start, end, [reservation])).toBe(true);
	});

	it('returns false when overlapping reservation has status "cancelled"', () => {
		const reservation = makeReservation({ status: 'cancelled' });
		const start = new Date('2025-01-15T19:30:00Z');
		const end = new Date('2025-01-15T21:30:00Z');
		expect(isTableOccupied(tableId, start, end, [reservation])).toBe(false);
	});

	it('returns false when overlapping reservation has status "no_show"', () => {
		const reservation = makeReservation({ status: 'no_show' });
		const start = new Date('2025-01-15T19:30:00Z');
		const end = new Date('2025-01-15T21:30:00Z');
		expect(isTableOccupied(tableId, start, end, [reservation])).toBe(false);
	});

	it('returns false when overlapping reservation has status "completed" (party has left — high-turnover)', () => {
		const reservation = makeReservation({ status: 'completed' });
		const start = new Date('2025-01-15T19:30:00Z');
		const end = new Date('2025-01-15T21:30:00Z');
		expect(isTableOccupied(tableId, start, end, [reservation])).toBe(false);
	});

	it('returns true when reservation is "walk_in" category (walk_in is category not status — status determines occupancy)', () => {
		// walk_in is a *category*, not a status; active walk_in reservations DO occupy tables
		const reservation = makeReservation({ status: 'seated' });
		const start = new Date('2025-01-15T19:30:00Z');
		const end = new Date('2025-01-15T21:30:00Z');
		expect(isTableOccupied(tableId, start, end, [reservation])).toBe(true);
	});

	it('returns false when reservation tableIds is null', () => {
		const reservation = makeReservation({ tableIds: null });
		const start = new Date('2025-01-15T19:30:00Z');
		const end = new Date('2025-01-15T21:30:00Z');
		expect(isTableOccupied(tableId, start, end, [reservation])).toBe(false);
	});

	it('returns false when tableId is not in the reservation tableIds', () => {
		const reservation = makeReservation({ tableIds: ['table-2', 'table-3'] });
		const start = new Date('2025-01-15T19:30:00Z');
		const end = new Date('2025-01-15T21:30:00Z');
		expect(isTableOccupied(tableId, start, end, [reservation])).toBe(false);
	});

	it('returns false when no reservations provided', () => {
		const start = new Date('2025-01-15T19:30:00Z');
		const end = new Date('2025-01-15T21:30:00Z');
		expect(isTableOccupied(tableId, start, end, [])).toBe(false);
	});
});
