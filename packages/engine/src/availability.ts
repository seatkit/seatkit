import { addMinutes } from '@seatkit/utils/date';

/** Two time windows overlap if start1 < end2 AND start2 < end1 (strict — back-to-back is NOT overlap) */
export function overlaps(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
	return start1 < end2 && start2 < end1;
}

/**
 * ReservationLike: minimal shape needed for availability checking.
 * Use this to avoid importing the full Reservation type (engine is pure data-in/data-out).
 */
export type ReservationLike = {
	readonly id: string;
	readonly date: Date;
	readonly duration: number; // minutes
	readonly tableIds: readonly string[] | null;
	readonly status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
};

/**
 * Returns true if the given table is occupied during [start, end) by any active reservation.
 * Skips cancelled, no_show, and completed reservations. Skips reservations with null or empty tableIds.
 */
export function isTableOccupied(
	tableId: string,
	start: Date,
	end: Date,
	reservations: readonly ReservationLike[],
): boolean {
	return reservations.some(r => {
		if (r.status === 'cancelled' || r.status === 'no_show' || r.status === 'completed') return false;
		if (!r.tableIds || !r.tableIds.includes(tableId)) return false;
		const rEnd = addMinutes(r.date, r.duration);
		return overlaps(r.date, rEnd, start, end);
	});
}
