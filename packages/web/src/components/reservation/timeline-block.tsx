'use client';

import React from 'react';

import { uuidToColor } from '../../lib/uuid-color.js';

type TimelineBlockProps = Readonly<{
	reservationId: string;
	guestName: string;
	/** Start offset in pixels from the left edge of the time grid */
	leftPx: number;
	/** Block width in pixels (duration / slot_duration * slot_width) */
	widthPx: number;
	partySize: number;
	startTime: string; // ISO string
	endTime: string; // ISO string
	onClick: (reservationId: string) => void;
}>;

export function TimelineBlock({
	reservationId,
	guestName,
	leftPx,
	widthPx,
	partySize,
	startTime,
	endTime,
	onClick,
}: TimelineBlockProps) {
	const { bg, text } = uuidToColor(reservationId);

	return (
		<button
			type="button"
			data-testid="timeline-block"
			aria-label={`${guestName}, ${partySize} people, ${new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${new Date(endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
			onClick={() => { onClick(reservationId); }}
			style={{
				position: 'absolute',
				left: `${leftPx}px`,
				width: `${Math.max(widthPx, 4)}px`,
				backgroundColor: bg,
				color: text,
				top: '4px',
				height: '40px',
			}}
			className="rounded-md px-1 text-xs font-semibold overflow-hidden whitespace-nowrap text-ellipsis cursor-pointer hover:brightness-95 active:brightness-90 transition-[filter] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 min-w-[4px]"
		>
			{guestName}
		</button>
	);
}
