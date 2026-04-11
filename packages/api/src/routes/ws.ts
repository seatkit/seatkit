/**
 * WebSocket route — /api/v1/ws
 * Authenticated WebSocket endpoint. Auth guard fires via the global onRequest hook
 * before the WebSocket upgrade completes. Clients that connect here receive
 * real-time reservation change broadcasts from pg-listen and presence-update broadcasts.
 *
 * T-03-02-01 mitigation: global onRequest auth hook runs before upgrade;
 * unauthenticated requests receive 401 before WebSocket is established.
 *
 * T-03-03-01 mitigation: all client messages are validated with Zod ClientMessageSchema;
 * invalid shapes are logged and ignored — no state change occurs.
 *
 * T-03-03-02 mitigation: userId and sessionId are sourced from req.session
 * (set by Better Auth onRequest hook), not from the message payload.
 */
import { z } from 'zod';

import {
	deletePresence,
	listActivePresence,
	upsertPresence,
} from '../presence/presence-service.js';

import type { PresenceState } from '../presence/presence-service.js';
import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from 'ws';


// Zod schemas for client WebSocket messages
const HeartbeatMessageSchema = z.object({
	type: z.literal('heartbeat'),
});

const PresenceStateMessageSchema = z.object({
	type: z.literal('presence-state'),
	reservationId: z.string().uuid().nullable(),
	state: z.enum(['viewing', 'editing']),
});

const ClientMessageSchema = z.discriminatedUnion('type', [
	HeartbeatMessageSchema,
	PresenceStateMessageSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

const wsRoutes: FastifyPluginAsync = async (fastify) => {
	fastify.get(
		'/ws',
		{ websocket: true },
		(socket: WebSocket, req) => {
			const userId = req.session!.user.id;
			const sessionId = req.session!.session.id;

			// Per-socket child logger carries userId + sessionId in all log lines (Pitfall 6 mitigation).
			// Uses fastify.log (root logger) as parent — not req.log — because subsequent
			// WebSocket message events fire outside the HTTP request lifecycle.
			const wsLog = fastify.log.child({ userId, sessionId });

			// Register presence on connect — start as 'viewing', no specific reservation
			void upsertPresence(sessionId, userId, null, 'viewing');
			wsLog.warn('WebSocket client connected');

			// Broadcast the full current presence list to all connected clients
			const broadcastPresence = async (): Promise<void> => {
				const presence = await listActivePresence();
				const payload = JSON.stringify({ type: 'presence-update', presence });
				for (const client of fastify.websocketServer.clients) {
					if (client.readyState === 1) client.send(payload);
				}
			};

			socket.on('message', (raw: Buffer) => {
				let parsed: unknown;
				try {
					parsed = JSON.parse(raw.toString());
				} catch {
					wsLog.warn('WebSocket: invalid JSON message received — ignoring');
					return;
				}

				const result = ClientMessageSchema.safeParse(parsed);
				if (!result.success) {
					wsLog.warn(
						{ issues: result.error.issues },
						'WebSocket: invalid message shape — ignoring',
					);
					return;
				}

				const msg = result.data;
				wsLog.debug({ messageType: msg.type }, 'WebSocket message received');
				if (msg.type === 'heartbeat') {
					void upsertPresence(sessionId, userId, null, 'viewing').then(broadcastPresence);
				} else if (msg.type === 'presence-state') {
					void upsertPresence(
						sessionId,
						userId,
						msg.reservationId,
						msg.state as PresenceState,
					).then(broadcastPresence);
				}
			});

			socket.on('close', (code: number) => {
				wsLog.warn({ code }, 'WebSocket client disconnected');
				void deletePresence(sessionId).then(broadcastPresence);
			});

			socket.on('error', (err: Error) => {
				wsLog.error({ err }, 'WebSocket socket error');
			});
		},
	);

	// GET /api/v1/presence — returns all active presence entries (used by Plan 04 frontend)
	fastify.get('/presence', async (_request, reply) => {
		const presence = await listActivePresence();
		return reply.status(200).send({ presence });
	});
};

export default wsRoutes;
