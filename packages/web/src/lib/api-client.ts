/**
 * API Client
 * Fetch wrapper with error handling and type safety
 * @module lib/api-client
 */

import { API_BASE_URL } from './api-config.js';

import type { ApiErrorResponse, ApiRequestOptions } from './api-types.js';

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
 * Make a type-safe API request
 */
export async function apiRequest<T>(
	endpoint: string,
	options: ApiRequestOptions = {},
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

	return (await response.json()) as T;
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'POST', body });
}

/**
 * PUT request helper
 */
export async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'PUT', body });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'DELETE' });
}
