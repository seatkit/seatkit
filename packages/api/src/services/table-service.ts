/**
 * Table service
 * DB queries for table data. Availability computed from reservations (not stored status).
 */

import { isTableOccupied } from '@seatkit/engine';
import { addMinutes } from '@seatkit/utils';
import { eq, and, gte, lte } from 'drizzle-orm';


import { db } from '../db/index.js';
import { tables, reservations } from '../db/schema/index.js';

import type { TableRecord } from '../db/schema/tables.js';
import type { FastifyInstance } from 'fastify';

// ── getTables ────────────────────────────────────────────────────────────────

/**
 * Return all active tables in the database.
 */
export async function getTables(): Promise<TableRecord[]> {
	return db.select().from(tables).where(eq(tables.isActive, true));
}

// ── getAvailableTables ───────────────────────────────────────────────────────

/**
 * Return tables that are NOT occupied during [start, start+durationMinutes).
 * Uses the engine's isTableOccupied() to compute availability from reservations.
 */
export async function getAvailableTables(
	start: Date,
	durationMinutes: number,
	_fastify: FastifyInstance,
): Promise<TableRecord[]> {
	const end = addMinutes(start, durationMinutes);

	// Query active tables and reservations for the same day
	const dayStart = new Date(start);
	dayStart.setUTCHours(0, 0, 0, 0);
	const dayEnd = new Date(start);
	dayEnd.setUTCHours(23, 59, 59, 999);

	const [allTables, dayReservations] = await Promise.all([
		db.select().from(tables).where(eq(tables.isActive, true)),
		db
			.select()
			.from(reservations)
			.where(and(gte(reservations.date, dayStart), lte(reservations.date, dayEnd))),
	]);

	const reservationsForEngine = dayReservations.map(r => ({
		id: r.id,
		date: r.date,
		duration: r.duration,
		tableIds: r.tableIds ?? null,
		status: r.status,
	}));

	return allTables.filter(
		table => !isTableOccupied(table.id, start, end, reservationsForEngine),
	);
}

// ── createTable ──────────────────────────────────────────────────────────────

export interface CreateTableInput {
	name: string;
	maxCapacity: number;
	minCapacity?: number;
	positionX?: number | null;
	positionY?: number | null;
}

export async function createTable(input: CreateTableInput): Promise<TableRecord> {
	const [created] = await db
		.insert(tables)
		.values({
			name: input.name,
			maxCapacity: input.maxCapacity,
			minCapacity: input.minCapacity ?? 1,
			positionX: input.positionX ?? null,
			positionY: input.positionY ?? null,
			isActive: true,
		})
		.returning();
	if (!created) throw new Error('Failed to insert table');
	return created;
}

// ── updateTable ──────────────────────────────────────────────────────────────

export interface UpdateTableInput {
	name?: string;
	maxCapacity?: number;
	minCapacity?: number;
	positionX?: number | null;
	positionY?: number | null;
}

export async function updateTable(
	id: string,
	input: UpdateTableInput,
): Promise<TableRecord | undefined> {
	const [updated] = await db
		.update(tables)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(tables.id, id))
		.returning();
	return updated;
}

// ── deactivateTable ───────────────────────────────────────────────────────────

export async function deactivateTable(id: string): Promise<TableRecord | undefined> {
	const [deactivated] = await db
		.update(tables)
		.set({ isActive: false, updatedAt: new Date() })
		.where(eq(tables.id, id))
		.returning();
	return deactivated;
}
