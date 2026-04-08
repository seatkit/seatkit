/**
 * WebSocket route — /api/v1/ws
 * Authenticated WebSocket endpoint. Auth guard fires via the global onRequest hook
 * before the WebSocket upgrade completes. Clients that connect here receive
 * real-time reservation change broadcasts from pg-listen.
 *
 * T-03-02-01 mitigation: global onRequest auth hook runs before upgrade;
 * unauthenticated requests receive 401 before WebSocket is established.
 */
import type { FastifyPluginAsync } from 'fastify';
import type { WebSocket } from 'ws';

const wsRoutes: FastifyPluginAsync = async (fastify) => {
	fastify.get(
		'/ws',
		{ websocket: true },
		(socket: WebSocket, req) => {
			const userId = req.session?.user?.id ?? 'unknown';
			fastify.log.debug({ userId }, 'WebSocket client connected');

			socket.on('message', (raw: Buffer) => {
				// Presence heartbeat and state-change messages are handled in Plan 03.
				// For now, log to confirm the connection is live (useful for debugging).
				fastify.log.debug({ userId, message: raw.toString() }, 'WebSocket message received');
			});

			socket.on('close', (code: number, reason: Buffer) => {
				fastify.log.debug({ userId, code, reason: reason.toString() }, 'WebSocket client disconnected');
				// Presence cleanup on disconnect is handled in Plan 03.
			});

			socket.on('error', (err: Error) => {
				fastify.log.error({ userId, err }, 'WebSocket socket error');
			});
		},
	);
};

export default wsRoutes;
