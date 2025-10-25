/**
 * SeatKit API Server
 * Fastify-based backend with Supabase PostgreSQL
 */

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import env from '@fastify/env';
import {
	serializerCompiler,
	validatorCompiler,
	type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { getSecrets } from './lib/simple-secrets.js';

const envSchema = {
	type: 'object',
	properties: {
		NODE_ENV: { type: 'string', default: 'development' },
		PORT: { type: 'string', default: '3001' },
		HOST: { type: 'string', default: '0.0.0.0' },
		GOOGLE_CLOUD_PROJECT: { type: 'string' },
	},
	required: [], // Secrets are loaded separately
} as const;

async function createServer() {
	const fastify = Fastify({
		logger: {
			level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
		},
	}).withTypeProvider<ZodTypeProvider>();

	fastify.setValidatorCompiler(validatorCompiler);
	fastify.setSerializerCompiler(serializerCompiler);

	await fastify.register(env, {
		schema: envSchema,
	});

	// Security plugins
	await fastify.register(helmet);
	await fastify.register(cors, {
		origin:
			process.env.NODE_ENV === 'production'
				? ['https://your-domain.com'] // Update in production
				: true, // Allow all origins in development
	});

	await fastify.register(rateLimit, {
		max: 100,
		timeWindow: '1 minute',
	});

	// Health check endpoint
	fastify.get('/health', async request => {
		// Ensure NODE_ENV is properly set
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

	// API routes will be registered here
	// await fastify.register(import('./routes/reservations.js'), { prefix: '/api' });

	return fastify;
}

async function start() {
	try {
		// Load secrets first
		console.log('🔐 Loading application secrets...');
		const secrets = await getSecrets();

		// Set secrets as environment variables for other parts of the app
		process.env.SUPABASE_URL = secrets.supabaseUrl;
		process.env.SUPABASE_PUBLISHABLE_KEY = secrets.supabasePublishableKey;
		process.env.SUPABASE_SECRET_KEY = secrets.supabaseSecretKey;
		process.env.DATABASE_URL = secrets.databaseUrl;

		const fastify = await createServer();

		const host = process.env.HOST || '0.0.0.0';
		const port = parseInt(process.env.PORT || '3001', 10);

		await fastify.listen({ host, port });
		console.log(`🚀 SeatKit API server running on http://${host}:${port}`);
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
