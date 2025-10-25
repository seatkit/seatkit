/**
 * Tests for date/time utilities
 * @module date.test
 */

import { describe, it, expect } from 'vitest';

import { addMinutes, isBetween, isSameDay } from './date.js';

describe('addMinutes', () => {
	it('should add minutes to a date immutably', () => {
		const date = new Date('2025-01-15T14:30:00Z');
		const result = addMinutes(date, 30);
		expect(result.toISOString()).toBe('2025-01-15T15:00:00.000Z');
		expect(date.toISOString()).toBe('2025-01-15T14:30:00.000Z'); // Original unchanged
	});

	it('should handle negative minutes', () => {
		const date = new Date('2025-01-15T14:30:00Z');
		const result = addMinutes(date, -30);
		expect(result.toISOString()).toBe('2025-01-15T14:00:00.000Z');
	});

	it('should handle day boundaries', () => {
		const date = new Date('2025-01-15T23:45:00Z');
		const result = addMinutes(date, 30);
		expect(result.toISOString()).toBe('2025-01-16T00:15:00.000Z');
	});
});

describe('isSameDay', () => {
	it('should return true for same day', () => {
		const date1 = new Date('2025-01-15T10:00:00Z');
		const date2 = new Date('2025-01-15T18:00:00Z');
		expect(isSameDay(date1, date2)).toBe(true);
	});

	it('should return false for different days', () => {
		const date1 = new Date('2025-01-15T23:00:00Z');
		const date2 = new Date('2025-01-16T01:00:00Z');
		expect(isSameDay(date1, date2)).toBe(false);
	});
});

describe('isBetween', () => {
	it('should return true when date is between start and end', () => {
		const date = new Date('2025-01-15T14:00:00Z');
		const start = new Date('2025-01-15T12:00:00Z');
		const end = new Date('2025-01-15T16:00:00Z');
		expect(isBetween(date, start, end)).toBe(true);
	});

	it('should return false when date is before start', () => {
		const date = new Date('2025-01-15T10:00:00Z');
		const start = new Date('2025-01-15T12:00:00Z');
		const end = new Date('2025-01-15T16:00:00Z');
		expect(isBetween(date, start, end)).toBe(false);
	});

	it('should return false when date is after end', () => {
		const date = new Date('2025-01-15T18:00:00Z');
		const start = new Date('2025-01-15T12:00:00Z');
		const end = new Date('2025-01-15T16:00:00Z');
		expect(isBetween(date, start, end)).toBe(false);
	});

	it('should include boundaries', () => {
		const start = new Date('2025-01-15T12:00:00Z');
		const end = new Date('2025-01-15T16:00:00Z');
		expect(isBetween(start, start, end)).toBe(true);
		expect(isBetween(end, start, end)).toBe(true);
	});
});
