/**
 * Error Utilities
 * Utilities for parsing and handling API errors
 * @module lib/errors
 */

import { ApiError } from './api-client.js';

/**
 * Check if error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError;
}

/**
 * Get user-friendly error message from error
 */
export function getErrorMessage(error: unknown): string {
	if (isApiError(error)) {
		return error.error.message || error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === 'string') {
		return error;
	}

	return 'An unexpected error occurred';
}

/**
 * Get error status code if available
 */
export function getErrorStatus(error: unknown): number | undefined {
	if (isApiError(error)) {
		return error.status;
	}

	return undefined;
}

/**
 * Check if error is a network error (no response from server)
 */
export function isNetworkError(error: unknown): boolean {
	if (error instanceof TypeError && error.message.includes('fetch')) {
		return true;
	}

	if (isApiError(error) && error.status === 0) {
		return true;
	}

	return false;
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: unknown): boolean {
	if (isApiError(error)) {
		return error.status >= 400 && error.status < 500;
	}

	return false;
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: unknown): boolean {
	if (isApiError(error)) {
		return error.status >= 500;
	}

	return false;
}

