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

import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '../api-client.js';
import { API_ENDPOINTS } from '../api-config.js';
import {
	ListReservationsResponseSchema,
	CreateReservationResponseSchema,
	UpdateReservationResponseSchema,
	DeleteReservationResponseSchema,
	type ListReservationsResponse,
	type CreateReservationResponse,
	type UpdateReservationResponse,
	type DeleteReservationResponse,
	type Reservation,
} from '../api-types.js';

import type { CreateReservation, UpdateReservation } from '@seatkit/types';

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
	return apiGet<ListReservationsResponse>(
		API_ENDPOINTS.reservations.list,
		ListReservationsResponseSchema,
	);
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
		CreateReservationResponseSchema,
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
			queryClient
				.invalidateQueries({ queryKey: reservationKeys.lists() })
				.catch(() => {
					// Ignore errors from cache invalidation
				});
		},
		...options,
	});
}

/**
 * Extended update type that includes the optimistic lock version (COLLAB-03)
 */
export type UpdateReservationWithVersion = UpdateReservation & {
	/** Server version number — must match the current server version to avoid 409 */
	versionId: number;
};

/**
 * 409 conflict data surfaced to the caller via onConflict callback
 */
export type ConflictData = {
	/** The user's unsaved edits */
	draft: Partial<UpdateReservation>;
	/** The current server state from the 409 response body */
	current: Reservation;
};

/**
 * Update an existing reservation (includes versionId for optimistic locking)
 */
async function updateReservation(
	data: UpdateReservationWithVersion,
): Promise<UpdateReservationResponse> {
	const { id, ...updateData } = data;
	return apiPut<UpdateReservationResponse>(
		API_ENDPOINTS.reservations.update(id),
		updateData, // includes versionId
		UpdateReservationResponseSchema,
	);
}

/**
 * 409 conflict response body shape from Plan 01
 */
type ConflictResponseBody = {
	conflict: true;
	current: Reservation;
};

/**
 * Hook to update an existing reservation.
 * Detects 409 conflicts and surfaces them via the onConflict callback
 * instead of onError — preserving the user's draft for resolution.
 */
export function useUpdateReservation(
	options?: UseMutationOptions<
		UpdateReservationResponse,
		Error,
		UpdateReservationWithVersion
	> & {
		onConflict?: (data: ConflictData) => void;
	},
) {
	const queryClient = useQueryClient();

	// Separate onConflict from the rest of options before spreading
	const { onConflict, onError, onSuccess, ...restOptions } = options ?? {};

	return useMutation({
		mutationFn: updateReservation,
		onSuccess: (data, variables, onMutateResult, ctx) => {
			// Invalidate both list and detail queries
			queryClient
				.invalidateQueries({ queryKey: reservationKeys.lists() })
				.catch(() => {
					// Ignore errors from cache invalidation
				});
			queryClient
				.invalidateQueries({
					queryKey: reservationKeys.detail(variables.id),
				})
				.catch(() => {
					// Ignore errors from cache invalidation
				});
			onSuccess?.(data, variables, onMutateResult, ctx);
		},
		onError: (error: Error, variables, onMutateResult, ctx) => {
			// Detect 409 conflict — surface via onConflict, not onError
			if (error instanceof ApiError && error.status === 409 && onConflict) {
				const body = error.body as ConflictResponseBody | null | undefined;
				if (body?.conflict === true && body.current) {
					const { versionId: _v, ...draft } = variables;
					onConflict({ draft, current: body.current });
					return; // Do not propagate to onError
				}
			}
			onError?.(error, variables, onMutateResult, ctx);
		},
		...restOptions,
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
		DeleteReservationResponseSchema,
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
			queryClient
				.invalidateQueries({ queryKey: reservationKeys.lists() })
				.catch(() => {
					// Ignore errors from cache invalidation
				});
		},
		...options,
	});
}
