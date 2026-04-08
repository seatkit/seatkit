/**
 * Session Presence Service
 * Manages the session_presence table: upsert on heartbeat/state-change, delete on disconnect.
 * Cleanup interval (external) calls cleanupExpired() every 30 seconds.
 */
import { eq, sql } from 'drizzle-orm';

import { db } from '../db/index.js';
import { sessionPresence } from '../db/schema/session-presence.js';

import type { SessionPresence } from '../db/schema/session-presence.js';

export type PresenceState = 'viewing' | 'editing';

/**
 * Upsert a presence row for the given session.
 * Always refreshes lastHeartbeatAt. Updates reservationId and state when provided.
 */
export async function upsertPresence(
	sessionId: string,
	userId: string,
	reservationId: string | null,
	state: PresenceState,
): Promise<void> {
	await db
		.insert(sessionPresence)
		.values({
			sessionId,
			userId,
			currentReservationId: reservationId,
			presenceState: state,
			lastHeartbeatAt: new Date(),
		})
		.onConflictDoUpdate({
			target: sessionPresence.sessionId,
			set: {
				userId,
				currentReservationId: reservationId,
				presenceState: state,
				lastHeartbeatAt: new Date(),
			},
		});
}

/**
 * Delete the presence row for a session (called on WebSocket close).
 */
export async function deletePresence(sessionId: string): Promise<void> {
	await db.delete(sessionPresence).where(eq(sessionPresence.sessionId, sessionId));
}

/**
 * Return all active presence rows.
 * Expired rows are removed by cleanupExpired() — this function returns whatever is in the table.
 */
export async function listActivePresence(): Promise<SessionPresence[]> {
	return db.select().from(sessionPresence);
}

/**
 * Delete presence rows where last_heartbeat_at is older than 90 seconds.
 * Called by a Fastify setInterval every 30 seconds (D-13).
 * Returns the number of rows deleted.
 */
export async function cleanupExpired(): Promise<number> {
	const result = await db
		.delete(sessionPresence)
		.where(sql`${sessionPresence.lastHeartbeatAt} < now() - interval '90 seconds'`)
		.returning({ sessionId: sessionPresence.sessionId });
	return result.length;
}
