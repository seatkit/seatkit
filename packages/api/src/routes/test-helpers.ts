/**
 * Shared helpers for route integration tests.
 * Imported only by *.test.ts files — not part of the production runtime.
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';

import { auth } from '../auth.js';
import { db } from '../db/index.js';
import { reservations, tables, restaurantSettings } from '../db/schema/index.js';
import { TABLE_DATA, DEFAULT_PRIORITY_ORDER } from '../db/seed-data.js';
import { createServer } from '../index.js';

import type { FastifyInstance, InjectOptions } from 'fastify';

/**
 * Creates a user via Better Auth's admin API, silently ignoring
 * USER_ALREADY_EXISTS errors so the call is safe to repeat across test runs
 * and test files without pre-cleaning the database.
 */
export async function createUserIdempotent(
	email: string,
	password: string,
	name: string,
	role?: 'admin',
): Promise<void> {
	try {
		await auth.api.createUser({
			body: { email, password, name, ...(role ? { role } : {}) },
		});
	} catch (err: unknown) {
		const apiErr = err as { body?: { code?: string } };
		if (apiErr?.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') return;
		throw err;
	}
}

/**
 * Signs in with the given credentials and returns the raw session cookie string.
 * Throws with a descriptive message on failure so tests fail fast with context
 * rather than producing confusing 401 errors on every subsequent request.
 */
export async function signIn(
	app: FastifyInstance,
	email: string,
	password: string,
): Promise<string> {
	const res = await app.inject({
		method: 'POST',
		url: '/api/auth/sign-in/email',
		payload: { email, password },
	});
	const raw = res.headers['set-cookie'];
	if (!raw) throw new Error(`Sign-in failed for ${email}: ${res.statusCode} ${res.body}`);
	const first = Array.isArray(raw) ? raw[0] : raw;
	if (!first) throw new Error(`No cookie returned for ${email}`);
	return first;
}

/**
 * Sets up a standard integration test suite: creates server, seeds DB,
 * authenticates a test admin, and provides an `inject` helper with session
 * cookies. Registers beforeAll/afterAll/beforeEach hooks in the calling
 * describe block.
 *
 * Returns getters (not direct refs) because `app`/`sessionCookie` are
 * assigned inside beforeAll, after the function returns.
 */
export function setupIntegrationSuite(opts: {
	email: string;
	password: string;
	displayName: string;
}) {
	let app: FastifyInstance;
	let sessionCookie: string;

	beforeAll(async () => {
		app = await createServer();
		await db.insert(tables).values([...TABLE_DATA]).onConflictDoNothing({ target: tables.name });
		await db
			.insert(restaurantSettings)
			.values({ priorityOrder: [...DEFAULT_PRIORITY_ORDER] })
			.onConflictDoNothing();
		await createUserIdempotent(opts.email, opts.password, opts.displayName, 'admin');
		sessionCookie = await signIn(app, opts.email, opts.password);
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(async () => {
		await db.delete(reservations);
	});

	const inject = (options: InjectOptions | string) =>
		app.inject({
			...(typeof options === 'string' ? { url: options } : options),
			headers: {
				...(typeof options === 'object' ? (options.headers as Record<string, string> | undefined) : undefined),
				...(sessionCookie ? { cookie: sessionCookie } : {}),
			},
		});

	return { getApp: () => app, inject };
}
