/**
 * Tests for formatting utilities
 * @module format.test
 */

import { describe, it, expect } from 'vitest';

import {
	formatMoney,
	parseMoney,
	formatPhone,
	normalizePhone,
} from './format.js';

describe('formatMoney', () => {
	it('should format cents to currency display', () => {
		expect(formatMoney(1050, 'USD')).toBe('$10.50');
		expect(formatMoney(0, 'USD')).toBe('$0.00');
		expect(formatMoney(999999, 'USD')).toBe('$9,999.99');
	});

	it('should handle different currencies', () => {
		expect(formatMoney(1050, 'EUR')).toBe('€10.50');
		expect(formatMoney(1050, 'GBP')).toBe('£10.50');
		expect(formatMoney(1050, 'JPY')).toBe('¥11'); // JPY has no decimal
	});

	it('should handle zero-decimal currencies', () => {
		expect(formatMoney(1050, 'JPY')).toBe('¥11');
		expect(formatMoney(100, 'JPY')).toBe('¥1');
	});
});

describe('parseMoney', () => {
	it('should parse currency display to cents', () => {
		expect(parseMoney('$10.50')).toBe(1050);
		expect(parseMoney('$0.00')).toBe(0);
		expect(parseMoney('$9,999.99')).toBe(999999);
	});

	it('should handle various formats', () => {
		expect(parseMoney('10.50')).toBe(1050);
		expect(parseMoney('10')).toBe(1000);
		expect(parseMoney('$10')).toBe(1000);
	});

	it('should throw on invalid input', () => {
		expect(() => parseMoney('not-a-number')).toThrow();
		expect(() => parseMoney('')).toThrow();
	});
});

describe('formatPhone', () => {
	it('should format US phone numbers', () => {
		expect(formatPhone('5551234567')).toBe('(555) 123-4567');
		expect(formatPhone('+15551234567')).toBe('+1 (555) 123-4567');
	});

	it('should preserve already formatted numbers', () => {
		expect(formatPhone('(555) 123-4567')).toBe('(555) 123-4567');
	});

	it('should handle international formats', () => {
		expect(formatPhone('+441234567890')).toBe('+44 1234 567890');
	});
});

describe('normalizePhone', () => {
	it('should strip all formatting', () => {
		expect(normalizePhone('(555) 123-4567')).toBe('5551234567');
		expect(normalizePhone('+1-555-123-4567')).toBe('+15551234567');
		expect(normalizePhone('555.123.4567')).toBe('5551234567');
	});

	it('should preserve + for international', () => {
		expect(normalizePhone('+1 (555) 123-4567')).toBe('+15551234567');
	});
});
