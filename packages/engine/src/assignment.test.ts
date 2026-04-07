import { describe, it, expect } from 'vitest';

import { assignTables, assignTablesManual, type TableLike } from './assignment.js';

import type { ReservationLike } from './availability.js';

const makeTable = (id: string, name: string, maxCapacity = 2, isActive = true): TableLike => ({
	id,
	name,
	maxCapacity,
	minCapacity: 1,
	isActive,
});

const makeReservation = (overrides: Partial<ReservationLike> = {}): ReservationLike => ({
	id: 'existing-1',
	date: new Date('2025-01-15T19:00:00Z'),
	duration: 120,
	tableIds: ['t1'],
	status: 'confirmed',
	...overrides,
});

const baseInput = {
	date: new Date('2025-01-15T20:00:00Z'),
	duration: 90,
	partySize: 2,
};

const tables: TableLike[] = [
	makeTable('t1', 'T1'),
	makeTable('t2', 'T2'),
	makeTable('t3', 'T3'),
	makeTable('t4', 'T4'),
];

const priorityOrder = ['T1', 'T2', 'T3', 'T4'];

describe('assignTables', () => {
	it('returns ok([tableId]) when enough tables are available', () => {
		const result = assignTables(baseInput, [], tables, priorityOrder);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.length).toBeGreaterThan(0);
		}
	});

	it('prefers contiguous blocks — T1,T2 contiguous for party=4', () => {
		// All tables have 2 capacity, party=4 needs 2 tables contiguously
		const input = { ...baseInput, partySize: 4 };
		const result = assignTables(input, [], tables, priorityOrder);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toEqual(['t1', 't2']);
		}
	});

	it('falls back to non-contiguous when T1 is occupied but T2 and T3 are free', () => {
		// T1 is occupied (19:00–21:00), new reservation 20:00–21:30 overlaps with T1
		// party=4 needs 2 tables: T1 unavailable → should assign T2+T3 (contiguous starting from T2)
		const existing = [makeReservation({ tableIds: ['t1'] })];
		const input = { ...baseInput, partySize: 4 };
		const result = assignTables(input, existing, tables, priorityOrder);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).not.toContain('t1');
			expect(result.value.length).toBe(2);
		}
	});

	it('returns err with code NO_TABLES_AVAILABLE when all tables are occupied', () => {
		const existing = [
			makeReservation({ id: 'r1', tableIds: ['t1'] }),
			makeReservation({ id: 'r2', tableIds: ['t2'] }),
			makeReservation({ id: 'r3', tableIds: ['t3'] }),
			makeReservation({ id: 'r4', tableIds: ['t4'] }),
		];
		const result = assignTables(baseInput, existing, tables, priorityOrder);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('NO_TABLES_AVAILABLE');
		}
	});

	it('returns err with code INSUFFICIENT_CAPACITY when party exceeds total capacity', () => {
		// 4 tables × 2 capacity = 8 total; party=10 exceeds total
		const input = { ...baseInput, partySize: 10 };
		const result = assignTables(input, [], tables, priorityOrder);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('INSUFFICIENT_CAPACITY');
		}
	});

	it('returns err with code NO_TABLES_AVAILABLE when no active tables', () => {
		const inactiveTables = tables.map(t => ({ ...t, isActive: false }));
		const result = assignTables(baseInput, [], inactiveTables, priorityOrder);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('NO_TABLES_AVAILABLE');
		}
	});
});

describe('assignTablesManual', () => {
	it('starts from the specified table and fills contiguously', () => {
		// Start from T2 (id=t2), party=4, should assign t2+t3
		const input = { ...baseInput, partySize: 4 };
		const result = assignTablesManual(input, [], tables, priorityOrder, 't2');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value[0]).toBe('t2');
		}
	});

	it('returns err with code STARTING_TABLE_NOT_FOUND when startingTableId not in tables', () => {
		const result = assignTablesManual(baseInput, [], tables, priorityOrder, 'nonexistent-id');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('STARTING_TABLE_NOT_FOUND');
		}
	});

	it('returns err with code STARTING_TABLE_OCCUPIED when starting table is already occupied', () => {
		// t1 is occupied during the new reservation window
		const existing = [makeReservation({ tableIds: ['t1'] })];
		const result = assignTablesManual(baseInput, existing, tables, priorityOrder, 't1');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe('STARTING_TABLE_OCCUPIED');
		}
	});
});
