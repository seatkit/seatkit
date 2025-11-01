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
	it('should format confirmed status', () => {
		expect(formatStatus('confirmed')).toBe('Confirmed');
	});

	it('should format pending status', () => {
		expect(formatStatus('pending')).toBe('Pending');
	});

	it('should format seated status', () => {
		expect(formatStatus('seated')).toBe('Seated');
	});

	it('should format completed status', () => {
		expect(formatStatus('completed')).toBe('Completed');
	});

	it('should format cancelled status', () => {
		expect(formatStatus('cancelled')).toBe('Cancelled');
	});

	it('should format no-show status', () => {
		expect(formatStatus('no-show')).toBe('No Show');
	});
});

describe('getStatusColor', () => {
	it('should return color class for confirmed status', () => {
		expect(getStatusColor('confirmed')).toContain('bg-status-confirmed');
	});

	it('should return color class for pending status', () => {
		expect(getStatusColor('pending')).toContain('bg-status-pending');
	});

	it('should return color class for seated status', () => {
		expect(getStatusColor('seated')).toContain('bg-status-seated');
	});

	it('should return color class for completed status', () => {
		expect(getStatusColor('completed')).toContain('bg-status-completed');
	});

	it('should return color class for cancelled status', () => {
		expect(getStatusColor('cancelled')).toContain('bg-status-cancelled');
	});

	it('should return color class for no-show status', () => {
		expect(getStatusColor('no-show')).toContain('bg-status-no-show');
	});

	it('should include text color for all statuses', () => {
		const statuses = ['confirmed', 'pending', 'seated', 'completed', 'cancelled', 'no-show'] as const;
		statuses.forEach((status) => {
			expect(getStatusColor(status)).toContain('text-white');
		});
	});
});
