/**
 * Tests for API Client
 * @module lib/api-client.test
 */

import {
	createMockResponse,
	createMockErrorResponse,
	createMockErrorResponseWithoutJson,
} from '@seatkit/utils/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
	ApiError,
	apiRequest,
	apiGet,
	apiPost,
	apiPut,
	apiDelete,
} from './api-client.js';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock API_BASE_URL
vi.mock('./api-config.js', () => ({
	API_BASE_URL: 'http://localhost:3001',
}));

// Helper function to assert ApiError properties
async function expectApiError(
	fn: () => Promise<unknown>,
	expected: {
		status: number;
		statusText: string;
		error: { error: string; message: string; details?: string[] };
	},
): Promise<void> {
	try {
		await fn();
		expect.fail('Should have thrown ApiError');
	} catch (error) {
		expect(error).toBeInstanceOf(ApiError);
		if (error instanceof ApiError) {
			expect(error.status).toBe(expected.status);
			expect(error.statusText).toBe(expected.statusText);
			expect(error.error).toEqual(expected.error);
			expect(error.message).toBe(expected.error.message);
		}
	}
}

describe('ApiError', () => {
	it('should create an ApiError with status, statusText, and error details', () => {
		const errorResponse = {
			error: 'Bad Request',
			message: 'Invalid input',
			details: ['Field is required'],
		};

		const error = new ApiError(400, 'Bad Request', errorResponse);

		expect(error).toBeInstanceOf(Error);
		expect(error.status).toBe(400);
		expect(error.statusText).toBe('Bad Request');
		expect(error.error).toEqual(errorResponse);
		expect(error.message).toBe('Invalid input');
		expect(error.name).toBe('ApiError');
	});

	it('should use statusText as message if error.message is not provided', () => {
		const errorResponse = {
			error: 'Internal Server Error',
			message: '',
		};

		const error = new ApiError(500, 'Internal Server Error', errorResponse);

		expect(error.message).toBe('Internal Server Error');
	});
});

describe('apiRequest', () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('successful requests', () => {
		it('should make a GET request with default options', async () => {
			const mockData = { id: 1, name: 'Test' };
			mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

			const result = await apiRequest<typeof mockData>('/test');

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:3001/test',
				expect.objectContaining({
					method: 'GET',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
					}),
				}),
			);
			expect(result).toEqual(mockData);
		});

		it.each([
			['POST', { name: 'Test Item' }],
			['PUT', { name: 'Updated Item' }],
			['PATCH', { name: 'Patched Item' }],
		])('should handle %s requests with body', async (method, requestBody) => {
			const mockData = { id: 1, ...requestBody };
			mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

			const result = await apiRequest<typeof mockData>('/test/1', {
				method: method as 'POST' | 'PUT' | 'PATCH',
				body: requestBody,
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:3001/test/1',
				expect.objectContaining({
					method,
					body: JSON.stringify(requestBody),
				}),
			);
			expect(result).toEqual(mockData);
		});

		it('should handle DELETE requests', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse({ success: true }));

			const result = await apiRequest('/test/1', { method: 'DELETE' });

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:3001/test/1',
				expect.objectContaining({
					method: 'DELETE',
				}),
			);
			expect(result).toEqual({ success: true });
		});

		it('should handle 204 No Content responses', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 204,
				statusText: 'No Content',
				json: async () => {
					throw new Error('Should not call json()');
				},
			} as unknown as Response);

			const result = await apiRequest('/test', { method: 'DELETE' });

			expect(mockFetch).toHaveBeenCalled();
			expect(result).toBeUndefined();
		});

		it('should merge custom headers', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse({}));

			await apiRequest('/test', {
				headers: {
					Authorization: 'Bearer token123',
					'X-Custom-Header': 'custom-value',
				},
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:3001/test',
				expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Authorization: 'Bearer token123',
						'X-Custom-Header': 'custom-value',
					}),
				}),
			);
		});

		it('should include AbortSignal when provided', async () => {
			const abortController = new AbortController();
			const signal = abortController.signal;

			mockFetch.mockResolvedValueOnce(createMockResponse({}));

			await apiRequest('/test', { signal });

			expect(mockFetch).toHaveBeenCalledWith(
				'http://localhost:3001/test',
				expect.objectContaining({
					signal,
				}),
			);
		});
	});

	describe('error handling', () => {
		it('should throw ApiError for non-ok responses with JSON error', async () => {
			const errorResponse = {
				error: 'Bad Request',
				message: 'Invalid input',
				details: ['Field is required'],
			};

			mockFetch.mockResolvedValueOnce(
				createMockErrorResponse(errorResponse, 400, 'Bad Request'),
			);

			await expectApiError(() => apiRequest('/test'), {
				status: 400,
				statusText: 'Bad Request',
				error: errorResponse,
			});
		});

		it('should throw ApiError for non-ok responses without JSON error', async () => {
			mockFetch.mockResolvedValueOnce(
				createMockErrorResponseWithoutJson(500, 'Internal Server Error'),
			);

			await expectApiError(() => apiRequest('/test'), {
				status: 500,
				statusText: 'Internal Server Error',
				error: {
					error: 'Internal Server Error',
					message: 'HTTP 500: Internal Server Error',
				},
			});
		});

		it('should handle network errors', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(apiRequest('/test')).rejects.toThrow('Network error');
		});

		it.each([
			[404, 'Not Found', 'Resource not found'],
			[401, 'Unauthorized', 'Authentication required'],
			[403, 'Forbidden', 'Access denied'],
		])('should handle %d %s', async (status, statusText, message) => {
			const errorResponse = {
				error: statusText,
				message,
			};

			mockFetch.mockResolvedValueOnce(
				createMockErrorResponse(errorResponse, status, statusText),
			);

			await expectApiError(() => apiRequest('/test'), {
				status,
				statusText,
				error: errorResponse,
			});
		});

		it('should not include body for GET requests', async () => {
			mockFetch.mockResolvedValueOnce(createMockResponse({}));

			await apiRequest('/test', { method: 'GET' });

			const requestInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
			expect(requestInit?.body).toBeUndefined();
		});
	});
});

describe('helper functions', () => {
	beforeEach(() => {
		mockFetch.mockClear();
	});

	it.each([
		['apiGet', apiGet, undefined, 'GET'],
		['apiPost', apiPost, { name: 'Test' }, 'POST'],
		['apiPut', apiPut, { name: 'Test' }, 'PUT'],
		['apiDelete', apiDelete, undefined, 'DELETE'],
	])('%s should make a %s request', async (_name, fn, body, method) => {
		const mockData = body ? { id: 1, ...body } : { id: 1 };
		mockFetch.mockResolvedValueOnce(createMockResponse(mockData));

		const result =
			body === undefined
				? await (fn as (endpoint: string) => Promise<unknown>)('/test')
				: await (fn as (endpoint: string, body: unknown) => Promise<unknown>)(
						'/test',
						body,
					);

		expect(mockFetch).toHaveBeenCalledWith(
			'http://localhost:3001/test',
			expect.objectContaining({
				method,
				...(body !== undefined && { body: JSON.stringify(body) }),
			}),
		);
		expect(result).toEqual(mockData);
	});
});
