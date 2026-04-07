/**
 * Auth API route tests — Phase 2 Wave 0 stubs
 * Task IDs: 2-auth-01 through 2-auth-07 (see 02-VALIDATION.md)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createServer } from '../index.js';

import type { FastifyInstance } from 'fastify';

describe('Auth API', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = await createServer();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('POST /api/auth/sign-in/email (2-auth-01, 2-auth-02)', () => {
		it.todo('returns session cookie with non-zero Max-Age on valid credentials');
		it.todo('returns 401 on invalid credentials (2-auth-02)');
	});

	describe('POST /api/auth/sign-out (2-auth-04)', () => {
		it.todo('deletes session row and invalidates cookie');
	});

	describe('Admin: set role (2-auth-05)', () => {
		it.todo('admin can set user role to manager');
	});

	describe('Auth guard (2-auth-06, 2-auth-07)', () => {
		it.todo('GET /api/v1/reservations without session returns 401');
		it.todo('GET /api/v1/health without session returns 200');
	});
});
