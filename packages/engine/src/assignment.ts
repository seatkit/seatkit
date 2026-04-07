import { ok, err, type Result } from '@seatkit/types';
import { addMinutes } from '@seatkit/utils/date';

import { isTableOccupied, type ReservationLike } from './availability.js';

import type { AssignmentError } from './errors.js';

export type TableLike = {
	readonly id: string;
	readonly name: string;
	readonly maxCapacity: number;
	readonly minCapacity: number;
	readonly isActive: boolean;
};

type AssignmentInput = {
	readonly date: Date;
	readonly duration: number; // minutes
	readonly partySize: number;
};

/**
 * Sort tables by priority order. Tables not in priorityOrder appear at the end
 * in their original array order.
 */
function sortByPriority(tables: readonly TableLike[], priorityOrder: readonly string[]): TableLike[] {
	return [...tables].sort((a, b) => {
		const ai = priorityOrder.indexOf(a.name);
		const bi = priorityOrder.indexOf(b.name);
		if (ai === -1 && bi === -1) return 0;
		if (ai === -1) return 1;
		if (bi === -1) return -1;
		return ai - bi;
	});
}

/**
 * Find the smallest contiguous block of tables (in priority order) whose combined
 * maxCapacity >= partySize. Returns table IDs or null if no block found.
 */
function findContiguousBlock(
	orderedTables: TableLike[],
	partySize: number,
	start: Date,
	end: Date,
	existingReservations: readonly ReservationLike[],
): string[] | null {
	for (let startIdx = 0; startIdx < orderedTables.length; startIdx++) {
		let capacity = 0;
		const block: string[] = [];
		for (let i = startIdx; i < orderedTables.length; i++) {
			const table = orderedTables[i];
			if (!table) break;
			if (isTableOccupied(table.id, start, end, existingReservations)) break; // contiguous block broken
			capacity += table.maxCapacity;
			block.push(table.id);
			if (capacity >= partySize) return block;
		}
	}
	return null;
}

/**
 * Fallback: assign tables in priority order (non-contiguous).
 * Returns table IDs or null if insufficient total capacity.
 */
function assignTablesInOrder(
	orderedTables: TableLike[],
	partySize: number,
	start: Date,
	end: Date,
	existingReservations: readonly ReservationLike[],
): string[] | null {
	let capacity = 0;
	const assigned: string[] = [];
	for (const table of orderedTables) {
		if (isTableOccupied(table.id, start, end, existingReservations)) continue;
		capacity += table.maxCapacity;
		assigned.push(table.id);
		if (capacity >= partySize) return assigned;
	}
	return null;
}

/**
 * Automatically assign tables for a reservation using contiguous-block algorithm.
 * Mirrors KoenjiApp's assignTablesPreferContiguous().
 *
 * TABLE-01: Automatic table assignment with configured priority order, preferring contiguous blocks.
 */
export function assignTables(
	reservation: AssignmentInput,
	existingReservations: readonly ReservationLike[],
	allTables: readonly TableLike[],
	priorityOrder: readonly string[],
): Result<string[], AssignmentError> {
	const activeTables = allTables.filter(t => t.isActive);
	if (activeTables.length === 0 || priorityOrder.length === 0) {
		return err({ code: 'NO_TABLES_AVAILABLE', message: 'No active tables configured' });
	}

	const totalCapacity = activeTables.reduce((sum, t) => sum + t.maxCapacity, 0);
	if (totalCapacity < reservation.partySize) {
		return err({
			code: 'INSUFFICIENT_CAPACITY',
			message: `Total capacity ${totalCapacity} is less than party size ${reservation.partySize}`,
		});
	}

	const start = reservation.date;
	const end = addMinutes(reservation.date, reservation.duration);
	const ordered = sortByPriority(activeTables, priorityOrder);

	const contiguous = findContiguousBlock(ordered, reservation.partySize, start, end, existingReservations);
	if (contiguous) return ok(contiguous);

	const fallback = assignTablesInOrder(ordered, reservation.partySize, start, end, existingReservations);
	if (fallback) return ok(fallback);

	return err({ code: 'NO_TABLES_AVAILABLE', message: 'All tables are occupied for this time window' });
}

/**
 * Manually assign tables starting from a specified table, filling contiguously.
 * Mirrors KoenjiApp's assignTablesManually(startingFrom:).
 *
 * TABLE-02: Manual override with starting table; system fills remaining tables contiguously.
 */
export function assignTablesManual(
	reservation: AssignmentInput,
	existingReservations: readonly ReservationLike[],
	allTables: readonly TableLike[],
	priorityOrder: readonly string[],
	startingTableId: string,
): Result<string[], AssignmentError> {
	const activeTables = allTables.filter(t => t.isActive);
	const ordered = sortByPriority(activeTables, priorityOrder);

	const startingTable = ordered.find(t => t.id === startingTableId);
	if (!startingTable) {
		return err({
			code: 'STARTING_TABLE_NOT_FOUND',
			message: `Starting table '${startingTableId}' not found in active tables`,
		});
	}

	const start = reservation.date;
	const end = addMinutes(reservation.date, reservation.duration);

	if (isTableOccupied(startingTableId, start, end, existingReservations)) {
		return err({
			code: 'STARTING_TABLE_OCCUPIED',
			message: `Starting table '${startingTableId}' is already occupied in this time window`,
		});
	}

	const startIdx = ordered.findIndex(t => t.id === startingTableId);
	const sliced = ordered.slice(startIdx);
	const block = findContiguousBlock(sliced, reservation.partySize, start, end, existingReservations);
	if (block) return ok(block);

	// Forced fallback: include starting table, fill remaining from full ordered list
	let capacity = startingTable.maxCapacity;
	const assigned = [startingTableId];
	for (const table of ordered) {
		if (assigned.includes(table.id)) continue;
		if (isTableOccupied(table.id, start, end, existingReservations)) continue;
		capacity += table.maxCapacity;
		assigned.push(table.id);
		if (capacity >= reservation.partySize) return ok(assigned);
	}

	return ok(assigned); // Best-effort: return what was found even if under capacity
}
