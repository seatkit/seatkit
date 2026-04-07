/**
 * Canonical seed data for a Koenji-style restaurant layout.
 * Shared between the db:seed script and integration test setup.
 */

export const TABLE_DATA = [
	{ name: 'T1', maxCapacity: 2, minCapacity: 1, positionX: 14, positionY: 1 },
	{ name: 'T2', maxCapacity: 2, minCapacity: 1, positionX: 10, positionY: 1 },
	{ name: 'T3', maxCapacity: 2, minCapacity: 1, positionX: 6, positionY: 1 },
	{ name: 'T4', maxCapacity: 2, minCapacity: 1, positionX: 1, positionY: 1 },
	{ name: 'T5', maxCapacity: 2, minCapacity: 1, positionX: 7, positionY: 8 },
	{ name: 'T6', maxCapacity: 2, minCapacity: 1, positionX: 1, positionY: 6 },
	{ name: 'T7', maxCapacity: 2, minCapacity: 1, positionX: 1, positionY: 11 },
] as const;

export const DEFAULT_PRIORITY_ORDER = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;
