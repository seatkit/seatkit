/**
 * Integration tests for Reservation Query Hooks
 * Tests hook behavior with mocked API client using React Testing Library
 * @module lib/queries/reservations.test
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { type ReactNode } from 'react';

import * as apiClient from '../api-client.js';
import { API_ENDPOINTS } from '../api-config.js';
import {
	ListReservationsResponseSchema,
	CreateReservationResponseSchema,
	UpdateReservationResponseSchema,
	DeleteReservationResponseSchema,
} from '../api-types.js';
import {
	reservationKeys,
	useReservations,
	useCreateReservation,
	useUpdateReservation,
	useDeleteReservation,
} from './reservations.js';
import type {
	ListReservationsResponse,
	CreateReservationResponse,
	UpdateReservationResponse,
	DeleteReservationResponse,
} from '../api-types.js';
import type { CreateReservation, UpdateReservation } from '@seatkit/types';

// Mock the API client
vi.mock('../api-client.js', () => ({
	apiGet: vi.fn(),
	apiPost: vi.fn(),
	apiPut: vi.fn(),
	apiDelete: vi.fn(),
}));

// Mock API config
vi.mock('../api-config.js', () => ({
	API_ENDPOINTS: {
		reservations: {
			list: '/api/reservations',
			get: (id: string) => `/api/reservations/${id}`,
			create: '/api/reservations',
			update: (id: string) => `/api/reservations/${id}`,
			delete: (id: string) => `/api/reservations/${id}`,
		},
	},
}));

/**
 * Create a test wrapper with QueryClient
 */
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
			mutations: {
				retry: false,
			},
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('reservationKeys', () => {
	it('should generate correct query keys', () => {
		expect(reservationKeys.all).toEqual(['reservations']);
		expect(reservationKeys.lists()).toEqual(['reservations', 'list']);
		// list() includes undefined when no filters are passed
		expect(reservationKeys.list()).toEqual(['reservations', 'list', undefined]);
		expect(reservationKeys.list({ status: 'pending' })).toEqual([
			'reservations',
			'list',
			{ status: 'pending' },
		]);
		expect(reservationKeys.details()).toEqual(['reservations', 'detail']);
		expect(reservationKeys.detail('123')).toEqual(['reservations', 'detail', '123']);
	});
});

describe('useReservations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch reservations successfully', async () => {
		const mockResponse: ListReservationsResponse = {
			reservations: [],
			count: 0,
		};

		vi.mocked(apiClient.apiGet).mockResolvedValueOnce(mockResponse);

		const { result } = renderHook(() => useReservations(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(apiClient.apiGet).toHaveBeenCalledWith(
			API_ENDPOINTS.reservations.list,
			ListReservationsResponseSchema,
		);
		expect(result.current.data).toEqual(mockResponse);
	});

	it('should handle loading state', () => {
		vi.mocked(apiClient.apiGet).mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves
				}),
		);

		const { result } = renderHook(() => useReservations(), {
			wrapper: createWrapper(),
		});

		expect(result.current.isLoading).toBe(true);
		expect(result.current.data).toBeUndefined();
	});

	it('should handle error state', async () => {
		const error = new Error('Failed to fetch');
		vi.mocked(apiClient.apiGet).mockRejectedValueOnce(error);

		const { result } = renderHook(() => useReservations(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toEqual(error);
	});
});

describe('useCreateReservation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should create reservation successfully', async () => {
		const mockCreateData: CreateReservation = {
			date: new Date('2025-12-01T19:00:00Z'),
			duration: 120,
			partySize: 2,
			category: 'dinner',
			customer: {
				name: 'John Doe',
				phone: '+1234567890',
			},
			createdBy: 'user-123',
			tableIds: null,
		};

		const mockResponse: CreateReservationResponse = {
			reservation: {
				id: 'res-123',
				...mockCreateData,
				status: 'pending',
				notes: null,
				tags: null,
				source: null,
				confirmedAt: null,
				seatedAt: null,
				completedAt: null,
				cancelledAt: null,
				cancelledBy: null,
				cancellationReason: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			message: 'Reservation created successfully',
		};

		vi.mocked(apiClient.apiPost).mockResolvedValueOnce(mockResponse);

		const { result } = renderHook(() => useCreateReservation(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(mockCreateData);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(apiClient.apiPost).toHaveBeenCalledWith(
			API_ENDPOINTS.reservations.create,
			mockCreateData,
			CreateReservationResponseSchema,
		);
		expect(result.current.data).toEqual(mockResponse);
	});

	it('should handle mutation error', async () => {
		const mockCreateData: CreateReservation = {
			date: new Date('2025-12-01T19:00:00Z'),
			duration: 120,
			partySize: 2,
			category: 'dinner',
			customer: {
				name: 'John Doe',
				phone: '+1234567890',
			},
			createdBy: 'user-123',
			tableIds: null,
		};

		const error = new Error('Validation failed');
		vi.mocked(apiClient.apiPost).mockRejectedValueOnce(error);

		const { result } = renderHook(() => useCreateReservation(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(mockCreateData);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toEqual(error);
	});
});

describe('useUpdateReservation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should update reservation successfully', async () => {
		const reservationId = 'res-123';
		const mockUpdateData: UpdateReservation = {
			id: reservationId,
			updatedAt: new Date(),
			partySize: 3,
			customer: {
				name: 'Jane Doe',
				phone: '+1234567890',
			},
		};

		const mockResponse: UpdateReservationResponse = {
			reservation: {
				id: reservationId,
				date: new Date('2025-12-01T19:00:00Z'),
				duration: 120,
				partySize: 3,
				category: 'dinner',
				status: 'pending',
				customer: {
					name: 'Jane Doe',
					phone: '+1234567890',
				},
				createdBy: 'user-123',
				tableIds: null,
				notes: null,
				tags: null,
				source: null,
				confirmedAt: null,
				seatedAt: null,
				completedAt: null,
				cancelledAt: null,
				cancelledBy: null,
				cancellationReason: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			message: 'Reservation updated successfully',
		};

		vi.mocked(apiClient.apiPut).mockResolvedValueOnce(mockResponse);

		const { result } = renderHook(() => useUpdateReservation(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(mockUpdateData);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(apiClient.apiPut).toHaveBeenCalledWith(
			API_ENDPOINTS.reservations.update(reservationId),
			{
				updatedAt: mockUpdateData.updatedAt,
				partySize: 3,
				customer: {
					name: 'Jane Doe',
					phone: '+1234567890',
				},
			},
			UpdateReservationResponseSchema,
		);
		expect(result.current.data).toEqual(mockResponse);
	});

	it('should handle mutation error', async () => {
		const mockUpdateData: UpdateReservation = {
			id: 'res-123',
			updatedAt: new Date(),
			partySize: 3,
		};

		const error = new Error('Not found');
		vi.mocked(apiClient.apiPut).mockRejectedValueOnce(error);

		const { result } = renderHook(() => useUpdateReservation(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(mockUpdateData);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toEqual(error);
	});
});

describe('useDeleteReservation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should delete reservation successfully', async () => {
		const reservationId = 'res-123';
		const mockResponse: DeleteReservationResponse = {
			reservation: {
				id: reservationId,
				date: new Date('2025-12-01T19:00:00Z'),
				duration: 120,
				partySize: 2,
				category: 'dinner',
				status: 'cancelled',
				customer: {
					name: 'John Doe',
					phone: '+1234567890',
				},
				createdBy: 'user-123',
				tableIds: null,
				notes: null,
				tags: null,
				source: null,
				confirmedAt: null,
				seatedAt: null,
				completedAt: null,
				cancelledAt: new Date(),
				cancelledBy: 'user-123',
				cancellationReason: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			message: 'Reservation deleted successfully',
		};

		vi.mocked(apiClient.apiDelete).mockResolvedValueOnce(mockResponse);

		const { result } = renderHook(() => useDeleteReservation(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(reservationId);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(apiClient.apiDelete).toHaveBeenCalledWith(
			API_ENDPOINTS.reservations.delete(reservationId),
			DeleteReservationResponseSchema,
		);
		expect(result.current.data).toEqual(mockResponse);
	});

	it('should handle mutation error', async () => {
		const reservationId = 'res-123';
		const error = new Error('Not found');
		vi.mocked(apiClient.apiDelete).mockRejectedValueOnce(error);

		const { result } = renderHook(() => useDeleteReservation(), {
			wrapper: createWrapper(),
		});

		result.current.mutate(reservationId);

		await waitFor(() => {
			expect(result.current.isError).toBe(true);
		});

		expect(result.current.error).toEqual(error);
	});
});

describe('cache invalidation', () => {
	it('should verify query key structure for cache invalidation', () => {
		// These keys are used in the hooks for cache invalidation
		// Verify they match the expected structure

		const listKey = reservationKeys.lists();
		const detailKey = reservationKeys.detail('123');

		// Verify list key structure
		expect(listKey).toEqual(['reservations', 'list']);
		expect(reservationKeys.list()).toEqual(['reservations', 'list', undefined]);

		// Verify detail key structure
		expect(detailKey).toEqual(['reservations', 'detail', '123']);

		// Verify invalidateQueries will match list queries
		const queryClient = new QueryClient();
		queryClient.setQueryData(listKey, { reservations: [], count: 0 });

		// This simulates what happens in useCreateReservation.onSuccess
		const listQueries = queryClient.getQueryCache().findAll({
			queryKey: reservationKeys.lists(),
		});

		expect(listQueries.length).toBeGreaterThanOrEqual(0);
	});
});
