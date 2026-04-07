/**
 * TanStack Query hooks for settings data
 * Tables, restaurant settings (service categories, hours, priority order)
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiGet, apiPost, apiPut, apiDelete } from '../api-client.js';
import { API_ENDPOINTS } from '../api-config.js';

// Query keys
export const settingsKeys = {
	tables: ['settings', 'tables'] as const,
	restaurantSettings: ['settings', 'restaurant'] as const,
};

// Zod schemas for response parsing
const TableSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	maxCapacity: z.number().int(),
	minCapacity: z.number().int(),
	positionX: z.number().int().nullable(),
	positionY: z.number().int().nullable(),
	isActive: z.boolean(),
});

const TablesResponseSchema = z.object({
	tables: z.array(TableSchema),
	count: z.number().int(),
});

const ServiceCategorySchema = z.object({
	id: z.string(),
	name: z.string(),
	startTime: z.string(),
	endTime: z.string(),
	isActive: z.boolean(),
});

const ServiceHoursConfigSchema = z.object({
	openDays: z.array(z.number().int()),
	defaultDuration: z.number().int(),
});

const RestaurantSettingsSchema = z.object({
	id: z.string().uuid(),
	priorityOrder: z.array(z.string()),
	serviceCategories: z.array(ServiceCategorySchema).nullable(),
	serviceHours: ServiceHoursConfigSchema.nullable(),
});

const RestaurantSettingsResponseSchema = z.object({
	settings: RestaurantSettingsSchema,
});

export function useTables() {
	return useQuery({
		queryKey: settingsKeys.tables,
		queryFn: () => apiGet(API_ENDPOINTS.tables.list, TablesResponseSchema),
	});
}

export function useRestaurantSettings() {
	return useQuery({
		queryKey: settingsKeys.restaurantSettings,
		queryFn: () =>
			apiGet(API_ENDPOINTS.restaurantSettings.get, RestaurantSettingsResponseSchema),
	});
}

export function useCreateTable() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			name: string;
			maxCapacity: number;
			minCapacity?: number;
			positionX?: number | null;
			positionY?: number | null;
		}) =>
			apiPost(API_ENDPOINTS.tables.list, data, z.object({ table: TableSchema })),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: settingsKeys.tables });
		},
	});
}

export function useDeleteTable() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiDelete(
				`/api/v1/tables/${id}`,
				z.object({ message: z.string() }),
			),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: settingsKeys.tables });
		},
	});
}

export function useUpdateRestaurantSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: {
			priorityOrder?: string[];
			serviceCategories?: z.infer<typeof ServiceCategorySchema>[];
			serviceHours?: z.infer<typeof ServiceHoursConfigSchema>;
		}) =>
			apiPut(
				API_ENDPOINTS.restaurantSettings.update,
				data,
				z.object({ settings: RestaurantSettingsSchema, message: z.string() }),
			),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: settingsKeys.restaurantSettings });
		},
	});
}
