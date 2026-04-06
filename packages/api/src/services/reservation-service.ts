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
import { eq, and, gte, lte, ne } from 'drizzle-orm';

import { db } from '../db/index.js';
import { reservations, tables, restaurantSettings } from '../db/schema/index.js';

import type { Reservation } from '../db/schema/reservations.js';
import type { CreateReservation, UpdateReservation } from '@seatkit/types';
import type { FastifyInstance } from 'fastify';

// ── createReservation ────────────────────────────────────────────────────────

export async function createReservation(
	input: CreateReservation,
	fastify: FastifyInstance,
): Promise<Reservation> {
	// 1. Fetch all active tables and priority order from DB
	const [allTables, settings] = await Promise.all([
		db.select().from(tables).where(eq(tables.isActive, true)),
		db.select().from(restaurantSettings).limit(1),
	]);

	if (!settings[0]) {
		throw fastify.httpErrors.internalServerError(
			'Restaurant settings not configured. Run db:seed first.',
		);
	}

	// 2. Fetch existing reservations that overlap with the new reservation's date
	//    (query all reservations for that calendar day — engine does the exact overlap check)
	const reservationDate = input.date instanceof Date ? input.date : new Date(input.date);
	const dayStart = new Date(reservationDate);
	dayStart.setUTCHours(0, 0, 0, 0);
	const dayEnd = new Date(reservationDate);
	dayEnd.setUTCHours(23, 59, 59, 999);

	const existingReservations = await db
		.select()
		.from(reservations)
		.where(and(gte(reservations.date, dayStart), lte(reservations.date, dayEnd)));

	// 3. Classify reservation type (walk_in vs inAdvance) — RES-05
	const creationTime = new Date();
	const classifiedType = classifyReservationType(
		creationTime,
		reservationDate,
		reservationDate, // reservationDate IS the start time (date+time combined)
		// Map DB category to classification type for existing value preservation
		input.category === 'walk_in' ? 'walk_in' : undefined,
	);

	// Map classification back to reservation category:
	// Only override to 'walk_in' if the engine classifies as walk_in.
	// 'inAdvance' and 'waitingList' keep the caller's original category.
	const resolvedCategory =
		classifiedType === 'walk_in' ? 'walk_in' : input.category;

	// 4. Assign tables — automatic or manual
	const reservationInput = {
		date: reservationDate,
		duration: input.duration,
		partySize: input.partySize,
	};

	const existingForEngine = existingReservations.map(r => ({
		id: r.id,
		date: r.date,
		duration: r.duration,
		tableIds: r.tableIds ?? null,
		status: r.status,
	}));

	const allTablesForEngine = allTables.map(t => ({
		id: t.id,
		name: t.name,
		maxCapacity: t.maxCapacity,
		minCapacity: t.minCapacity,
		isActive: t.isActive,
	}));

	let assignedTableIds: string[];

	if (input.tableIds && input.tableIds.length > 0) {
		// Manual override: first tableId is the starting table (TABLE-02)
		const startingTableId = input.tableIds[0];
		if (!startingTableId) {
			throw fastify.httpErrors.badRequest('tableIds array is empty');
		}
		const result = assignTablesManual(
			reservationInput,
			existingForEngine,
			allTablesForEngine,
			settings[0].priorityOrder,
			startingTableId,
		);
		if (isErr(result)) {
			throw fastify.httpErrors.conflict(result.error.message);
		}
		assignedTableIds = result.value;
	} else {
		// Automatic assignment (TABLE-01)
		const result = assignTables(
			reservationInput,
			existingForEngine,
			allTablesForEngine,
			settings[0].priorityOrder,
		);
		if (isErr(result)) {
			throw fastify.httpErrors.conflict(result.error.message);
		}
		assignedTableIds = result.value;
	}

	// 5. Insert reservation with assigned tables and classified category
	// Explicit field mapping avoids spreading undefined values — required by exactOptionalPropertyTypes.
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

// ── updateReservation ────────────────────────────────────────────────────────

export async function updateReservation(
	id: string,
	input: Omit<UpdateReservation, 'id' | 'updatedAt'>,
	fastify: FastifyInstance,
): Promise<Reservation> {
	// 1. Check existing reservation
	const [existing] = await db
		.select()
		.from(reservations)
		.where(eq(reservations.id, id))
		.limit(1);

	if (!existing) {
		throw fastify.httpErrors.notFound('Reservation not found');
	}

	// 2. If partySize, date, duration, or tableIds changed — re-run table assignment
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

		const updatedDate = input.date
			? (input.date instanceof Date ? input.date : new Date(input.date))
			: existing.date;
		const updatedDuration = input.duration ?? existing.duration;
		const updatedPartySize = input.partySize ?? existing.partySize;

		const dayStart = new Date(updatedDate);
		dayStart.setUTCHours(0, 0, 0, 0);
		const dayEnd = new Date(updatedDate);
		dayEnd.setUTCHours(23, 59, 59, 999);

		const existingReservations = await db
			.select()
			.from(reservations)
			.where(
				and(
					gte(reservations.date, dayStart),
					lte(reservations.date, dayEnd),
					ne(reservations.id, id), // exclude the reservation being updated
				),
			);

		const existingForEngine = existingReservations.map(r => ({
			id: r.id,
			date: r.date,
			duration: r.duration,
			tableIds: r.tableIds ?? null,
			status: r.status,
		}));

		const allTablesForEngine = allTables.map(t => ({
			id: t.id,
			name: t.name,
			maxCapacity: t.maxCapacity,
			minCapacity: t.minCapacity,
			isActive: t.isActive,
		}));

		const reservationInput = {
			date: updatedDate,
			duration: updatedDuration,
			partySize: updatedPartySize,
		};

		if (input.tableIds && input.tableIds.length > 0) {
			const startingTableId = input.tableIds[0];
			if (!startingTableId) {
				throw fastify.httpErrors.badRequest('tableIds array is empty');
			}
			const result = assignTablesManual(
				reservationInput,
				existingForEngine,
				allTablesForEngine,
				settings[0].priorityOrder,
				startingTableId,
			);
			if (isErr(result)) {
				throw fastify.httpErrors.conflict(result.error.message);
			}
			resolvedTableIds = result.value;
		} else {
			const result = assignTables(
				reservationInput,
				existingForEngine,
				allTablesForEngine,
				settings[0].priorityOrder,
			);
			if (isErr(result)) {
				throw fastify.httpErrors.conflict(result.error.message);
			}
			resolvedTableIds = result.value;
		}
	}

	// 3. Build update payload — only include explicitly provided fields
	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
		tableIds: resolvedTableIds,
	};

	if (input.date !== undefined) {
		updateData['date'] = input.date instanceof Date ? input.date : new Date(input.date as string);
	}
	if (input.partySize !== undefined) updateData['partySize'] = input.partySize;
	if (input.duration !== undefined) updateData['duration'] = input.duration;
	if (input.category !== undefined) updateData['category'] = input.category;
	if (input.status !== undefined) updateData['status'] = input.status;
	if (input.notes !== undefined) updateData['notes'] = input.notes;
	if (input.tags !== undefined) updateData['tags'] = input.tags;
	if (input.customer !== undefined) updateData['customer'] = input.customer;
	if (input.confirmedAt !== undefined) {
		updateData['confirmedAt'] =
			input.confirmedAt instanceof Date
				? input.confirmedAt
				: input.confirmedAt !== null
					? new Date(input.confirmedAt as string)
					: null;
	}

	const [updated] = await db
		.update(reservations)
		.set(updateData)
		.where(eq(reservations.id, id))
		.returning();

	if (!updated) {
		throw fastify.httpErrors.internalServerError('Failed to update reservation');
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
