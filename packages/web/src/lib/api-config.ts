/**
 * API Configuration
 * Base URL and endpoint configuration for API client
 * @module lib/api-config
 */

/**
 * Get the API base URL from environment variable or default to localhost
 * In production, this should be set via NEXT_PUBLIC_API_URL
 */
export function getApiBaseUrl(): string {
	if (typeof window === 'undefined') {
		// Server-side: use environment variable or default
		return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
	}

	// Client-side: use environment variable or default
	return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

/**
 * API base URL
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
	reservations: {
		list: '/api/reservations',
		get: (id: string) => `/api/reservations/${id}`,
		create: '/api/reservations',
		update: (id: string) => `/api/reservations/${id}`,
		delete: (id: string) => `/api/reservations/${id}`,
	},
} as const;

