import { describe, expect, it } from 'vitest';

import { buildLoggerOptions } from '../logger-config.js';

describe('buildLoggerOptions', () => {
	describe('level resolution', () => {
		it('returns level "debug" when no env vars are set', () => {
			const opts = buildLoggerOptions({});
			expect(opts).toHaveProperty('level', 'debug');
		});

		it('returns level "warn" when NODE_ENV is production', () => {
			const opts = buildLoggerOptions({ NODE_ENV: 'production' });
			expect(opts).toHaveProperty('level', 'warn');
		});

		it('returns explicit LOG_LEVEL when set', () => {
			const opts = buildLoggerOptions({ LOG_LEVEL: 'info' });
			expect(opts).toHaveProperty('level', 'info');
		});

		it('gives LOG_LEVEL precedence over NODE_ENV', () => {
			const opts = buildLoggerOptions({ LOG_LEVEL: 'error', NODE_ENV: 'production' });
			expect(opts).toHaveProperty('level', 'error');
		});
	});

	describe('pretty printing', () => {
		it('includes pino-pretty transport when LOG_PRETTY=true', () => {
			const opts = buildLoggerOptions({ LOG_PRETTY: 'true' });
			expect(opts).toHaveProperty('transport');
			const transport = (opts as Record<string, unknown>).transport as Record<string, unknown>;
			expect(transport.target).toBe('pino-pretty');
		});

		it('does NOT include transport key when LOG_PRETTY=false', () => {
			const opts = buildLoggerOptions({ LOG_PRETTY: 'false' });
			expect(opts).not.toHaveProperty('transport');
		});

		it('does NOT include transport key when LOG_PRETTY is absent (defaults to off)', () => {
			const opts = buildLoggerOptions({});
			expect(opts).not.toHaveProperty('transport');
		});
	});

	describe('GCP format', () => {
		it('returns GCP severity mapping when LOG_FORMAT=gcp', () => {
			const opts = buildLoggerOptions({ LOG_FORMAT: 'gcp' }) as Record<string, unknown>;
			const formatters = opts.formatters as { level: (label: string, number: number) => unknown };
			expect(formatters.level('info', 30)).toEqual({ severity: 'INFO', level: 30 });
			expect(formatters.level('error', 50)).toEqual({ severity: 'ERROR', level: 50 });
		});

		it('returns messageKey "message" when LOG_FORMAT=gcp', () => {
			const opts = buildLoggerOptions({ LOG_FORMAT: 'gcp' });
			expect(opts).toHaveProperty('messageKey', 'message');
		});

		it('returns err serializer that maps stack to stack_trace when LOG_FORMAT=gcp', () => {
			const opts = buildLoggerOptions({ LOG_FORMAT: 'gcp' }) as Record<string, unknown>;
			const serializers = opts.serializers as { err: (e: Error) => Record<string, unknown> };
			const error = new Error('test error');
			const serialized = serializers.err(error);
			expect(serialized).toHaveProperty('type', 'Error');
			expect(serialized).toHaveProperty('message', 'test error');
			expect(serialized).toHaveProperty('stack_trace');
			expect(serialized.stack_trace).toContain('Error: test error');
		});

		it('activates GCP format automatically in production', () => {
			const opts = buildLoggerOptions({ NODE_ENV: 'production' }) as Record<string, unknown>;
			expect(opts).toHaveProperty('messageKey', 'message');
			expect(opts).toHaveProperty('formatters');
			expect(opts).toHaveProperty('serializers');
		});

		it('does NOT include GCP formatters in non-production without LOG_FORMAT', () => {
			const opts = buildLoggerOptions({});
			expect(opts).not.toHaveProperty('messageKey');
			expect(opts).not.toHaveProperty('formatters');
			expect(opts).not.toHaveProperty('serializers');
		});

		it('gives pretty transport precedence over GCP formatters when both set', () => {
			const opts = buildLoggerOptions({ LOG_FORMAT: 'gcp', LOG_PRETTY: 'true' }) as Record<string, unknown>;
			// Pretty takes precedence: transport is present, GCP formatters are NOT
			expect(opts).toHaveProperty('transport');
			expect(opts).not.toHaveProperty('formatters');
			expect(opts).not.toHaveProperty('messageKey');
		});
	});

	describe('GCP severity mapping completeness', () => {
		it('maps all pino levels to GCP severities', () => {
			const opts = buildLoggerOptions({ LOG_FORMAT: 'gcp' }) as Record<string, unknown>;
			const formatters = opts.formatters as { level: (label: string, number: number) => { severity: string; level: number } };

			expect(formatters.level('trace', 10)).toEqual({ severity: 'DEBUG', level: 10 });
			expect(formatters.level('debug', 20)).toEqual({ severity: 'DEBUG', level: 20 });
			expect(formatters.level('info', 30)).toEqual({ severity: 'INFO', level: 30 });
			expect(formatters.level('warn', 40)).toEqual({ severity: 'WARNING', level: 40 });
			expect(formatters.level('error', 50)).toEqual({ severity: 'ERROR', level: 50 });
			expect(formatters.level('fatal', 60)).toEqual({ severity: 'CRITICAL', level: 60 });
		});
	});
});
