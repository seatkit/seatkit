/**
 * Broadcaster unit tests — pg-listen notification → WebSocket broadcast
 *
 * Tests the notification handler in isolation using mock WebSocket clients
 * and a mock Fastify instance. No live database connection required.
 *
 * Wave 0 stub — implementations in Task 02-02/02-03
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReservationChangePayload } from '../../lib/pg-subscriber.js';

describe('pg-listen broadcaster', () => {
	it.todo('notify() sends JSON message to all OPEN WebSocket clients');

	it.todo('notify() skips clients where readyState !== 1 (CLOSED, CLOSING, CONNECTING)');

	it.todo('payload shape is { type: "reservation_changed" | "reservation_deleted", reservationId: string }');

	it.todo('createPgSubscriber asserts DATABASE_URL does not use port 6543 (transaction pooler)');
});
