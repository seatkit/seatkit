/**
 * Database utilities for testing and development
 *
 * Provides environment-aware database connections and test utilities
 * that work across all packages in the SeatKit monorepo.
 *
 * @module database
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Database connection options for different environments
 */
type DatabaseConnectionOptions = {
	/** Maximum connections in pool */
	max?: number;
	/** Close idle connections after N seconds */
	idleTimeout?: number;
	/** Connection timeout in seconds */
	connectTimeout?: number;
};

/**
 * Default connection options optimized for each environment
 */
const DEFAULT_CONNECTION_OPTIONS: Record<string, DatabaseConnectionOptions> = {
	test: {
		max: 5, // Fewer connections for tests
		idleTimeout: 10,
		connectTimeout: 5,
	},
	development: {
		max: 20,
		idleTimeout: 20,
		connectTimeout: 10,
	},
	production: {
		max: 30,
		idleTimeout: 30,
		connectTimeout: 15,
	},
};

/**
 * Get the appropriate database URL for the current environment
 *
 * @returns Database connection URL
 * @throws Error if no database URL is configured
 */
export function getEnvironmentDatabaseUrl(): string {
	const environment = process.env['NODE_ENV'] || 'development';

	// In test environment, use TEST_DATABASE_URL if available
	if (environment === 'test' && process.env['TEST_DATABASE_URL']) {
		return process.env['TEST_DATABASE_URL'];
	}

	// Fall back to DATABASE_URL for all environments
	if (process.env['DATABASE_URL']) {
		return process.env['DATABASE_URL'];
	}

	throw new Error(
		`Database URL not configured. Please set ${
			environment === 'test' ? 'TEST_DATABASE_URL or DATABASE_URL' : 'DATABASE_URL'
		} environment variable.`
	);
}

/**
 * Create a database connection with environment-appropriate settings
 *
 * @param databaseUrl - Optional database URL (defaults to environment-based URL)
 * @param options - Optional connection options
 * @returns Postgres connection instance
 */
export function createDatabaseConnection(
	databaseUrl?: string,
	options?: DatabaseConnectionOptions
): postgres.Sql {
	const url = databaseUrl || getEnvironmentDatabaseUrl();
	const environment = process.env['NODE_ENV'] || 'development';

	const connectionOptions = {
		...DEFAULT_CONNECTION_OPTIONS[environment],
		...options,
	};

	return postgres(url, connectionOptions);
}

/**
 * Create a Drizzle database instance with the given schema
 *
 * @param schema - Database schema object
 * @param databaseUrl - Optional database URL
 * @param options - Optional connection options
 * @returns Drizzle database instance
 */
export function createDatabaseInstance<T extends Record<string, unknown>>(
	schema: T,
	databaseUrl?: string,
	options?: DatabaseConnectionOptions
): { db: ReturnType<typeof drizzle<T>>; connection: postgres.Sql } {
	const connection = createDatabaseConnection(databaseUrl, options);
	return {
		db: drizzle(connection, { schema }),
		connection,
	};
}

/**
 * Test-specific database utilities
 */
export const testDatabase = {
	/**
	 * Create a database connection specifically for tests
	 * Uses TEST_DATABASE_URL if available, falls back to DATABASE_URL
	 */
	createConnection(databaseUrl?: string): postgres.Sql {
		const testUrl = databaseUrl || process.env['TEST_DATABASE_URL'] || getEnvironmentDatabaseUrl();
		return createDatabaseConnection(testUrl, DEFAULT_CONNECTION_OPTIONS['test']);
	},

	/**
	 * Create a Drizzle instance specifically for tests
	 */
	createInstance<T extends Record<string, unknown>>(
		schema: T,
		databaseUrl?: string
	): { db: ReturnType<typeof drizzle<T>>; connection: postgres.Sql } {
		const testUrl = databaseUrl || process.env['TEST_DATABASE_URL'] || getEnvironmentDatabaseUrl();
		return createDatabaseInstance(schema, testUrl, DEFAULT_CONNECTION_OPTIONS['test']);
	},

	/**
	 * Setup test database (placeholder for migration logic)
	 * This will be implemented once we integrate with the migration system
	 */
	async setup(): Promise<void> {
		// TODO: Run migrations against test database
		// This will be implemented when we integrate with the existing migration system
	},

	/**
	 * Clean up test database between tests
	 *
	 * @param connection - Postgres connection to clean up
	 */
	async cleanup(connection: postgres.Sql): Promise<void> {
		try {
			// Close the connection
			await connection.end();
		} catch (error) {
			// Silently handle cleanup errors in tests
			if (error instanceof Error) {
				// Error handled
			}
		}
	},

	/**
	 * Truncate all tables in the test database (placeholder)
	 * This will be implemented once we have the schema structure
	 */
	async truncateAllTables(): Promise<void> {
		// TODO: Implement table truncation
		// This will be added when we have access to the schema structure
	},
};

/**
 * Graceful shutdown helper for database connections
 *
 * @param connection - Postgres connection to close
 */
export async function gracefulShutdown(connection: postgres.Sql): Promise<void> {
	try {
		await connection.end();
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Unknown error during graceful shutdown');
	}
}