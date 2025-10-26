/**
 * Database migration script
 * Applies pending migrations to the database
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getSecrets } from '../lib/simple-secrets.js';

async function runMigrations() {
	console.log('🔄 Running database migrations...');

	try {
		// Load secrets first (just like main server)
		console.log('🔐 Loading database secrets...');
		const secrets = await getSecrets();

		// Set DATABASE_URL for the db connection
		process.env.DATABASE_URL = secrets.databaseUrl;

		// Now we can import db connection (after DATABASE_URL is set)
		const { db, connection } = await import('../db/index.js');

		console.log('📊 Applying migrations...');
		await migrate(db, {
			migrationsFolder: './src/db/migrations',
		});

		console.log('✅ Database migrations completed successfully');

		// Clean up
		await connection.end();
		console.log('🔌 Database connection closed');
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	}
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	runMigrations();
}