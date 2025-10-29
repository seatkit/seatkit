/**
 * Common API Response Schemas
 * Shared response structures used across all API endpoints
 * @module schemas/common
 */

import { z } from 'zod';

/**
 * Standard error response schema
 * Used across all API endpoints for error responses
 */
export const ErrorResponseSchema = z.object({
	error: z.string(),
	message: z.string(),
	details: z.array(z.string()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Standard success response for operations that don't return data
 */
export const SuccessResponseSchema = z.object({
	message: z.string(),
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
