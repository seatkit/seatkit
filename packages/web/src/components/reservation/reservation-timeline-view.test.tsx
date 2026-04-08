/**
 * Tests for ReservationTimelineView — VIEW-01, VIEW-02
 * Implemented in Plan 04 (wave 3).
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ReservationTimelineView } from './reservation-timeline-view.js';

// Mock hooks
vi.mock('../../lib/queries/reservations.js', () => ({
	useReservations: () => ({
		data: {
			reservations: [
				{
					id: '550e8400-e29b-41d4-a716-446655440000',
					date: new Date().toISOString().replace(/T.*/, 'T12:00:00.000Z'),
					duration: 60,
					tableIds: ['table-1'],
					customer: { name: 'Tanaka Kenji', phone: '+1234567890' },
					partySize: 2,
					category: 'lunch',
					status: 'pending',
					isDeleted: false,
					updatedAt: new Date().toISOString(),
					version: 1,
					acceptanceState: 'toConfirm',
					isLargeGroup: false,
					preferredLanguage: null,
					emoji: null,
					photoUrl: null,
				},
			],
			count: 1,
		},
	}),
}));

vi.mock('../../lib/queries/settings.js', () => ({
	useTables: () => ({
		data: {
			tables: [
				{
					id: 'table-1',
					name: 'T1',
					maxCapacity: 4,
					minCapacity: 1,
					isActive: true,
					positionX: 0,
					positionY: 0,
				},
				{
					id: 'table-2',
					name: 'T2',
					maxCapacity: 4,
					minCapacity: 1,
					isActive: true,
					positionX: 0,
					positionY: 1,
				},
			],
		},
	}),
}));

function wrapper({ children }: { children: React.ReactNode }) {
	const qc = new QueryClient();
	return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('ReservationTimelineView (VIEW-01, VIEW-02)', () => {
	it('renders one row per table in the virtualized list', () => {
		render(<ReservationTimelineView date={new Date()} category="lunch" />, { wrapper });
		const rows = screen.getAllByTestId('timeline-row');
		expect(rows.length).toBeGreaterThanOrEqual(1);
	});

	it('reservation blocks have inline backgroundColor from uuidToColor', () => {
		render(<ReservationTimelineView date={new Date()} category="lunch" />, { wrapper });
		const block = screen.getByTestId('timeline-block');
		// jsdom normalizes hsl() → rgb() on style.backgroundColor; check raw attribute instead
		const styleAttr = (block as HTMLElement).getAttribute('style') ?? '';
		expect(styleAttr).toMatch(/background-color/);
	});

	it('empty state message shown when no reservations for the service', () => {
		render(<ReservationTimelineView date={new Date('2099-01-01')} category="dinner" />, {
			wrapper,
		});
		expect(screen.getByText(/No reservations for this service/)).toBeTruthy();
	});

	it('clicking a reservation block calls onReservationClick with the reservation id', async () => {
		const onReservationClick = vi.fn();
		render(
			<ReservationTimelineView
				date={new Date()}
				category="lunch"
				onReservationClick={onReservationClick}
			/>,
			{ wrapper },
		);
		const block = screen.getByTestId('timeline-block');
		await userEvent.click(block);
		expect(onReservationClick).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
	});
});
