/**
 * Session Presence table schema
 * Tracks which staff members are connected and what they are viewing/editing.
 * TTL: rows expire after 90 seconds without a heartbeat (cleaned up by server interval).
 */
import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const presenceStateEnum = pgEnum('presence_state', ['viewing', 'editing']);

export const sessionPresence = pgTable('session_presence', {
	sessionId: varchar('session_id', { length: 255 }).primaryKey(),
	userId: varchar('user_id', { length: 255 }).notNull(),
	currentReservationId: uuid('current_reservation_id'),
	presenceState: presenceStateEnum('presence_state').notNull().default('viewing'),
	lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SessionPresence = typeof sessionPresence.$inferSelect;
export type NewSessionPresence = typeof sessionPresence.$inferInsert;
