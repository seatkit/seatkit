/**
 * Tests for Result type utilities
 * @module utils/result.test
 */

import { describe, it, expect } from 'vitest';

import {
	ok,
	err,
	isOk,
	isErr,
	unwrap,
	unwrapOr,
	map,
	mapErr,
	andThen,
	fromPromise,
	tryCatch,
} from './result.js';

describe('ok and err constructors', () => {
	it('should create Ok results', () => {
		const result = ok(42);
		expect(result.ok).toBe(true);
		expect(result.value).toBe(42);
	});

	it('should create Err results', () => {
		const result = err('error message');
		expect(result.ok).toBe(false);
		expect(result.error).toBe('error message');
	});
});

describe('isOk and isErr type guards', () => {
	it('should correctly identify Ok results', () => {
		const result = ok(42);
		expect(isOk(result)).toBe(true);
		expect(isErr(result)).toBe(false);
	});

	it('should correctly identify Err results', () => {
		const result = err('error');
		expect(isOk(result)).toBe(false);
		expect(isErr(result)).toBe(true);
	});
});

describe('unwrap', () => {
	it('should return value from Ok', () => {
		expect(unwrap(ok(42))).toBe(42);
	});

	it('should throw error from Err', () => {
		expect(() => unwrap(err(new Error('test')))).toThrow('test');
	});
});

describe('unwrapOr', () => {
	it('should return value from Ok', () => {
		expect(unwrapOr(ok(42), 0)).toBe(42);
	});

	it('should return default value from Err', () => {
		expect(unwrapOr(err('error'), 0)).toBe(0);
	});
});

describe('map', () => {
	it('should transform Ok value', () => {
		const result = map(ok(2), x => x * 2);
		expect(isOk(result) && result.value).toBe(4);
	});

	it('should pass through Err unchanged', () => {
		const result = map(err('error'), (x: number) => x * 2);
		expect(isErr(result) && result.error).toBe('error');
	});
});

describe('mapErr', () => {
	it('should pass through Ok unchanged', () => {
		const result = mapErr(ok(42), (e: string) => e.toUpperCase());
		expect(isOk(result) && result.value).toBe(42);
	});

	it('should transform Err value', () => {
		const result = mapErr(err('error'), e => e.toUpperCase());
		expect(isErr(result) && result.error).toBe('ERROR');
	});
});

describe('andThen', () => {
	it('should chain Ok results', () => {
		const result = andThen(ok(2), x => ok(x * 2));
		expect(isOk(result) && result.value).toBe(4);
	});

	it('should propagate Err through chain', () => {
		const result = andThen(err('error'), (x: number) => ok(x * 2));
		expect(isErr(result) && result.error).toBe('error');
	});

	it('should allow chained function to return Err', () => {
		const result = andThen(ok(2), () => err('chain error'));
		expect(isErr(result) && result.error).toBe('chain error');
	});
});

describe('fromPromise', () => {
	it('should convert resolved promise to Ok', async () => {
		const result = await fromPromise(Promise.resolve(42));
		expect(isOk(result) && result.value).toBe(42);
	});

	it('should convert rejected promise to Err', async () => {
		const result = await fromPromise(Promise.reject(new Error('failed')));
		expect(isErr(result)).toBe(true);
	});

	it('should use custom error mapper', async () => {
		const result = await fromPromise(
			Promise.reject(new Error('failed')),
			e => `Custom: ${(e as Error).message}`,
		);
		expect(isErr(result) && result.error).toBe('Custom: failed');
	});
});

describe('tryCatch', () => {
	it('should return Ok for successful function', () => {
		const result = tryCatch(() => 42);
		expect(isOk(result) && result.value).toBe(42);
	});

	it('should return Err for throwing function', () => {
		const result = tryCatch(() => {
			throw new Error('failed');
		});
		expect(isErr(result)).toBe(true);
	});

	it('should use custom error mapper', () => {
		const result = tryCatch(
			() => {
				throw new Error('failed');
			},
			e => `Custom: ${(e as Error).message}`,
		);
		expect(isErr(result) && result.error).toBe('Custom: failed');
	});
});
