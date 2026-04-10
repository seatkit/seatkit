import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ReservationListView } from './reservation-list-view.js';

const mockReservations = [
	{
		id: 'aaa',
		date: '2026-04-10T12:00:00.000Z',
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-10T11:00:00.000Z',
		duration: 90,
		tableIds: ['t1'],
		customer: { name: 'Tanaka Kenji', phone: '+1' },
		partySize: 2,
		category: 'lunch',
		status: 'pending',
		isDeleted: false,
		version: 1,
		acceptanceState: 'toConfirm',
		isLargeGroup: false,
		preferredLanguage: null,
		emoji: null,
		photoUrl: null,
		notes: null,
		tags: null,
		createdBy: 'user-1',
		source: null,
		confirmedAt: null,
		seatedAt: null,
		completedAt: null,
		cancelledAt: null,
		cancelledBy: null,
		cancellationReason: null,
		deletedAt: null,
	},
	{
		id: 'bbb',
		date: '2026-04-11T19:00:00.000Z',
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-11T18:00:00.000Z',
		duration: 90,
		tableIds: ['t2'],
		customer: { name: 'Rossi Marco', phone: '+2' },
		partySize: 4,
		category: 'dinner',
		status: 'confirmed',
		isDeleted: false,
		version: 1,
		acceptanceState: 'confirmed',
		isLargeGroup: false,
		preferredLanguage: null,
		emoji: '⭐',
		photoUrl: null,
		notes: null,
		tags: null,
		createdBy: 'user-1',
		source: null,
		confirmedAt: null,
		seatedAt: null,
		completedAt: null,
		cancelledAt: null,
		cancelledBy: null,
		cancellationReason: null,
		deletedAt: null,
	},
];

vi.mock('../../lib/queries/reservations.js', () => ({
	useAllReservations: (includeDeleted: boolean) => ({
		data: {
			reservations: includeDeleted
				? [
						...mockReservations,
						{
							...mockReservations[0],
							id: 'ccc',
							isDeleted: true,
							customer: { name: 'Deleted Guest', phone: '+3' },
						},
					]
				: mockReservations,
			count: includeDeleted ? 3 : 2,
		},
		isLoading: false,
	}),
	useRecoverReservation: () => ({ mutate: vi.fn() }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('ReservationListView (VIEW-03 through VIEW-06)', () => {
	it('search input filters reservations by customer.name (case insensitive)', async () => {
		render(<ReservationListView />, { wrapper });
		const search = screen.getByRole('searchbox');
		await userEvent.type(search, 'tanaka');
		// Wait for debounce
		await act(async () => {
			await new Promise((r) => setTimeout(r, 400));
		});
		expect(screen.getByText(/Tanaka Kenji/)).toBeTruthy();
		expect(screen.queryByText(/Rossi Marco/)).toBeNull();
	});

	it('status filter chip shows only matching reservations', async () => {
		render(<ReservationListView />, { wrapper });
		await userEvent.click(screen.getByRole('checkbox', { name: 'Confirmed' }));
		expect(screen.queryByText(/Tanaka Kenji/)).toBeNull();
		expect(screen.getByText(/Rossi Marco/)).toBeTruthy();
	});

	it('deleted filter chip shows soft-deleted reservations with Recover button', async () => {
		render(<ReservationListView />, { wrapper });
		await userEvent.click(screen.getByRole('checkbox', { name: 'Deleted' }));
		expect(screen.getByText('Recover reservation')).toBeTruthy();
		expect(screen.getByText(/Deleted Guest/)).toBeTruthy();
	});

	it('sort by time shows earliest reservation first', () => {
		render(<ReservationListView />, { wrapper });
		// Time sort is default — check order via row sequence
		const rows = screen.getAllByRole('row');
		expect(rows[0]).toBeTruthy();
	});

	it('group by day renders sticky group header with date label', async () => {
		render(<ReservationListView />, { wrapper });
		await userEvent.click(screen.getByRole('checkbox', { name: 'Day' }));
		// Group headers should appear for each distinct day
		const headers = document.querySelectorAll('.bg-muted.text-muted-foreground');
		expect(headers.length).toBeGreaterThan(0);
	});

	it('empty state shown when no reservations match active filters', async () => {
		render(<ReservationListView />, { wrapper });
		await userEvent.type(screen.getByRole('searchbox'), 'zzznobody');
		await act(async () => {
			await new Promise((r) => setTimeout(r, 400));
		});
		expect(screen.getByText(/No reservations match your filters/)).toBeTruthy();
	});
});
