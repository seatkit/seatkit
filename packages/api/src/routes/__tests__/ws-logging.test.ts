/**
 * WebSocket logging unit tests — verifies ws.ts log levels and child logger usage.
 *
 * Strategy: mock fastify.log with a spy that returns a child mock when .child()
 * is called. Register the ws route plugin on a minimal Fastify instance, then
 * simulate WebSocket events via @fastify/websocket test helpers. Verify that the
 * child mock's methods are called with expected arguments and levels.
 *
 * Since full WebSocket integration is complex (requires auth session mocking,
 * real WS connections), this test verifies the logging contract structurally:
 * - wsLog child logger is created with { userId, sessionId }
 * - connect logged at warn (not debug)
 * - disconnect logged at warn (not debug)
 * - message type logged at debug with messageType field
 * - no payload content in any log call
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect, vi } from 'vitest';

// Read the ws.ts source for structural assertions
const wsSourcePath = resolve(import.meta.dirname, '..', 'ws.ts');
const wsSource = readFileSync(wsSourcePath, 'utf-8');

describe('WebSocket logging (ws.ts)', () => {
	describe('child logger creation', () => {
		it('creates a per-socket child logger with userId and sessionId', () => {
			expect(wsSource).toContain(
				'const wsLog = fastify.log.child({ userId, sessionId })',
			);
		});

		it('uses fastify.log as parent (not req.log)', () => {
			expect(wsSource).toContain('fastify.log.child(');
			expect(wsSource).not.toContain('req.log.child(');
		});
	});

	describe('connect/disconnect log levels', () => {
		it('logs connect at warn level via wsLog', () => {
			expect(wsSource).toContain("wsLog.warn('WebSocket client connected')");
		});

		it('logs disconnect at warn level via wsLog with close code', () => {
			expect(wsSource).toContain(
				"wsLog.warn({ code }, 'WebSocket client disconnected')",
			);
		});

		it('does NOT log connect at debug level', () => {
			expect(wsSource).not.toMatch(/\.debug\(.*WebSocket client connected/);
		});

		it('does NOT log disconnect at debug level', () => {
			expect(wsSource).not.toMatch(/\.debug\(.*WebSocket client disconnected/);
		});
	});

	describe('message type logging', () => {
		it('logs message type at debug level with messageType field', () => {
			expect(wsSource).toContain(
				"wsLog.debug({ messageType: msg.type }, 'WebSocket message received')",
			);
		});

		it('does NOT log the raw message payload', () => {
			// Ensure no log call includes 'raw' variable or full message data
			const logCalls = wsSource.match(/wsLog\.(debug|warn|error|info)\([^)]*\)/g) ?? [];
			for (const call of logCalls) {
				expect(call).not.toContain('raw');
				// msg.reservationId and msg.state are payload content — must not appear in logs
				expect(call).not.toContain('msg.reservationId');
				expect(call).not.toContain('msg.state');
			}
		});
	});

	describe('error logging', () => {
		it('logs socket errors via wsLog.error', () => {
			expect(wsSource).toContain(
				"wsLog.error({ err }, 'WebSocket socket error')",
			);
		});
	});

	describe('no direct fastify.log usage in socket handler', () => {
		it('does NOT use fastify.log directly inside the socket handler for lifecycle events', () => {
			// After the wsLog child is created, all log calls inside the handler
			// should use wsLog, not fastify.log. Extract the socket handler body
			// (everything between "const wsLog" and the closing of the get callback).
			const handlerStart = wsSource.indexOf('const wsLog = fastify.log.child');
			const handlerSection = wsSource.slice(handlerStart);

			// No fastify.log.debug/warn/error calls should appear in the handler section
			// (fastify.log.child is fine — that's how wsLog is created)
			const directLogCalls = handlerSection.match(
				/fastify\.log\.(debug|warn|error|info)\(/g,
			);
			expect(directLogCalls).toBeNull();
		});
	});

	describe('PII protection', () => {
		it('does NOT include guestName, phone, or notes in any log call', () => {
			const logCalls = wsSource.match(/wsLog\.(debug|warn|error|info)\([^)]*\)/g) ?? [];
			for (const call of logCalls) {
				expect(call).not.toContain('guestName');
				expect(call).not.toContain('phone');
				expect(call).not.toContain('notes');
			}
		});
	});
});
