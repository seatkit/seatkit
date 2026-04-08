/**
 * SeatKit API Server
 * Fastify-based backend with Supabase PostgreSQL
 */

import cors from '@fastify/cors';
import env from '@fastify/env';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import websocket from '@fastify/websocket';
import fastifyApiReference from '@scalar/fastify-api-reference';
import { fromNodeHeaders } from 'better-auth/node';
import Fastify from 'fastify';
import FastifyBetterAuth, { getAuthDecorator, type FastifyBetterAuthOptions } from 'fastify-better-auth';
import fp from 'fastify-plugin';
import {
	createSerializerCompiler,
	hasZodFastifySchemaValidationErrors,
	isResponseSerializationError,
	jsonSchemaTransform,
	validatorCompiler,
	type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { auth } from './auth.js';
import type { ReservationChangePayload } from './lib/pg-subscriber.js';
import { getSecrets } from './lib/simple-secrets.js';
import { seedAdminIfEmpty } from './services/auth-service.js';

// Cast auth to satisfy fastify-better-auth's generic overloads.
// Our concrete Auth type (with admin + invite plugins) is structurally
// incompatible with the base BetterAuthOptions placeholder in the plugin types.
const authPluginOptions = { auth } as unknown as FastifyBetterAuthOptions;

// Augment Fastify request type to carry the auth session
declare module 'fastify' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface FastifyRequest {
		session?: Awaited<ReturnType<typeof auth.api.getSession>>;
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface FastifyInstance {
		notifyReservationChange: (payload: ReservationChangePayload) => Promise<void>;
	}
}

const envSchema = {
	type: 'object',
	properties: {
		NODE_ENV: { type: 'string', default: 'development' },
		PORT: { type: 'string', default: '3001' },
		HOST: { type: 'string', default: '0.0.0.0' },
		GOOGLE_CLOUD_PROJECT: { type: 'string', default: 'seatkit-dev' },
	},
	required: [], // Secrets are loaded separately
} as const;

// URL prefixes that bypass the auth guard
const PUBLIC_URL_PREFIXES = [
	'/api/v1/health',
	'/api/auth/',
	'/documentation',
] as const;

async function createServer() {
	const fastify = Fastify({
		logger: {
			level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
		},
	}).withTypeProvider<ZodTypeProvider>();

	// Custom serializer with Date object handling
	const replacer = function (
		this: Record<string, unknown>,
		key: string,
		value: unknown,
	) {
		// JSON.stringify calls Date.prototype.toJSON() before invoking the replacer,
		// so `value` is already a string by this point. Use `this[key]` to access
		// the original Date object for the instanceof check and conversion.
		if (this[key] instanceof Date) {
			return this[key].toISOString();
		}
		return value;
	};

	fastify.setValidatorCompiler(validatorCompiler);
	fastify.setSerializerCompiler(createSerializerCompiler({ replacer }));

	fastify.setErrorHandler((error, _request, reply) => {
		if (hasZodFastifySchemaValidationErrors(error)) {
			return reply.status(400).send({
				statusCode: 400,
				error: 'Bad Request',
				message: 'Request validation failed',
				issues: error.validation,
			});
		}
		if (isResponseSerializationError(error)) {
			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: `Response serialization error: ${error.message}`,
			});
		}
		// Re-throw other errors for Fastify's default handler
		return reply.send(error);
	});

	await fastify.register(env, {
		schema: envSchema,
	});

	await fastify.register(sensible);
	await fastify.register(helmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:', 'https:'],
				connectSrc: ["'self'", 'https://api.scalar.com'],
			},
		},
	});
	await fastify.register(cors, {
		origin:
			process.env.NODE_ENV === 'production'
				? [process.env.CORS_ORIGIN ?? 'https://your-domain.com']
				: [process.env.CORS_ORIGIN ?? 'http://localhost:3000'],
		credentials: true,
	});

	await fastify.register(rateLimit, {
		max: 100,
		timeWindow: '1 minute',
	});

	// Register OpenAPI documentation — MUST be before route registrations (Pitfall 2)
	await fastify.register(swagger, {
		transform: jsonSchemaTransform,
		openapi: {
			openapi: '3.1.0',
			info: {
				title: 'SeatKit API',
				description: 'Restaurant reservation management API',
				version: '1.0.0',
			},
			servers: [{ url: '/api/v1' }],
		},
	});

	await fastify.register(fastifyApiReference, {
		routePrefix: '/documentation',
		// @fastify/swagger is auto-detected — no spec.url needed
	});

	// Register fastify-better-auth with fp() wrapper so the decorator is
	// visible outside plugin encapsulation (see research Pitfall 3).
	// authPluginOptions wraps auth cast to FastifyBetterAuthOptions to satisfy
	// the plugin's generic overloads (concrete type is structurally incompatible).
	await fastify.register(
		fp(async (f) => {
			await f.register(FastifyBetterAuth, authPluginOptions);
		}),
	);

	// Auth guard: protect all /api/v1/* routes.
	// Public exceptions:
	//   - GET /api/v1/health (health check, no auth required)
	//   - /api/auth/* (Better Auth's own endpoints — sign-in, sign-out, etc.)
	//   - /documentation (Swagger UI)
	fastify.addHook('onRequest', async (request, reply) => {
		if (PUBLIC_URL_PREFIXES.some((prefix) => request.url.startsWith(prefix))) {
			return;
		}
		const authDecorator = getAuthDecorator(fastify);
		const session = await authDecorator.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});
		if (!session?.user) {
			return reply.unauthorized('Login required.');
		}
		// Attach session to request for downstream route handlers.
		// Cast needed: getAuthDecorator returns a base Auth type whose session
		// shape lacks the admin plugin fields (impersonatedBy etc.) that our
		// concrete auth instance actually returns at runtime.
		request.session = session as Awaited<ReturnType<typeof auth.api.getSession>>;
	});

	fastify.get('/health', () => {
		const environment = process.env.NODE_ENV;
		if (!environment) {
			throw new Error('NODE_ENV environment variable must be set');
		}

		return {
			status: 'ok',
			timestamp: new Date().toISOString(),
			environment,
		};
	});

	// MUST be registered before route plugins — intercepts WebSocket upgrade requests
	await fastify.register(websocket);

	// Decorate fastify with a lazy-initialized notify function.
	// Set to a no-op initially; replaced with the real subscriber in onReady.
	// Using void return — fire-and-forget from route handlers must not block HTTP responses.
	fastify.decorate('notifyReservationChange', async (_payload: ReservationChangePayload): Promise<void> => {
		// no-op until pg-listen connects in onReady
	});

	// Start pg-listen subscriber after server is ready
	// (DATABASE_URL is available in process.env by the time onReady fires)
	fastify.addHook('onReady', async () => {
		const databaseUrl = process.env.DATABASE_URL;
		if (!databaseUrl) {
			fastify.log.warn('DATABASE_URL not set — pg-listen subscriber not started');
			return;
		}
		const { createPgSubscriber, RESERVATION_CHANNEL } = await import('./lib/pg-subscriber.js');
		const subscriber = await createPgSubscriber(databaseUrl, fastify);

		// Replace the no-op decorator with real NOTIFY calls
		fastify.notifyReservationChange = async (payload) => {
			await subscriber.notify(RESERVATION_CHANNEL, payload);
		};

		// Cleanup on shutdown
		fastify.addHook('onClose', async () => {
			await subscriber.unlistenAll();
			await subscriber.close();
			fastify.log.info('pg-listen subscriber closed');
		});
	});

	// API routes
	await fastify.register(import('./routes/reservations.js'), { prefix: '/api/v1' });
	await fastify.register(import('./routes/tables.js'), { prefix: '/api/v1' });
	await fastify.register(import('./routes/restaurant-settings.js'), { prefix: '/api/v1' });
	await fastify.register(import('./routes/staff.js'), { prefix: '/api/v1' });
	await fastify.register(import('./routes/ws.js'), { prefix: '/api/v1' });

	return fastify;
}

async function start() {
	try {
		console.log('Loading application secrets...');
		const secrets = await getSecrets();

		process.env.DATABASE_URL = secrets.databaseUrl;

		// Propagate optional secrets to environment for auth.ts and mailer.ts
		if (secrets.betterAuthSecret) process.env.BETTER_AUTH_SECRET = secrets.betterAuthSecret;
		if (secrets.smtpHost) process.env.SMTP_HOST = secrets.smtpHost;
		if (secrets.smtpPort) process.env.SMTP_PORT = secrets.smtpPort;
		if (secrets.smtpUser) process.env.SMTP_USER = secrets.smtpUser;
		if (secrets.smtpPass) process.env.SMTP_PASS = secrets.smtpPass;
		if (secrets.smtpFrom) process.env.SMTP_FROM = secrets.smtpFrom;

		// Seed initial admin account if no users exist (D-06)
		await seedAdminIfEmpty();

		const fastify = await createServer();

		const host = process.env.HOST || '0.0.0.0';
		const port = parseInt(process.env.PORT || '3001', 10);

		await fastify.listen({ host, port });
		console.log(`SeatKit API server running on http://${host}:${port}`);
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	start();
}

export { createServer };
