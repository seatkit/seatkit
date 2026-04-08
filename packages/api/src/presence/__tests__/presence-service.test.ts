/**
 * Presence Service Tests
 * Unit + integration tests for upsertPresence, deletePresence, listActivePresence, cleanupExpired.
 * Wave 0 stub — implementations in Task 03-03
 */

import { describe, it } from 'vitest';

describe('Presence Service', () => {
	// Wave 0 stub — implementations in Task 03-03

	it.todo('upsertPresence: creates a new row when session does not exist');

	it.todo('upsertPresence: updates last_heartbeat_at when called again for same session');

	it.todo('upsertPresence: updates currentReservationId and presenceState when provided');

	it.todo('deletePresence: removes the row for the given session_id');

	it.todo('listActivePresence: returns only rows where last_heartbeat_at > now() - 90s');

	it.todo('cleanupExpired: deletes rows where last_heartbeat_at < now() - 90 seconds');

	it.todo('cleanupExpired: does not delete rows with recent heartbeats');
});
