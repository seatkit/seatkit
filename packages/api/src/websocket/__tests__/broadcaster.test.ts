/**
 * Broadcaster unit tests — pg-listen notification → WebSocket broadcast
 *
 * Tests the notification handler in isolation using mock WebSocket clients
 * and a mock Fastify instance. No live database connection required.
 *
 * The port 6543 assertion test calls createPgSubscriber directly — the guard
 * fires synchronously before any network connection attempt, so no DB needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
// Import the module under test after mocking pg-listen
import { createPgSubscriber, type ReservationChangePayload } from '../../lib/pg-subscriber.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockWebSocket = {
	readyState: number;
	send: ReturnType<typeof vi.fn>;
};

function makeMockClient(readyState: number): MockWebSocket {
	return { readyState, send: vi.fn() };
}

// Build a minimal mock fastify instance sufficient for createPgSubscriber
function makeMockFastify(clients: Set<MockWebSocket>) {
	return {
		log: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		},
		websocketServer: {
			clients,
		},
	} as unknown as FastifyInstance;
}

// ---------------------------------------------------------------------------
// Mock pg-listen so tests never touch the network
// ---------------------------------------------------------------------------

// We capture the notifications.on callback so we can invoke it directly
type NotificationHandler = (payload: ReservationChangePayload) => void;

let capturedHandler: NotificationHandler | null = null;

vi.mock('pg-listen', () => {
	return {
		default: vi.fn(() => {
			const subscribers: Record<string, NotificationHandler[]> = {};
			return {
				events: {
					on: vi.fn(),
				},
				notifications: {
					on: vi.fn((channel: string, handler: NotificationHandler) => {
						subscribers[channel] = subscribers[channel] ?? [];
						subscribers[channel].push(handler);
						// Expose for tests
						capturedHandler = handler;
					}),
				},
				connect: vi.fn().mockResolvedValue(undefined),
				listenTo: vi.fn().mockResolvedValue(undefined),
				unlistenAll: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
				notify: vi.fn().mockResolvedValue(undefined),
			};
		}),
	};
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('pg-listen broadcaster', () => {
	beforeEach(() => {
		capturedHandler = null;
		vi.clearAllMocks();
	});

	it('notify() sends JSON message to all OPEN WebSocket clients', async () => {
		const open1 = makeMockClient(1 /* WebSocket.OPEN */);
		const open2 = makeMockClient(1 /* WebSocket.OPEN */);
		const clients = new Set([open1, open2]);
		const mockFastify = makeMockFastify(clients as unknown as Set<MockWebSocket>);

		await createPgSubscriber('postgresql://user:pass@host:5432/db', mockFastify);
		expect(capturedHandler).not.toBeNull();

		const payload: ReservationChangePayload = {
			type: 'reservation_changed',
			reservationId: '11111111-1111-1111-1111-111111111111',
		};
		capturedHandler!(payload);

		const expectedMessage = JSON.stringify(payload);
		expect(open1.send).toHaveBeenCalledOnce();
		expect(open1.send).toHaveBeenCalledWith(expectedMessage);
		expect(open2.send).toHaveBeenCalledOnce();
		expect(open2.send).toHaveBeenCalledWith(expectedMessage);
	});

	it('notify() skips clients where readyState !== 1 (CLOSED, CLOSING, CONNECTING)', async () => {
		const openClient = makeMockClient(1 /* OPEN */);
		const closedClient = makeMockClient(3 /* CLOSED */);
		const closingClient = makeMockClient(2 /* CLOSING */);
		const connectingClient = makeMockClient(0 /* CONNECTING */);
		const clients = new Set([openClient, closedClient, closingClient, connectingClient]);
		const mockFastify = makeMockFastify(clients as unknown as Set<MockWebSocket>);

		await createPgSubscriber('postgresql://user:pass@host:5432/db', mockFastify);
		expect(capturedHandler).not.toBeNull();

		const payload: ReservationChangePayload = {
			type: 'reservation_deleted',
			reservationId: '22222222-2222-2222-2222-222222222222',
		};
		capturedHandler!(payload);

		// Only the OPEN client should receive the message
		expect(openClient.send).toHaveBeenCalledOnce();
		expect(closedClient.send).not.toHaveBeenCalled();
		expect(closingClient.send).not.toHaveBeenCalled();
		expect(connectingClient.send).not.toHaveBeenCalled();
	});

	it('payload shape is { type: "reservation_changed" | "reservation_deleted", reservationId: string }', async () => {
		const openClient = makeMockClient(1 /* OPEN */);
		const clients = new Set([openClient]);
		const mockFastify = makeMockFastify(clients as unknown as Set<MockWebSocket>);

		await createPgSubscriber('postgresql://user:pass@host:5432/db', mockFastify);
		expect(capturedHandler).not.toBeNull();

		// Test reservation_changed payload
		const changedPayload: ReservationChangePayload = {
			type: 'reservation_changed',
			reservationId: '33333333-3333-3333-3333-333333333333',
		};
		capturedHandler!(changedPayload);
		const sentChanged = JSON.parse((openClient.send as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string);
		expect(sentChanged).toEqual({ type: 'reservation_changed', reservationId: '33333333-3333-3333-3333-333333333333' });

		// Test reservation_deleted payload
		vi.clearAllMocks();
		const deletedPayload: ReservationChangePayload = {
			type: 'reservation_deleted',
			reservationId: '44444444-4444-4444-4444-444444444444',
		};
		capturedHandler!(deletedPayload);
		const sentDeleted = JSON.parse((openClient.send as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string);
		expect(sentDeleted).toEqual({ type: 'reservation_deleted', reservationId: '44444444-4444-4444-4444-444444444444' });
	});

	it('createPgSubscriber asserts DATABASE_URL does not use port 6543 (transaction pooler)', async () => {
		const clients = new Set<MockWebSocket>();
		const mockFastify = makeMockFastify(clients as unknown as Set<MockWebSocket>);

		// Should throw synchronously before any network connection
		await expect(
			createPgSubscriber('postgresql://user:pass@host:6543/db', mockFastify),
		).rejects.toThrow(
			'pg-listen requires a session-mode PostgreSQL connection (port 5432)',
		);
	});
});
