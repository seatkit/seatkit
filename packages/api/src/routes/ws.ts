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
import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from 'ws';

import {
	deletePresence,
	listActivePresence,
	upsertPresence,
} from '../presence/presence-service.js';
import type { PresenceState } from '../presence/presence-service.js';

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

			// Register presence on connect — start as 'viewing', no specific reservation
			void upsertPresence(sessionId, userId, null, 'viewing');
			fastify.log.debug({ userId, sessionId }, 'WebSocket client connected');

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
					fastify.log.warn({ userId }, 'WebSocket: invalid JSON message received — ignoring');
					return;
				}

				const result = ClientMessageSchema.safeParse(parsed);
				if (!result.success) {
					fastify.log.warn(
						{ userId, issues: result.error.issues },
						'WebSocket: invalid message shape — ignoring',
					);
					return;
				}

				const msg = result.data;
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
				fastify.log.debug({ userId, sessionId, code }, 'WebSocket client disconnected');
				void deletePresence(sessionId).then(broadcastPresence);
			});

			socket.on('error', (err: Error) => {
				fastify.log.error({ userId, err }, 'WebSocket socket error');
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
