'use client';

import React from 'react';

// SLOT_WIDTH must match constants used in ReservationTimelineView
const SLOT_WIDTH = 40; // px per 15-min slot
const SLOTS_PER_HOUR = 4;

type TimelineHeaderProps = Readonly<{
	/** Operating hours to display: e.g., startHour=9, endHour=23 → 9am to 11pm */
	startHour: number;
	endHour: number;
	/** The date being viewed — used to compute Now indicator position */
	selectedDate: Date;
}>;

export function TimelineHeader({ startHour, endHour, selectedDate }: TimelineHeaderProps) {
	const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

	const now = new Date();
	const isToday =
		now.getFullYear() === selectedDate.getFullYear() &&
		now.getMonth() === selectedDate.getMonth() &&
		now.getDate() === selectedDate.getDate();

	// Compute "Now" indicator left offset
	const nowOffsetPx = isToday
		? (() => {
				const minutesSinceStart = (now.getHours() - startHour) * 60 + now.getMinutes();
				return (minutesSinceStart / 15) * SLOT_WIDTH;
			})()
		: null;

	return (
		<div
			className="sticky top-0 z-20 bg-background border-b border-border shrink-0"
			style={{
				height: '32px',
				minWidth: `${(endHour - startHour) * SLOTS_PER_HOUR * SLOT_WIDTH}px`,
			}}
		>
			{/* Time slots */}
			<div className="relative" style={{ width: '100%', height: '100%' }}>
				{hours.map((hour) => (
					<div
						key={hour}
						style={{
							position: 'absolute',
							left: `${(hour - startHour) * SLOTS_PER_HOUR * SLOT_WIDTH}px`,
							width: `${SLOTS_PER_HOUR * SLOT_WIDTH}px`,
						}}
						className="h-full flex items-end pb-1"
					>
						<span className="text-xs text-muted-foreground pl-1">
							{String(hour).padStart(2, '0')}:00
						</span>
						{/* Half-hour label */}
						<span
							style={{ position: 'absolute', left: `${2 * SLOT_WIDTH}px`, bottom: '4px' }}
							className="text-xs text-muted-foreground/50 pl-1"
						>
							:30
						</span>
					</div>
				))}

				{/* "Now" vertical indicator */}
				{nowOffsetPx !== null && (
					<div
						style={{ position: 'absolute', left: `${nowOffsetPx}px` }}
						className="h-full flex flex-col items-center pointer-events-none"
					>
						<div className="w-2 h-2 rounded-full bg-amber-400 -mt-1" />
						<div className="flex-1 border-l-2 border-amber-400" />
						<span className="text-[10px] text-amber-500 font-medium -mb-4">Now</span>
					</div>
				)}
			</div>
		</div>
	);
}
