/**
 * WebSocket client singleton
 * Connects to /api/v1/ws, handles reservation change broadcasts,
 * presence messages, and reconnects with exponential backoff.
 */
import { reservationKeys } from './queries/reservations.js';

import type { PresenceEntry } from './api-types.js';
import type { QueryClient } from '@tanstack/react-query';

// --- Types ---

type ReservationChangePayload = {
	type: 'reservation_changed' | 'reservation_deleted';
	reservationId: string;
};

type PresenceBroadcast = {
	type: 'presence-update';
	presence: PresenceEntry[];
};

type ServerMessage = ReservationChangePayload | PresenceBroadcast;

// Callback for presence updates (injected by presence store)
let onPresenceUpdate: ((presence: PresenceEntry[]) => void) | null = null;

export function setPresenceUpdateCallback(cb: (presence: PresenceEntry[]) => void): void {
	onPresenceUpdate = cb;
}

// --- Reconnect state ---
let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let isIntentionallyClosed = false;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

// --- Heartbeat ---
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
const HEARTBEAT_INTERVAL_MS = 30_000;

function startHeartbeat(): void {
	heartbeatInterval = setInterval(() => {
		sendMessage({ type: 'heartbeat' });
	}, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
	if (heartbeatInterval) {
		clearInterval(heartbeatInterval);
		heartbeatInterval = null;
	}
}

// --- Message sender ---
export function sendMessage(msg: { type: string; [key: string]: unknown }): void {
	if (ws?.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify(msg));
	}
}

// --- Connection ---
export function connectWebSocket(queryClient: QueryClient): () => void {
	isIntentionallyClosed = false;

	function connect(): void {
		const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
		const wsBase = apiBase.replace(/^https?/, apiBase.startsWith('https') ? 'wss' : 'ws');
		ws = new WebSocket(`${wsBase}/api/v1/ws`);

		ws.onopen = (): void => {
			reconnectAttempt = 0;
			startHeartbeat();
		};

		ws.onmessage = async (event: MessageEvent<string>): Promise<void> => {
			let payload: ServerMessage;
			try {
				payload = JSON.parse(event.data) as ServerMessage;
			} catch {
				return;
			}

			if (payload.type === 'reservation_changed') {
				// D-14: invalidate + refetch — no direct cache patching
				await queryClient.invalidateQueries({ queryKey: reservationKeys.detail(payload.reservationId) });
				await queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
			} else if (payload.type === 'reservation_deleted') {
				await queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
			} else if (payload.type === 'presence-update') {
				onPresenceUpdate?.(payload.presence);
			}
		};

		ws.onclose = (): void => {
			stopHeartbeat();
			if (isIntentionallyClosed) return;
			const buf = new Uint32Array(1);
			crypto.getRandomValues(buf);
			const jitter = ((buf[0] ?? 0) / 0xffffffff) * 1_000;
			const delay = Math.min(BASE_DELAY_MS * 2 ** reconnectAttempt, MAX_DELAY_MS) + jitter;
			reconnectAttempt++;
			reconnectTimeout = setTimeout(connect, delay);
		};

		ws.onerror = (): void => {
			// onclose fires after onerror — reconnect handled there
		};
	}

	connect();

	return (): void => {
		isIntentionallyClosed = true;
		if (reconnectTimeout) clearTimeout(reconnectTimeout);
		stopHeartbeat();
		ws?.close();
	};
}
