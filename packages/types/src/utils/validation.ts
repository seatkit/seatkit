/**
 * Validation utilities using Zod schemas
 * @module utils/validation
 */

import { ok, err } from './result.js';

import type { Result } from './result.js';
import type { z, ZodError } from 'zod';

/**
 * Validation error with field-level details
 */
export type ValidationError = {
	code: 'VALIDATION_ERROR';
	message: string;
	fields: Record<string, string[]>; // field name -> error messages
};

/**
 * Convert Zod errors to ValidationError
 */
export function zodErrorToValidationError(error: ZodError): ValidationError {
	const fields: Record<string, string[]> = {};

	for (const issue of error.issues) {
		const path = issue.path.join('.');
		const fieldKey = path || '_general';

		if (!fields[fieldKey]) {
			fields[fieldKey] = [];
		}
		const fieldErrors = fields[fieldKey];
		if (fieldErrors) {
			fieldErrors.push(issue.message);
		}
	}

	return {
		code: 'VALIDATION_ERROR',
		message: 'Validation failed',
		fields,
	};
}

/**
 * Validate data against a Zod schema, returning a Result
 */
export function validate<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
): Result<T, ValidationError> {
	const result = schema.safeParse(data);

	if (result.success) {
		return ok(result.data);
	}

	return err(zodErrorToValidationError(result.error));
}

/**
 * Async validation for schemas with async refinements
 */
export async function validateAsync<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
): Promise<Result<T, ValidationError>> {
	const result = await schema.safeParseAsync(data);

	if (result.success) {
		return ok(result.data);
	}

	return err(zodErrorToValidationError(result.error));
}

/**
 * Partial validation - validates only provided fields
 * Useful for PATCH operations where only some fields are updated
 */
export function validatePartial<T extends z.ZodRawShape>(
	schema: z.ZodObject<T>,
	data: unknown,
): Result<Partial<z.infer<z.ZodObject<T>>>, ValidationError> {
	return validate(schema.partial(), data);
}

/**
 * Check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		error.code === 'VALIDATION_ERROR'
	);
}
