/**
 * Logger configuration factory for the SeatKit API server.
 *
 * Produces pino options for the Fastify constructor based on environment variables.
 * Reads from process.env at call time (before @fastify/env loads) per Pitfall 5.
 *
 * Environment variables:
 *   LOG_LEVEL  — Minimum severity: trace | debug | info | warn | error | fatal
 *   LOG_PRETTY — "true" to enable pino-pretty transport (dev convenience)
 *   LOG_FORMAT — "gcp" for GCP Cloud Logging severity mapping; auto-enabled in production
 *   NODE_ENV   — "production" triggers warn-level default and GCP format
 *
 * pino is NOT imported directly — it is a transitive dependency of Fastify.
 * Only the FastifyServerOptions type is used for return type safety.
 */

import type { FastifyServerOptions } from 'fastify';

/**
 * Maps pino log level labels to GCP Cloud Logging severity strings.
 * @see https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
 */
const PINO_LEVEL_TO_GCP_SEVERITY: Record<string, string> = {
	trace: 'DEBUG',
	debug: 'DEBUG',
	info: 'INFO',
	warn: 'WARNING',
	error: 'ERROR',
	fatal: 'CRITICAL',
};

type LoggerEnv = {
	LOG_LEVEL?: string;
	LOG_PRETTY?: string;
	LOG_FORMAT?: string;
	NODE_ENV?: string;
}

/**
 * Build pino logger options for the Fastify constructor.
 *
 * @param env - Environment variables (typically `process.env`)
 * @returns Pino options object suitable for `Fastify({ logger: ... })`
 */
export function buildLoggerOptions(
	env: LoggerEnv,
): NonNullable<FastifyServerOptions['logger']> {
	const isProduction = env.NODE_ENV === 'production';

	// LOG_LEVEL takes precedence; falls back to warn (production) or debug (dev).
	// Uses `||` (not `??`) so empty string falls through to the default.
	const level = env.LOG_LEVEL || (isProduction ? 'warn' : 'debug');

	const pretty = env.LOG_PRETTY === 'true';
	const gcpFormat = env.LOG_FORMAT === 'gcp' || isProduction;

	// Base options — always present
	const opts: Record<string, unknown> = { level };

	// GCP Cloud Logging format: severity mapping + messageKey + error serializer.
	// Skipped when pretty is active (pretty transport overrides formatters).
	if (gcpFormat && !pretty) {
		opts.messageKey = 'message';
		opts.formatters = {
			level(label: string, number: number) {
				return {
					severity: PINO_LEVEL_TO_GCP_SEVERITY[label] ?? 'DEFAULT',
					level: number,
				};
			},
		};
		// GCP Error Reporting auto-detects stack_trace field at severity ERROR (D-09)
		opts.serializers = {
			err(err: Error) {
				return {
					type: err.constructor?.name ?? 'Error',
					message: err.message,
					stack_trace: err.stack,
				};
			},
		};
	}

	// pino-pretty transport — opt-in via LOG_PRETTY=true (D-02).
	// Installed as devDependency only; resolved lazily by pino at runtime.
	if (pretty) {
		opts.transport = {
			target: 'pino-pretty',
			options: {
				translateTime: 'HH:MM:ss Z',
				ignore: 'pid,hostname',
			},
		};
	}

	return opts as NonNullable<FastifyServerOptions['logger']>;
}
