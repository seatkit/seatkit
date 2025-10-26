/**
 * Tests for formatting utilities
 * @module format.test
 */

import { describe, it, expect } from 'vitest';

import { formatMoney } from './format.js';

describe('formatMoney', () => {
	it('should format cents to USD with default locale', () => {
		expect(formatMoney(1050, 'USD')).toBe('$10.50');
		expect(formatMoney(0, 'USD')).toBe('$0.00');
		expect(formatMoney(999999, 'USD')).toBe('$9,999.99');
	});

	it('should handle different currencies with en-US locale', () => {
		expect(formatMoney(1050, 'EUR')).toBe('€10.50');
		expect(formatMoney(1050, 'GBP')).toBe('£10.50');
		expect(formatMoney(1050, 'JPY')).toBe('¥11'); // Zero-decimal currency
	});

	it('should respect locale parameter', () => {
		// German locale uses comma for decimal and period for thousands
		const deAmount = formatMoney(1050, 'EUR', 'de-DE');
		expect(deAmount).toContain('10,50');
		expect(deAmount).toContain('€');

		const deLarge = formatMoney(100050, 'EUR', 'de-DE');
		expect(deLarge).toContain('1.000,50');
		expect(deLarge).toContain('€');

		// US locale
		expect(formatMoney(1050, 'EUR', 'en-US')).toBe('€10.50');
	});

	it('should automatically handle zero-decimal currencies', () => {
		// JPY and KRW don't use decimal places
		const jpyAmount = formatMoney(1050, 'JPY', 'ja-JP');
		expect(jpyAmount).toContain('11');
		expect(jpyAmount).toMatch(/[¥￥]/); // JP yen symbol can vary

		const jpySmall = formatMoney(100, 'JPY', 'ja-JP');
		expect(jpySmall).toContain('1');

		const krwAmount = formatMoney(1050, 'KRW', 'ko-KR');
		expect(krwAmount).toContain('11');
		expect(krwAmount).toContain('₩');
	});

	it('should handle large amounts with thousands separators', () => {
		expect(formatMoney(100000000, 'USD')).toBe('$1,000,000.00');

		const deAmount = formatMoney(100000000, 'EUR', 'de-DE');
		expect(deAmount).toContain('1.000.000,00');
		expect(deAmount).toContain('€');
	});
});
