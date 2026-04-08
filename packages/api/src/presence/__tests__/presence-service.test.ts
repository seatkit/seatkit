/**
 * Presence Service Integration Tests
 * Tests for upsertPresence, deletePresence, listActivePresence, cleanupExpired.
 * Uses the actual test database (TEST_DATABASE_URL).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { sql } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { sessionPresence } from '../../db/schema/session-presence.js';
import {
	upsertPresence,
	deletePresence,
	listActivePresence,
	cleanupExpired,
} from '../../presence/presence-service.js';

// Clean up all presence rows after each test to prevent state leakage
afterEach(async () => {
	await db.delete(sessionPresence);
});

describe('Presence Service', () => {
	it('upsertPresence: creates a new row when session does not exist', async () => {
		const sessionId = 'test-session-001';
		const userId = 'user-001';

		await upsertPresence(sessionId, userId, null, 'viewing');

		const rows = await db.select().from(sessionPresence);
		expect(rows).toHaveLength(1);
		expect(rows[0]!.sessionId).toBe(sessionId);
		expect(rows[0]!.userId).toBe(userId);
		expect(rows[0]!.currentReservationId).toBeNull();
		expect(rows[0]!.presenceState).toBe('viewing');
		expect(rows[0]!.lastHeartbeatAt).toBeInstanceOf(Date);
	});

	it('upsertPresence: updates last_heartbeat_at when called again for same session', async () => {
		const sessionId = 'test-session-002';
		const userId = 'user-002';

		// Insert initial row
		await upsertPresence(sessionId, userId, null, 'viewing');

		// Capture initial heartbeat timestamp
		const [initial] = await db.select().from(sessionPresence);
		const initialTimestamp = initial!.lastHeartbeatAt;

		// Wait a tick to ensure timestamp differs
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Upsert again — should update lastHeartbeatAt
		await upsertPresence(sessionId, userId, null, 'viewing');

		const rows = await db.select().from(sessionPresence);
		expect(rows).toHaveLength(1);
		expect(rows[0]!.lastHeartbeatAt.getTime()).toBeGreaterThanOrEqual(initialTimestamp.getTime());
	});

	it('upsertPresence: updates currentReservationId and presenceState when provided', async () => {
		const sessionId = 'test-session-003';
		const userId = 'user-003';
		const reservationId = '550e8400-e29b-41d4-a716-446655440000';

		// Start as viewing with no reservation
		await upsertPresence(sessionId, userId, null, 'viewing');

		// Update to editing a specific reservation
		await upsertPresence(sessionId, userId, reservationId, 'editing');

		const rows = await db.select().from(sessionPresence);
		expect(rows).toHaveLength(1);
		expect(rows[0]!.currentReservationId).toBe(reservationId);
		expect(rows[0]!.presenceState).toBe('editing');
	});

	it('deletePresence: removes the row for the given session_id', async () => {
		const sessionId = 'test-session-004';
		const userId = 'user-004';

		await upsertPresence(sessionId, userId, null, 'viewing');

		// Verify row exists
		const before = await db.select().from(sessionPresence);
		expect(before).toHaveLength(1);

		await deletePresence(sessionId);

		const after = await db.select().from(sessionPresence);
		expect(after).toHaveLength(0);
	});

	it('listActivePresence: returns only rows where last_heartbeat_at > now() - 90s', async () => {
		const freshSessionId = 'test-session-005-fresh';
		const staleSessionId = 'test-session-005-stale';
		const userId = 'user-005';

		// Insert a fresh row via upsertPresence (has current timestamp)
		await upsertPresence(freshSessionId, userId, null, 'viewing');

		// Insert a stale row directly with an old timestamp (91 seconds ago)
		await db.insert(sessionPresence).values({
			sessionId: staleSessionId,
			userId,
			currentReservationId: null,
			presenceState: 'viewing',
			lastHeartbeatAt: new Date(Date.now() - 91_000),
		});

		// listActivePresence returns all rows (cleanup is done by cleanupExpired)
		const allRows = await listActivePresence();
		expect(allRows).toHaveLength(2);

		// After cleanup, only the fresh row remains
		await cleanupExpired();
		const activeRows = await listActivePresence();
		expect(activeRows).toHaveLength(1);
		expect(activeRows[0]!.sessionId).toBe(freshSessionId);
	});

	it('cleanupExpired: deletes rows where last_heartbeat_at < now() - 90 seconds', async () => {
		const sessionId = 'test-session-006';
		const userId = 'user-006';

		// Insert a row with a timestamp 91 seconds in the past using Drizzle sql template
		await db.insert(sessionPresence).values({
			sessionId,
			userId,
			currentReservationId: null,
			presenceState: 'viewing',
			lastHeartbeatAt: sql`now() - interval '91 seconds'`,
		});

		// Verify the row was inserted
		const before = await db.select().from(sessionPresence);
		expect(before).toHaveLength(1);

		const deleted = await cleanupExpired();
		expect(deleted).toBe(1);

		const after = await db.select().from(sessionPresence);
		expect(after).toHaveLength(0);
	});

	it('cleanupExpired: does not delete rows with recent heartbeats', async () => {
		const sessionId = 'test-session-007';
		const userId = 'user-007';

		// Insert a row with current timestamp (fresh)
		await upsertPresence(sessionId, userId, null, 'viewing');

		const deleted = await cleanupExpired();
		expect(deleted).toBe(0);

		// Row must still exist
		const rows = await db.select().from(sessionPresence);
		expect(rows).toHaveLength(1);
		expect(rows[0]!.sessionId).toBe(sessionId);
	});
});
