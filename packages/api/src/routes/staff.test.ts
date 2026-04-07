/**
 * Staff management route tests — Phase 2 Wave 0 stubs
 * Task ID: 2-staff-01 (see 02-VALIDATION.md)
 */

import { describe, it, beforeAll, afterAll } from 'vitest';

import { createServer } from '../index.js';

import type { FastifyInstance } from 'fastify';

describe('Staff Management API (CONFIG-04)', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = await createServer();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('POST /api/v1/staff/invite (2-staff-01)', () => {
		it.todo('admin sends invite; invited user can sign in after accepting');
	});

	describe('DELETE /api/v1/staff/:id', () => {
		it.todo('admin removes staff member; removed user receives 401 on next request');
	});

	describe('PUT /api/v1/staff/:id/role', () => {
		it.todo('admin grants manager role; GET /staff/:id returns role=manager');
	});
});
