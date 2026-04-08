/**
 * Reservation service
 * Orchestrates: fetch data from DB → call engine → write results back.
 * Routes delegate here; no business logic lives in route handlers.
 */

import {
	assignTables,
	assignTablesManual,
	classifyReservationType,
} from '@seatkit/engine';
import { isErr } from '@seatkit/types';
import { eq, and, gte, lte, ne, sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { reservations, tables, restaurantSettings } from '../db/schema/index.js';

import type { Reservation } from '../db/schema/reservations.js';
import type { TableRecord } from '../db/schema/tables.js';
import type { CreateReservation, UpdateReservation } from '@seatkit/types';
import type { FastifyInstance } from 'fastify';

// ── helpers ──────────────────────────────────────────────────────────────────

function coerceDate(value: Date | string): Date {
	return value instanceof Date ? value : new Date(value);
}

function coerceDateOrNull(value: Date | string | null): Date | null {
	if (value === null) return null;
	return value instanceof Date ? value : new Date(value);
}

function toDayRange(date: Date): { dayStart: Date; dayEnd: Date } {
	const dayStart = new Date(date);
	dayStart.setUTCHours(0, 0, 0, 0);
	const dayEnd = new Date(date);
	dayEnd.setUTCHours(23, 59, 59, 999);
	return { dayStart, dayEnd };
}

function toEngineReservation(r: Reservation) {
	return {
		id: r.id,
		date: r.date,
		duration: r.duration,
		tableIds: r.tableIds ?? null,
		status: r.status,
	};
}

function toEngineTable(t: TableRecord) {
	return {
		id: t.id,
		name: t.name,
		maxCapacity: t.maxCapacity,
		minCapacity: t.minCapacity,
		isActive: t.isActive,
	};
}

/**
 * Runs automatic or manual table assignment, throwing HTTP errors on failure.
 * Pass `startingTableId` to trigger manual assignment (TABLE-02); omit for automatic (TABLE-01).
 */
async function resolveAssignment(
	reservationInput: { date: Date; duration: number; partySize: number },
	existingReservations: Reservation[],
	allTables: TableRecord[],
	priorityOrder: string[],
	startingTableId: string | undefined,
	fastify: FastifyInstance,
): Promise<string[]> {
	const existingForEngine = existingReservations.map(toEngineReservation);
	const allTablesForEngine = allTables.map(toEngineTable);

	if (startingTableId !== undefined) {
		const result = assignTablesManual(
			reservationInput,
			existingForEngine,
			allTablesForEngine,
			priorityOrder,
			startingTableId,
		);
		if (isErr(result)) {
			throw fastify.httpErrors.conflict(result.error.message);
		}
		return result.value;
	}

	const result = assignTables(
		reservationInput,
		existingForEngine,
		allTablesForEngine,
		priorityOrder,
	);
	if (isErr(result)) {
		throw fastify.httpErrors.conflict(result.error.message);
	}
	return result.value;
}

function buildUpdatePayload(
	input: Omit<UpdateReservation, 'id' | 'updatedAt'>,
	resolvedTableIds: string[] | null,
): Record<string, unknown> {
	const data: Record<string, unknown> = {
		updatedAt: new Date(),
		tableIds: resolvedTableIds,
	};

	if (input.date !== undefined) data['date'] = coerceDate(input.date);
	if (input.partySize !== undefined) data['partySize'] = input.partySize;
	if (input.duration !== undefined) data['duration'] = input.duration;
	if (input.category !== undefined) data['category'] = input.category;
	if (input.status !== undefined) data['status'] = input.status;
	if (input.notes !== undefined) data['notes'] = input.notes;
	if (input.tags !== undefined) data['tags'] = input.tags;
	if (input.customer !== undefined) data['customer'] = input.customer;
	if (input.source !== undefined) data['source'] = input.source;
	if (input.cancelledBy !== undefined) data['cancelledBy'] = input.cancelledBy;
	if (input.cancellationReason !== undefined) data['cancellationReason'] = input.cancellationReason;

	for (const field of ['confirmedAt', 'seatedAt', 'cancelledAt', 'completedAt'] as const) {
		const val = input[field];
		if (val !== undefined) data[field] = coerceDateOrNull(val);
	}

	return data;
}

// ── createReservation ────────────────────────────────────────────────────────

export async function createReservation(
	input: CreateReservation,
	fastify: FastifyInstance,
): Promise<Reservation> {
	const reservationDate = coerceDate(input.date);
	const { dayStart, dayEnd } = toDayRange(reservationDate);

	const [allTables, settings, existingReservations] = await Promise.all([
		db.select().from(tables).where(eq(tables.isActive, true)),
		db.select().from(restaurantSettings).limit(1),
		db
			.select()
			.from(reservations)
			.where(and(gte(reservations.date, dayStart), lte(reservations.date, dayEnd))),
	]);

	if (!settings[0]) {
		throw fastify.httpErrors.internalServerError(
			'Restaurant settings not configured. Run db:seed first.',
		);
	}

	// Classify reservation type (walk_in vs inAdvance) — RES-05
	const classifiedType = classifyReservationType(
		new Date(),
		reservationDate,
		reservationDate,
		input.category === 'walk_in' ? 'walk_in' : undefined,
	);
	// Only override to walk_in if the engine classifies as such; keep caller's category otherwise
	const resolvedCategory = classifiedType === 'walk_in' ? 'walk_in' : input.category;

	const assignedTableIds = await resolveAssignment(
		{ date: reservationDate, duration: input.duration, partySize: input.partySize },
		existingReservations,
		allTables,
		settings[0].priorityOrder,
		input.tableIds?.[0],
		fastify,
	);

	// Explicit field mapping avoids spreading undefined values — required by exactOptionalPropertyTypes
	const [created] = await db
		.insert(reservations)
		.values({
			date: reservationDate,
			duration: input.duration,
			customer: input.customer,
			partySize: input.partySize,
			createdBy: input.createdBy,
			status: input.status ?? 'pending',
			category: resolvedCategory,
			tableIds: assignedTableIds,
			...(input.notes !== undefined && { notes: input.notes }),
			...(input.tags !== undefined && { tags: input.tags }),
			...(input.source !== undefined && { source: input.source }),
		})
		.returning();

	if (!created) {
		throw fastify.httpErrors.internalServerError('Failed to create reservation');
	}

	return created;
}

// ── VersionConflictError ─────────────────────────────────────────────────────

/**
 * Sentinel error thrown by updateReservation when the client's versionId does
 * not match the current database version (optimistic locking conflict — COLLAB-03).
 * The route handler converts this to a 409 response with the current server state.
 */
export class VersionConflictError extends Error {
	readonly current: Reservation;

	constructor(current: Reservation) {
		super('VERSION_CONFLICT');
		this.name = 'VersionConflictError';
		this.current = current;
	}
}

// ── updateReservation ────────────────────────────────────────────────────────

export async function updateReservation(
	id: string,
	clientVersion: number,
	input: Omit<UpdateReservation, 'id' | 'updatedAt'>,
	fastify: FastifyInstance,
): Promise<Reservation> {
	// Fetch the existing reservation to determine table reassignment needs.
	// We do this first so we have the current state before attempting the atomic update.
	const [existing] = await db
		.select()
		.from(reservations)
		.where(eq(reservations.id, id))
		.limit(1);

	if (!existing) {
		throw fastify.httpErrors.notFound('Reservation not found');
	}

	const needsReassignment =
		(input.partySize !== undefined && input.partySize !== existing.partySize) ||
		input.date !== undefined ||
		(input.duration !== undefined && input.duration !== existing.duration) ||
		input.tableIds !== undefined;

	let resolvedTableIds = existing.tableIds;

	if (needsReassignment) {
		const [allTables, settings] = await Promise.all([
			db.select().from(tables).where(eq(tables.isActive, true)),
			db.select().from(restaurantSettings).limit(1),
		]);

		if (!settings[0]) {
			throw fastify.httpErrors.internalServerError('Restaurant settings not configured');
		}

		const updatedDate = input.date === undefined ? existing.date : coerceDate(input.date);
		const updatedDuration = input.duration ?? existing.duration;
		const updatedPartySize = input.partySize ?? existing.partySize;

		const { dayStart, dayEnd } = toDayRange(updatedDate);
		const existingReservations = await db
			.select()
			.from(reservations)
			.where(
				and(
					gte(reservations.date, dayStart),
					lte(reservations.date, dayEnd),
					ne(reservations.id, id),
				),
			);

		resolvedTableIds = await resolveAssignment(
			{ date: updatedDate, duration: updatedDuration, partySize: updatedPartySize },
			existingReservations,
			allTables,
			settings[0].priorityOrder,
			input.tableIds?.[0],
			fastify,
		);
	}

	// Atomic update: only succeeds when version matches clientVersion.
	// On match: increments version and writes changes.
	// On mismatch: returns undefined (no rows updated) — no partial writes.
	const [updated] = await db
		.update(reservations)
		.set({
			...buildUpdatePayload(input, resolvedTableIds),
			version: sql`${reservations.version} + 1`,
		})
		.where(
			and(
				eq(reservations.id, id),
				eq(reservations.version, clientVersion),
			),
		)
		.returning();

	if (!updated) {
		// Row exists (we fetched it above) but version did not match — conflict.
		// Re-fetch current state so the 409 response body contains fresh data.
		const [current] = await db
			.select()
			.from(reservations)
			.where(eq(reservations.id, id))
			.limit(1);

		if (!current) {
			// Race: reservation was deleted between our fetch and the update attempt.
			throw fastify.httpErrors.notFound('Reservation not found');
		}

		throw new VersionConflictError(current);
	}

	return updated;
}

// ── deleteReservation ────────────────────────────────────────────────────────

export async function deleteReservation(
	id: string,
	fastify: FastifyInstance,
): Promise<Reservation> {
	const [existing] = await db
		.select()
		.from(reservations)
		.where(eq(reservations.id, id))
		.limit(1);

	if (!existing) {
		throw fastify.httpErrors.notFound('Reservation not found');
	}

	const [deleted] = await db
		.delete(reservations)
		.where(eq(reservations.id, id))
		.returning();

	if (!deleted) {
		throw fastify.httpErrors.internalServerError('Failed to delete reservation');
	}

	return deleted;
}
