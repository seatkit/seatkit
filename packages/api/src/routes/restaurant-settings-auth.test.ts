/**
 * Restaurant settings auth tests — Phase 2 Wave 0 stubs
 * Task IDs: 2-config-03, 2-config-04 (see 02-VALIDATION.md)
 */

import { describe, it, beforeAll, afterAll } from 'vitest';

import { createServer } from '../index.js';

import type { FastifyInstance } from 'fastify';

describe('Restaurant Settings — auth guard + config (CONFIG-02, CONFIG-03)', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = await createServer();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('PUT /api/v1/restaurant-settings (2-config-03, 2-config-04)', () => {
		it.todo('unauthenticated PUT returns 401');
		it.todo('admin PUT with serviceHours persists and round-trips correctly');
		it.todo('admin PUT with priorityOrder round-trips correctly');
	});
});
