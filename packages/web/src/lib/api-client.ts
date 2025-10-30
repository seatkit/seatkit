/**
 * API Client
 * Fetch wrapper with error handling and type safety
 * @module lib/api-client
 */

import { API_BASE_URL } from './api-config.js';

import type { ApiErrorResponse, ApiRequestOptions } from './api-types.js';
import type { ZodSchema } from 'zod';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
	constructor(
		public status: number,
		public statusText: string,
		public error: ApiErrorResponse,
	) {
		super(error.message || statusText);
		this.name = 'ApiError';
	}
}

/**
 * Parse error response from API
 */
async function parseErrorResponse(
	response: Response,
): Promise<ApiErrorResponse> {
	try {
		const data = (await response.json()) as ApiErrorResponse;
		return data;
	} catch {
		return {
			error: response.statusText,
			message: `HTTP ${response.status}: ${response.statusText}`,
		};
	}
}

/**
 * Make a type-safe API request with optional Zod validation
 */
export async function apiRequest<T>(
	endpoint: string,
	options: ApiRequestOptions = {},
	schema?: ZodSchema<T>,
): Promise<T> {
	const { method = 'GET', headers = {}, body, signal } = options;

	const url = `${API_BASE_URL}${endpoint}`;

	const requestHeaders: HeadersInit = {
		'Content-Type': 'application/json',
		...headers,
	};

	const requestOptions: RequestInit = {
		method,
		headers: requestHeaders,
	};

	if (signal) {
		requestOptions.signal = signal;
	}

	if (body !== undefined) {
		requestOptions.body = JSON.stringify(body);
	}

	const response = await fetch(url, requestOptions);

	if (!response.ok) {
		const error = await parseErrorResponse(response);
		throw new ApiError(response.status, response.statusText, error);
	}

	// Handle 204 No Content
	if (response.status === 204) {
		return undefined as T;
	}

	const data = (await response.json()) as unknown;

	// Validate response with schema if provided
	if (schema) {
		const result = schema.safeParse(data);
		if (!result.success) {
			throw new ApiError(500, 'Invalid Response', {
				error: 'Validation Error',
				message: 'API response does not match expected schema',
				details: result.error.errors.map(e => {
					const path = e.path.length > 0 ? e.path.join('.') : 'root';
					return `${path}: ${e.message}`;
				}),
			});
		}
		return result.data;
	}

	return data as T;
}

/**
 * GET request helper
 */
export async function apiGet<T>(
	endpoint: string,
	schema?: ZodSchema<T>,
): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'GET' }, schema);
}

/**
 * POST request helper
 */
export async function apiPost<T>(
	endpoint: string,
	body: unknown,
	schema?: ZodSchema<T>,
): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'POST', body }, schema);
}

/**
 * PUT request helper
 */
export async function apiPut<T>(
	endpoint: string,
	body: unknown,
	schema?: ZodSchema<T>,
): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'PUT', body }, schema);
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(
	endpoint: string,
	schema?: ZodSchema<T>,
): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'DELETE' }, schema);
}
