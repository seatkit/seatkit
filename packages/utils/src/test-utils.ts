/**
 * Test utilities for HTTP/fetch mocking
 * @module test-utils/http
 */

/**
 * Create a mock Response object for testing
 */
export function createMockResponse<T>(
	data: T,
	options: { ok?: boolean; status?: number; statusText?: string } = {},
): Response {
	const { ok = true, status = 200, statusText = 'OK' } = options;
	return {
		ok,
		status,
		statusText,
		json: async () => data,
	} as Response;
}

/**
 * Create a mock error Response with JSON error body
 */
export function createMockErrorResponse(
	errorResponse: { error: string; message: string; details?: string[] },
	status: number,
	statusText: string,
): Response {
	return {
		ok: false,
		status,
		statusText,
		json: async () => errorResponse,
	} as Response;
}

/**
 * Create a mock error Response without JSON (invalid JSON response)
 */
export function createMockErrorResponseWithoutJson(
	status: number,
	statusText: string,
): Response {
	return {
		ok: false,
		status,
		statusText,
		json: async () => {
			throw new Error('Invalid JSON');
		},
	} as unknown as Response;
}
