/**
 * Test database migration script
 * Applies migrations to the test database (local PostgreSQL)
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabaseInstance } from '@seatkit/utils';

async function runTestMigrations() {
	console.log('🧪 Running TEST database migrations...');

	try {
		// Set test environment
		process.env.NODE_ENV = 'test';

		// Use test database URL or default to local PostgreSQL
		const testDatabaseUrl =
			process.env.TEST_DATABASE_URL ||
			'postgresql://localhost:5432/seatkit_test';
		console.log(
			`📊 Connecting to test database: ${testDatabaseUrl.replace(/\/\/[^@]+@/, '//***:***@')}`,
		);

		// Import schema
		const schema = await import('../db/schema/index.js');

		// Create database instance for test database
		const { db, connection } = createDatabaseInstance(schema, testDatabaseUrl);

		console.log('📊 Applying migrations to test database...');
		await migrate(db, {
			migrationsFolder: './src/db/migrations',
		});

		console.log('✅ Test database migrations completed successfully');

		// Clean up
		await connection.end();
		console.log('🔌 Test database connection closed');
	} catch (error) {
		console.error('❌ Test migration failed:', error);
		process.exit(1);
	}
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	runTestMigrations();
}
