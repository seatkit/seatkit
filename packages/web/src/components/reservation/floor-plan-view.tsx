'use client';

import React, { useMemo } from 'react';

import { useReservations } from '../../lib/queries/reservations.js';
import { useTables } from '../../lib/queries/settings.js';
import { uuidToColor } from '../../lib/uuid-color.js';

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
}>;

export function FloorPlanView({ date, category }: FloorPlanViewProps) {
	const { data: tablesData } = useTables();
	const { data: reservationsData } = useReservations();

	const tables = useMemo(() => tablesData?.tables ?? [], [tablesData]);

	// Build a map: tableId → reservation id for this date+category
	const tableToReservation = useMemo(() => {
		const cats = CATEGORY_MAP[category];
		const map = new Map<string, { id: string }>();
		for (const res of reservationsData?.reservations ?? []) {
			if (res.isDeleted) continue;
			const rDate = new Date(res.date);
			const sameDay =
				rDate.getFullYear() === date.getFullYear() &&
				rDate.getMonth() === date.getMonth() &&
				rDate.getDate() === date.getDate();
			if (!sameDay || !cats.includes(res.category)) continue;
			for (const tableId of res.tableIds ?? []) {
				map.set(tableId, { id: res.id });
			}
		}
		return map;
	}, [reservationsData, date, category]);

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
					const color = reservation ? uuidToColor(reservation.id) : null;

					return (
						<div
							key={table.id}
							data-testid="table-card"
							style={{
								gridRow: (table.positionY ?? 0) + 1,
								gridColumn: (table.positionX ?? 0) + 1,
								// ring color as inline boxShadow (dynamic value — not a Tailwind class)
								boxShadow: color ? `0 0 0 2px ${color.bg}` : undefined,
							}}
							className="relative w-20 h-20 rounded-xl bg-card border border-border flex items-center justify-center select-none"
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
						</div>
					);
				})}
			</div>
		</div>
	);
}
