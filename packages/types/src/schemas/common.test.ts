/**
 * Tests for common schema utilities
 * @module schemas/common.test
 */

import { describe, it, expect } from 'vitest';

import {
	DateTimeSchema,
	DateSchema,
	TimeSchema,
	UUIDSchema,
	EmailSchema,
	PhoneSchema,
	PositiveIntSchema,
	NonNegativeIntSchema,
	MoneySchema,
	CurrencyCodeSchema,
	BaseEntitySchema,
} from './common.js';

describe('DateTimeSchema', () => {
	it('should validate ISO 8601 datetime strings', () => {
		const result = DateTimeSchema.parse('2025-01-15T14:30:00Z');
		expect(result).toBeInstanceOf(Date);
		expect(result.toISOString()).toBe('2025-01-15T14:30:00.000Z');
		expect(() => DateTimeSchema.parse('invalid')).toThrow();
	});
});

describe('DateSchema', () => {
	it('should validate ISO date strings', () => {
		expect(DateSchema.parse('2025-01-15')).toBe('2025-01-15');
		expect(() => DateSchema.parse('2025-1-15')).toThrow();
	});
});

describe('TimeSchema', () => {
	it('should validate time strings', () => {
		expect(TimeSchema.parse('14:30')).toBe('14:30');
		expect(TimeSchema.parse('14:30:00')).toBe('14:30:00');
		expect(() => TimeSchema.parse('14:3')).toThrow();
	});
});

describe('UUIDSchema', () => {
	it('should validate UUID strings', () => {
		expect(UUIDSchema.parse('550e8400-e29b-41d4-a716-446655440000')).toBe(
			'550e8400-e29b-41d4-a716-446655440000',
		);
		expect(() => UUIDSchema.parse('not-a-uuid')).toThrow();
	});
});

describe('EmailSchema', () => {
	it('should validate email addresses', () => {
		expect(EmailSchema.parse('test@example.com')).toBe('test@example.com');
		expect(() => EmailSchema.parse('not-an-email')).toThrow();
	});
});

describe('PhoneSchema', () => {
	it('should validate phone numbers with length constraints', () => {
		expect(PhoneSchema.parse('+1-555-123-4567')).toBe('+1-555-123-4567');
		expect(() => PhoneSchema.parse('123')).toThrow();
	});
});

describe('PositiveIntSchema', () => {
	it('should only accept positive integers', () => {
		expect(PositiveIntSchema.parse(1)).toBe(1);
		expect(() => PositiveIntSchema.parse(0)).toThrow();
		expect(() => PositiveIntSchema.parse(-1)).toThrow();
		expect(() => PositiveIntSchema.parse(1.5)).toThrow();
	});
});

describe('NonNegativeIntSchema', () => {
	it('should accept zero and positive integers', () => {
		expect(NonNegativeIntSchema.parse(0)).toBe(0);
		expect(NonNegativeIntSchema.parse(42)).toBe(42);
		expect(() => NonNegativeIntSchema.parse(-1)).toThrow();
	});
});

describe('MoneySchema', () => {
	it('should validate monetary amounts in cents', () => {
		expect(MoneySchema.parse(1050)).toBe(1050);
		expect(() => MoneySchema.parse(-1)).toThrow();
		expect(() => MoneySchema.parse(10.5)).toThrow();
	});
});

describe('CurrencyCodeSchema', () => {
	it('should validate and uppercase 3-letter currency codes', () => {
		expect(CurrencyCodeSchema.parse('USD')).toBe('USD');
		expect(CurrencyCodeSchema.parse('usd')).toBe('USD');
		expect(() => CurrencyCodeSchema.parse('US')).toThrow();
	});
});

describe('BaseEntitySchema', () => {
	it('should validate base entity structure', () => {
		const input = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			createdAt: '2025-01-15T14:30:00Z',
			updatedAt: '2025-01-15T14:30:00Z',
		};
		const result = BaseEntitySchema.parse(input);
		expect(result.id).toBe(input.id);
		expect(result.createdAt).toBeInstanceOf(Date);
		expect(result.updatedAt).toBeInstanceOf(Date);
		expect(() => BaseEntitySchema.parse({ id: 'invalid' })).toThrow();
	});
});
