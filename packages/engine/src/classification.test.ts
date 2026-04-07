import { describe, it, expect } from 'vitest';

import { classifyReservationType } from './classification.js';

describe('classifyReservationType', () => {
	// Shared fixtures: a reservation on 2025-01-15 starting at 19:00 UTC
	const reservationDate = new Date('2025-01-15T00:00:00Z');
	const reservationStartTime = new Date('2025-01-15T19:00:00Z');

	it('returns "walk_in" when same day and creationTime >= reservationStartTime', () => {
		const creationTime = new Date('2025-01-15T19:00:00Z'); // exactly at start
		expect(classifyReservationType(creationTime, reservationDate, reservationStartTime)).toBe('walk_in');
	});

	it('returns "walk_in" when same day and creationTime is after reservationStartTime', () => {
		const creationTime = new Date('2025-01-15T20:00:00Z');
		expect(classifyReservationType(creationTime, reservationDate, reservationStartTime)).toBe('walk_in');
	});

	it('returns "inAdvance" when creationTime is on a different day from reservationDate', () => {
		const futureDateReservation = new Date('2025-01-16T00:00:00Z');
		const futureDateStart = new Date('2025-01-16T19:00:00Z');
		const creationTime = new Date('2025-01-15T10:00:00Z');
		expect(classifyReservationType(creationTime, futureDateReservation, futureDateStart)).toBe('inAdvance');
	});

	it('returns "inAdvance" when same day but creationTime < reservationStartTime', () => {
		const creationTime = new Date('2025-01-15T12:00:00Z');
		expect(classifyReservationType(creationTime, reservationDate, reservationStartTime)).toBe('inAdvance');
	});

	it('returns "waitingList" when existingType is "waitingList" regardless of timing', () => {
		const creationTime = new Date('2025-01-15T20:00:00Z'); // would be walk_in by timing
		expect(
			classifyReservationType(creationTime, reservationDate, reservationStartTime, 'waitingList'),
		).toBe('waitingList');
	});

	it('returns "inAdvance" when existingType is "inAdvance" even on same day at/after start (preserves explicit override)', () => {
		const creationTime = new Date('2025-01-15T20:00:00Z');
		expect(
			classifyReservationType(creationTime, reservationDate, reservationStartTime, 'inAdvance'),
		).toBe('inAdvance');
	});
});
