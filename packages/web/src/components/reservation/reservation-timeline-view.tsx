'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useRef, useMemo } from 'react';

import { useReservations } from '../../lib/queries/reservations.js';
import { useTables } from '../../lib/queries/settings.js';

import { TimelineBlock } from './timeline-block.js';
import { TimelineHeader } from './timeline-header.js';

const TABLE_LABEL_WIDTH = 120; // px — must match TimelineHeader
const SLOT_WIDTH = 60; // px per 30-min slot
const ROW_HEIGHT = 48; // px per table row — matches UI-SPEC
const START_HOUR = 9; // 9:00
const END_HOUR = 23; // 23:00
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2; // 2 slots per hour
const OVERSCAN = 5;

type ServiceCategory = 'lunch' | 'dinner' | 'no_booking_zone';

type ReservationTimelineViewProps = Readonly<{
	date: Date;
	category: ServiceCategory;
	onReservationClick?: (reservationId: string) => void;
	onSlotClick?: (tableId: string, slotStart: Date) => void;
}>;

export function ReservationTimelineView({
	date,
	category,
	onReservationClick,
	onSlotClick,
}: ReservationTimelineViewProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const { data: reservationsData } = useReservations();
	const { data: tablesData } = useTables();

	const tables = useMemo(() => tablesData?.tables ?? [], [tablesData]);

	// Map UI category to reservation category values
	const categoryMap: Record<ServiceCategory, string[]> = {
		lunch: ['lunch'],
		dinner: ['dinner'],
		no_booking_zone: ['special', 'walk_in'],
	};

	// Filter reservations to the selected date + category (exclude deleted)
	const filteredReservations = useMemo(() => {
		const cats = categoryMap[category];
		return (reservationsData?.reservations ?? []).filter((r) => {
			if (r.isDeleted) return false;
			const rDate = new Date(r.date);
			const sameDay =
				rDate.getFullYear() === date.getFullYear() &&
				rDate.getMonth() === date.getMonth() &&
				rDate.getDate() === date.getDate();
			return sameDay && cats.includes(r.category);
		});
	}, [reservationsData, date, category]);

	// Build a map: tableId → reservations on that table for this date+category
	const tableReservationMap = useMemo(() => {
		const map = new Map<string, typeof filteredReservations>();
		for (const table of tables) {
			map.set(table.id, []);
		}
		for (const res of filteredReservations) {
			for (const tableId of res.tableIds ?? []) {
				const existing = map.get(tableId);
				if (existing) existing.push(res);
			}
		}
		return map;
	}, [tables, filteredReservations]);

	// @tanstack/react-virtual row virtualizer
	// initialRect ensures rows render in jsdom (which reports 0 container height)
	const rowVirtualizer = useVirtualizer({
		count: tables.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: OVERSCAN,
		initialRect: { width: 1200, height: 600 },
	});

	// Convert reservation date + duration to pixel position within the time grid
	function reservationToPixels(startDate: Date, durationMinutes: number) {
		const minutesFromStart = (startDate.getHours() - START_HOUR) * 60 + startDate.getMinutes();
		const leftPx = (minutesFromStart / 30) * SLOT_WIDTH;
		const widthPx = (durationMinutes / 30) * SLOT_WIDTH;
		return { leftPx, widthPx };
	}

	const totalGridWidth = TABLE_LABEL_WIDTH + TOTAL_SLOTS * SLOT_WIDTH;
	const isEmpty = filteredReservations.length === 0;

	return (
		<div className="flex flex-col flex-1 overflow-hidden" data-testid="reservation-timeline-view">
			{/* Horizontal scroll wrapper */}
			<div className="overflow-x-auto flex-1" style={{ minWidth: 0 }}>
				{/* Min-width ensures grid does not collapse */}
				<div style={{ minWidth: `${totalGridWidth}px` }} className="flex flex-col flex-1">
					<TimelineHeader startHour={START_HOUR} endHour={END_HOUR} selectedDate={date} />

					{tables.length === 0 && (
						<div className="flex items-center justify-center flex-1 py-16 text-muted-foreground text-sm">
							No tables configured. Add tables in Settings to see the floor plan.
						</div>
					)}

					{tables.length > 0 && isEmpty && (
						<div className="flex items-center justify-center flex-1 py-16 text-muted-foreground text-sm">
							No reservations for this service. Tap a time slot to add one.
						</div>
					)}

					{tables.length > 0 && (
						/* Vertically scrollable container — useVirtualizer targets this ref */
						<div
							ref={scrollRef}
							className="overflow-y-auto flex-1"
							style={{ height: '100%', maxHeight: 'calc(100vh - 200px)' }}
						>
							{/* Spacer div — useVirtualizer requires a positioned container with exact total height */}
							<div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
								{rowVirtualizer.getVirtualItems().map((virtualRow) => {
									const table = tables[virtualRow.index];
									if (!table) return null;
									const rowReservations = tableReservationMap.get(table.id) ?? [];

									return (
										<div
											key={table.id}
											data-testid="timeline-row"
											style={{
												position: 'absolute',
												top: 0,
												transform: `translateY(${virtualRow.start}px)`,
												height: `${ROW_HEIGHT}px`,
												width: '100%',
											}}
											className={[
												'flex items-center border-b border-border/50',
												virtualRow.index % 2 === 0 ? 'bg-background' : 'bg-muted/30',
											].join(' ')}
										>
											{/* Table label — 120px fixed */}
											<div
												style={{ width: TABLE_LABEL_WIDTH, minWidth: TABLE_LABEL_WIDTH }}
												className="px-3 text-sm font-semibold text-foreground border-r border-border shrink-0 overflow-hidden whitespace-nowrap text-ellipsis"
											>
												{table.name}
											</div>

											{/* Time grid for this row — relative, so blocks position absolutely */}
											<div style={{ position: 'relative', flex: 1, height: '100%' }}>
												{/* Empty slot overlay cells — D-05 */}
												{Array.from({ length: TOTAL_SLOTS }, (_, slotIdx) => {
													const slotStart = new Date(date);
													slotStart.setHours(
														START_HOUR + Math.floor(slotIdx / 2),
														(slotIdx % 2) * 30,
														0,
														0,
													);
													return (
														<button
															key={slotIdx}
															type="button"
															aria-label={`Add reservation at ${slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} for ${table.name}`}
															onClick={() => { onSlotClick?.(table.id, slotStart); }}
															style={{
																position: 'absolute',
																left: `${slotIdx * SLOT_WIDTH}px`,
																width: `${SLOT_WIDTH}px`,
																height: '100%',
															}}
															className="cursor-pointer hover:bg-primary/5 focus:outline-none focus:bg-primary/5"
														/>
													);
												})}

												{/* Half-hour dividers */}
												{Array.from({ length: TOTAL_SLOTS }, (_, slotIdx) => (
													<div
														key={slotIdx}
														style={{
															position: 'absolute',
															left: `${slotIdx * SLOT_WIDTH}px`,
															height: '100%',
														}}
														className={
															slotIdx % 2 === 0
																? 'border-l border-border/30'
																: 'border-l border-dashed border-border/20'
														}
													/>
												))}

												{/* Reservation blocks */}
												{rowReservations.map((res) => {
													// res.date is a Date object (z.coerce.date() in ReservationSchema)
													const startDate =
														res.date instanceof Date ? res.date : new Date(res.date);
													const { leftPx, widthPx } = reservationToPixels(
														startDate,
														res.duration,
													);
													return (
														<TimelineBlock
															key={res.id}
															reservationId={res.id}
															guestName={res.customer.name}
															leftPx={leftPx}
															widthPx={widthPx}
															partySize={res.partySize}
															startTime={startDate.toISOString()}
															endTime={new Date(
																startDate.getTime() + res.duration * 60000,
															).toISOString()}
															onClick={onReservationClick ?? (() => {})}
														/>
													);
												})}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
