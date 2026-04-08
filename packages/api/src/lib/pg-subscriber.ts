/**
 * PostgreSQL LISTEN/NOTIFY subscriber via pg-listen
 * Long-lived connection for broadcasting reservation changes to WebSocket clients.
 * Uses Session Pooler (port 5432) — MUST NOT use transaction pooler (port 6543).
 *
 * D-03: Supabase transaction pooler (port 6543) does not support LISTEN/NOTIFY.
 * Session pooler (port 5432) maintains persistent connections and supports LISTEN.
 */
import createSubscriber from 'pg-listen';
import type { FastifyInstance } from 'fastify';

export type ReservationChangePayload = {
	type: 'reservation_changed' | 'reservation_deleted';
	reservationId: string;
};

export const RESERVATION_CHANNEL = 'reservation_changes';

export async function createPgSubscriber(
	connectionString: string,
	fastify: FastifyInstance,
): Promise<ReturnType<typeof createSubscriber>> {
	// D-03: Assert we are NOT using the transaction pooler (port 6543).
	// Supabase transaction pooler does not support LISTEN/NOTIFY.
	// Session pooler (port 5432) does.
	if (connectionString.includes(':6543')) {
		throw new Error(
			'pg-listen requires a session-mode PostgreSQL connection (port 5432). ' +
				'Do not use the Supabase transaction pooler (port 6543) for LISTEN/NOTIFY.',
		);
	}

	const subscriber = createSubscriber({ connectionString });

	subscriber.events.on('error', (error: Error) => {
		fastify.log.error({ error }, 'pg-listen fatal error');
		// Fatal reconnect failures propagate here — crash and let the process manager restart
		process.exit(1);
	});

	subscriber.events.on('reconnect', (attempt: number) => {
		fastify.log.warn({ attempt }, 'pg-listen reconnecting to PostgreSQL');
	});

	subscriber.notifications.on(
		RESERVATION_CHANNEL,
		(payload: ReservationChangePayload) => {
			const message = JSON.stringify(payload);
			let sent = 0;
			for (const client of fastify.websocketServer.clients) {
				if (client.readyState === 1 /* WebSocket.OPEN */) {
					client.send(message);
					sent++;
				}
			}
			fastify.log.debug({ reservationId: payload.reservationId, sent }, 'broadcast sent');
		},
	);

	await subscriber.connect();
	await subscriber.listenTo(RESERVATION_CHANNEL);
	fastify.log.info('pg-listen connected and listening on channel: ' + RESERVATION_CHANNEL);

	return subscriber;
}
