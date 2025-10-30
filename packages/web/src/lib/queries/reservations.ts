/**
 * Reservation Query Hooks
 * TanStack Query hooks for reservation CRUD operations
 * @module lib/queries/reservations
 */

import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryOptions,
	type UseMutationOptions,
} from '@tanstack/react-query';

import {
	apiGet,
	apiPost,
	apiPut,
	apiDelete,
} from '../api-client.js';
import { API_ENDPOINTS } from '../api-config.js';

import type {
	ListReservationsResponse,
	CreateReservationResponse,
	UpdateReservationResponse,
	DeleteReservationResponse,
} from '../api-types.js';
import type {
	CreateReservation,
	UpdateReservation,
} from '@seatkit/types';

/**
 * Query key factory for reservations
 */
export const reservationKeys = {
	all: ['reservations'] as const,
	lists: () => [...reservationKeys.all, 'list'] as const,
	list: (filters?: unknown) => [...reservationKeys.lists(), filters] as const,
	details: () => [...reservationKeys.all, 'detail'] as const,
	detail: (id: string) => [...reservationKeys.details(), id] as const,
};

/**
 * Fetch all reservations
 */
async function fetchReservations(): Promise<ListReservationsResponse> {
	return apiGet<ListReservationsResponse>(API_ENDPOINTS.reservations.list);
}

/**
 * Hook to fetch all reservations
 */
export function useReservations(
	options?: Omit<
		UseQueryOptions<ListReservationsResponse, Error>,
		'queryKey' | 'queryFn'
	>,
) {
	return useQuery({
		queryKey: reservationKeys.list(),
		queryFn: fetchReservations,
		...options,
	});
}

/**
 * Create a new reservation
 */
async function createReservation(
	data: CreateReservation,
): Promise<CreateReservationResponse> {
	return apiPost<CreateReservationResponse>(
		API_ENDPOINTS.reservations.create,
		data,
	);
}

/**
 * Hook to create a new reservation
 */
export function useCreateReservation(
	options?: UseMutationOptions<
		CreateReservationResponse,
		Error,
		CreateReservation
	>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createReservation,
		onSuccess: () => {
			// Invalidate and refetch reservations list
			void queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
		},
		...options,
	});
}

/**
 * Update an existing reservation
 */
async function updateReservation(
	data: UpdateReservation,
): Promise<UpdateReservationResponse> {
	const { id, ...updateData } = data;
	return apiPut<UpdateReservationResponse>(
		API_ENDPOINTS.reservations.update(id),
		updateData,
	);
}

/**
 * Hook to update an existing reservation
 */
export function useUpdateReservation(
	options?: UseMutationOptions<
		UpdateReservationResponse,
		Error,
		UpdateReservation
	>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: updateReservation,
		onSuccess: (data, variables) => {
			// Invalidate both list and detail queries
			void queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
			void queryClient.invalidateQueries({
				queryKey: reservationKeys.detail(variables.id),
			});
		},
		...options,
	});
}

/**
 * Delete a reservation
 */
async function deleteReservation(
	id: string,
): Promise<DeleteReservationResponse> {
	return apiDelete<DeleteReservationResponse>(
		API_ENDPOINTS.reservations.delete(id),
	);
}

/**
 * Hook to delete a reservation
 */
export function useDeleteReservation(
	options?: UseMutationOptions<DeleteReservationResponse, Error, string>,
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteReservation,
		onSuccess: () => {
			// Invalidate reservations list
			void queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
		},
		...options,
	});
}

