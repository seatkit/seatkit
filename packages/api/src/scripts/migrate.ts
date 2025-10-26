/**
 * Database migration script
 * Applies pending migrations to the database
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connection, db } from '../db/index.js';

async function runMigrations() {
	console.log('🔄 Running database migrations...');

	try {
		await migrate(db, {
			migrationsFolder: './src/db/migrations',
		});

		console.log('✅ Database migrations completed successfully');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	} finally {
		await connection.end();
		console.log('🔌 Database connection closed');
	}
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	runMigrations();
}