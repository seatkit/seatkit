/**
 * Tests for validation utilities
 * @module utils/validation.test
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
	validate,
	validateAsync,
	validatePartial,
	isValidationError,
	zodErrorToValidationError,
} from './validation.js';
import { isOk, isErr } from './result.js';

const TestSchema = z.object({
	name: z.string().min(1),
	age: z.number().int().positive(),
	email: z.string().email().optional(),
});

describe('validate', () => {
	it('should return Ok for valid data', () => {
		const result = validate(TestSchema, {
			name: 'John',
			age: 30,
		});
		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.value.name).toBe('John');
			expect(result.value.age).toBe(30);
		}
	});

	it('should return Err with field details for invalid data', () => {
		const result = validate(TestSchema, {
			name: '',
			age: -1,
		});
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect(result.error.fields['name']).toBeDefined();
			expect(result.error.fields['age']).toBeDefined();
		}
	});

	it('should include field paths in error details', () => {
		const NestedSchema = z.object({
			user: z.object({
				name: z.string().min(1),
			}),
		});
		const result = validate(NestedSchema, { user: { name: '' } });
		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error.fields['user.name']).toBeDefined();
		}
	});
});

describe('validateAsync', () => {
	it('should handle async validation', async () => {
		const AsyncSchema = z.object({
			name: z.string(),
		});
		const result = await validateAsync(AsyncSchema, { name: 'John' });
		expect(isOk(result)).toBe(true);
	});

	it('should return Err for async validation failure', async () => {
		const result = await validateAsync(TestSchema, { name: '', age: -1 });
		expect(isErr(result)).toBe(true);
	});
});

describe('validatePartial', () => {
	it('should validate partial data', () => {
		const result = validatePartial(TestSchema, { name: 'John' });
		expect(isOk(result)).toBe(true);
	});

	it('should reject invalid partial data', () => {
		const result = validatePartial(TestSchema, { age: -1 });
		expect(isErr(result)).toBe(true);
	});

	it('should allow empty object', () => {
		const result = validatePartial(TestSchema, {});
		expect(isOk(result)).toBe(true);
	});
});

describe('isValidationError', () => {
	it('should identify ValidationError objects', () => {
		const error = {
			code: 'VALIDATION_ERROR' as const,
			message: 'test',
			fields: {},
		};
		expect(isValidationError(error)).toBe(true);
	});

	it('should reject non-ValidationError objects', () => {
		expect(isValidationError(new Error())).toBe(false);
		expect(isValidationError({ code: 'OTHER' })).toBe(false);
		expect(isValidationError(null)).toBe(false);
	});
});

describe('zodErrorToValidationError', () => {
	it('should convert Zod errors to ValidationError format', () => {
		const zodResult = TestSchema.safeParse({ name: '', age: -1 });
		if (!zodResult.success) {
			const validationError = zodErrorToValidationError(zodResult.error);
			expect(validationError.code).toBe('VALIDATION_ERROR');
			expect(validationError.message).toBe('Validation failed');
			expect(Object.keys(validationError.fields).length).toBeGreaterThan(0);
		}
	});
});
