import { describe, it, expect } from 'vitest';

import { classifyReservationType } from './classification.js';

describe('classifyReservationType', () => {
	it('returns "walk_in" when same day and creationTime >= reservationStartTime', () => {
		const reservationDate = new Date('2025-01-15T00:00:00Z');
		const reservationStartTime = new Date('2025-01-15T19:00:00Z');
		// Creation at exactly start time
		const creationTime = new Date('2025-01-15T19:00:00Z');
		expect(classifyReservationType(creationTime, reservationDate, reservationStartTime)).toBe('walk_in');
	});

	it('returns "walk_in" when same day and creationTime is after reservationStartTime', () => {
		const reservationDate = new Date('2025-01-15T00:00:00Z');
		const reservationStartTime = new Date('2025-01-15T19:00:00Z');
		const creationTime = new Date('2025-01-15T20:00:00Z');
		expect(classifyReservationType(creationTime, reservationDate, reservationStartTime)).toBe('walk_in');
	});

	it('returns "inAdvance" when creationTime is on a different day from reservationDate', () => {
		const reservationDate = new Date('2025-01-16T00:00:00Z');
		const reservationStartTime = new Date('2025-01-16T19:00:00Z');
		const creationTime = new Date('2025-01-15T10:00:00Z');
		expect(classifyReservationType(creationTime, reservationDate, reservationStartTime)).toBe('inAdvance');
	});

	it('returns "inAdvance" when same day but creationTime < reservationStartTime', () => {
		const reservationDate = new Date('2025-01-15T00:00:00Z');
		const reservationStartTime = new Date('2025-01-15T19:00:00Z');
		const creationTime = new Date('2025-01-15T12:00:00Z');
		expect(classifyReservationType(creationTime, reservationDate, reservationStartTime)).toBe('inAdvance');
	});

	it('returns "waitingList" when existingType is "waitingList" regardless of timing', () => {
		const reservationDate = new Date('2025-01-15T00:00:00Z');
		const reservationStartTime = new Date('2025-01-15T19:00:00Z');
		// Even if it would be a walk_in by timing, waitingList is preserved
		const creationTime = new Date('2025-01-15T20:00:00Z');
		expect(
			classifyReservationType(creationTime, reservationDate, reservationStartTime, 'waitingList'),
		).toBe('waitingList');
	});

	it('returns "inAdvance" when existingType is "inAdvance" even on same day at/after start (preserves explicit override)', () => {
		const reservationDate = new Date('2025-01-15T00:00:00Z');
		const reservationStartTime = new Date('2025-01-15T19:00:00Z');
		const creationTime = new Date('2025-01-15T20:00:00Z');
		expect(
			classifyReservationType(creationTime, reservationDate, reservationStartTime, 'inAdvance'),
		).toBe('inAdvance');
	});
});
