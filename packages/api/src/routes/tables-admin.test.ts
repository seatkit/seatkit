/**
 * Tables admin route tests — Phase 2 Wave 0 stubs
 * Task IDs: 2-config-01, 2-config-02 (see 02-VALIDATION.md)
 */

import { describe, it, beforeAll, afterAll } from 'vitest';

import { createServer } from '../index.js';

import type { FastifyInstance } from 'fastify';

describe('Tables Admin API (CONFIG-01)', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = await createServer();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('POST /api/v1/tables (2-config-01)', () => {
		it.todo('admin creates a table; returns 201 with the new table');
		it.todo('non-admin receives 403');
	});

	describe('DELETE /api/v1/tables/:id (2-config-02)', () => {
		it.todo('admin deletes a table; GET /tables no longer includes it');
	});
});
