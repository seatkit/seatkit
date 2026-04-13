'use client';

import { motion, useReducedMotion } from 'motion/react';
import React, { useMemo } from 'react';

import { useReservations } from '../../lib/queries/reservations.js';
import { useTables } from '../../lib/queries/settings.js';
import { uuidToColor, type ColorScheme } from '../../lib/uuid-color.js';

type ServiceCategory = 'lunch' | 'dinner' | 'no_booking_zone';

/** Module-level constant — stable across renders, safe to omit from useMemo deps */
const CATEGORY_MAP: Record<ServiceCategory, string[]> = {
	lunch: ['lunch'],
	dinner: ['dinner'],
	no_booking_zone: ['special', 'walk_in'],
};

type FloorPlanViewProps = Readonly<{
	date: Date;
	category: ServiceCategory;
	onReservationClick?: (reservationId: string) => void;
}>;

export function FloorPlanView({ date, category, onReservationClick }: FloorPlanViewProps) {
	const prefersReduced = useReducedMotion();
	const { data: tablesData, isLoading: tablesLoading, isError: tablesError } = useTables();
	const { data: reservationsData, isLoading: reservationsLoading, isError: reservationsError } = useReservations();

	const isLoading = tablesLoading || reservationsLoading;
	const isError = tablesError || reservationsError;

	const tables = useMemo(() => tablesData?.tables ?? [], [tablesData]);

	// Format a Date as a local-calendar YYYY-MM-DD string.
	// Using toISOString() would convert to UTC first, causing off-by-one errors for
	// timezones east of UTC (e.g. Italy UTC+2: local midnight = prior UTC day).
	const toLocalDate = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

	// Build a map: tableId → reservation id for this date+category
	const tableToReservation = useMemo(() => {
		const cats = CATEGORY_MAP[category];
		const map = new Map<string, { id: string }>();
		// Compare by local calendar date string (YYYY-MM-DD) — never toISOString()
		const targetDateStr = toLocalDate(date);
		for (const res of reservationsData?.reservations ?? []) {
			if (res.isDeleted) continue;
			const sameDay = toLocalDate(new Date(res.date)) === targetDateStr;
			if (!sameDay || !cats.includes(res.category)) continue;
			for (const tableId of res.tableIds ?? []) {
				map.set(tableId, { id: res.id });
			}
		}
		return map;
	}, [reservationsData, date, category]);

	if (isLoading) {
		return (
			<div className="flex flex-col flex-1 gap-2 p-4" data-testid="floor-plan-view">
				{Array.from({ length: 6 }, (_, i) => (
					<div key={i} className="animate-pulse bg-muted rounded h-20 w-20" />
				))}
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex items-center justify-center flex-1 py-16 px-6" data-testid="floor-plan-view">
				<p className="text-sm text-destructive text-center" role="alert">
					Could not load tables. Check your connection and refresh.
				</p>
			</div>
		);
	}

	if (tables.length === 0) {
		return (
			<div className="flex items-center justify-center flex-1 py-16 text-muted-foreground text-sm">
				No tables configured. Add tables in Settings to see the floor plan.
			</div>
		);
	}

	// Find grid dimensions using positionX/positionY from the DB schema
	const maxCol = Math.max(...tables.map((t) => t.positionX ?? 0), 1);
	const maxRow = Math.max(...tables.map((t) => t.positionY ?? 0), 1);

	const colorScheme: ColorScheme =
		typeof globalThis.window !== 'undefined' &&
		globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';

	return (
		<div className="p-6 overflow-auto flex-1" data-testid="floor-plan-view">
			<div
				style={{
					display: 'grid',
					gridTemplateRows: `repeat(${maxRow + 1}, 88px)`,
					gridTemplateColumns: `repeat(${maxCol + 1}, 88px)`,
					gap: '8px',
				}}
			>
				{tables.map((table) => {
					const reservation = tableToReservation.get(table.id);
					const color = reservation ? uuidToColor(reservation.id, colorScheme) : null;

					return (
						<motion.div
							key={table.id}
							data-testid="table-card"
							whileHover={prefersReduced ? {} : { scale: 1.03 }}
							transition={{ type: 'spring', stiffness: 400, damping: 20 }}
							onClick={() => { if (reservation) onReservationClick?.(reservation.id); }}
							role={reservation ? 'button' : undefined}
							tabIndex={reservation ? 0 : undefined}
							onKeyDown={(e) => { if (reservation && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onReservationClick?.(reservation.id); } }}
							style={{
								gridRow: (table.positionY ?? 0) + 1,
								gridColumn: (table.positionX ?? 0) + 1,
								boxShadow: color ? `0 0 0 2px ${color.bg}` : undefined,
								cursor: reservation ? 'pointer' : 'default',
							}}
							className="relative w-20 h-20 rounded-xl bg-card border border-border flex items-center justify-center select-none focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{/* Cluster color dot — top-right corner (TABLE-07) */}
							{color && (
								<span
									aria-hidden="true"
									style={{ backgroundColor: color.bg }}
									className="absolute top-1 right-1 w-2 h-2 rounded-full"
								/>
							)}

							{/* Table number/name */}
							<span
								className={[
									'text-lg font-semibold',
									color ? '' : 'text-muted-foreground',
								].join(' ')}
							>
								{table.name}
							</span>
						</motion.div>
					);
				})}
			</div>
		</div>
	);
}
