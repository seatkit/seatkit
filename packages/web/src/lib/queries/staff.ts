/**
 * TanStack Query hooks for staff management
 * Uses Better Auth admin API via /api/v1/staff routes (Plan 04)
 */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiGet, apiPost, apiDelete, apiPut } from '../api-client.js';

export const staffKeys = {
	list: ['settings', 'staff'] as const,
};

const StaffMemberSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	role: z.string().nullable(),
});

const StaffListResponseSchema = z.object({
	users: z.array(StaffMemberSchema),
	total: z.number().int(),
});

export function useStaff() {
	return useQuery({
		queryKey: staffKeys.list,
		queryFn: () => apiGet('/api/v1/staff', StaffListResponseSchema),
	});
}

export function useInviteStaff() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { email: string; role: 'staff' | 'manager' }) =>
			apiPost('/api/v1/staff/invite', data, z.object({ message: z.string() })),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: staffKeys.list });
		},
	});
}

export function useRemoveStaff() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiDelete(`/api/v1/staff/${id}`, z.object({ message: z.string() })),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: staffKeys.list });
		},
	});
}

export function useSetStaffRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, role }: { id: string; role: 'staff' | 'manager' }) =>
			apiPut(`/api/v1/staff/${id}/role`, { role }, z.object({ message: z.string() })),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: staffKeys.list });
		},
	});
}
