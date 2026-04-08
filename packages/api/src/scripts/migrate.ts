/**
 * Database migration script
 * Applies pending migrations to the database
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getSecrets } from '../lib/simple-secrets.js';

async function runMigrations() {
	console.log('🔄 Running database migrations...');

	try {
		// If DATABASE_URL or TEST_DATABASE_URL is already set, use it directly —
		// no need to hit Secret Manager (supports CI and direct local runs).
		const directUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
		if (directUrl) {
			process.env.DATABASE_URL = directUrl;
			console.log('🔧 Using DATABASE_URL from environment (skipping Secret Manager)');
		} else {
			console.log('🔐 Loading database secrets...');
			const secrets = await getSecrets();
			process.env.DATABASE_URL = secrets.databaseUrl;
		}

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