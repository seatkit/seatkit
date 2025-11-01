import { describe, expect, it } from 'vitest';

import { cn, formatStatus, getStatusColor } from './utils.js';

describe('cn', () => {
	it('should merge class names', () => {
		expect(cn('foo', 'bar')).toBe('foo bar');
	});

	it('should handle conditional classes', () => {
		const condition = false;
		expect(cn('foo', condition && 'bar', 'baz')).toBe('foo baz');
	});

	it('should merge Tailwind classes correctly', () => {
		expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
	});

	it('should handle arrays of classes', () => {
		expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
	});

	it('should handle empty inputs', () => {
		expect(cn()).toBe('');
	});

	it('should handle undefined and null', () => {
		expect(cn('foo', undefined, 'bar', null, 'baz')).toBe('foo bar baz');
	});
});

describe('formatStatus', () => {
	it.each([
		['confirmed', 'Confirmed'],
		['pending', 'Pending'],
		['seated', 'Seated'],
		['completed', 'Completed'],
		['cancelled', 'Cancelled'],
		['no-show', 'No Show'],
	])('should format %s status', (status, expected) => {
		expect(formatStatus(status as Parameters<typeof formatStatus>[0])).toBe(
			expected,
		);
	});
});

describe('getStatusColor', () => {
	it.each([
		['confirmed', 'bg-status-confirmed'],
		['pending', 'bg-status-pending'],
		['seated', 'bg-status-seated'],
		['completed', 'bg-status-completed'],
		['cancelled', 'bg-status-cancelled'],
		['no-show', 'bg-status-no-show'],
	])('should return color class for %s status', (status, expectedClass) => {
		expect(
			getStatusColor(status as Parameters<typeof getStatusColor>[0]),
		).toContain(expectedClass);
	});

	it('should include text color for all statuses', () => {
		const statuses = [
			'confirmed',
			'pending',
			'seated',
			'completed',
			'cancelled',
			'no-show',
		] as const;
		statuses.forEach(status => {
			expect(getStatusColor(status)).toContain('text-white');
		});
	});
});
