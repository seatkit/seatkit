/**
 * Database connection and configuration
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

// Environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	throw new Error('DATABASE_URL environment variable is required');
}

// Create postgres connection
// Note: Supabase requires specific connection configuration
export const connection = postgres(DATABASE_URL, {
	max: 20, // Maximum connections in pool
	idle_timeout: 20, // Close idle connections after 20 seconds
	connect_timeout: 10, // Connection timeout
});

// Create drizzle database instance with schema
export const db = drizzle(connection, { schema });

// Export schema and types for convenience
export { schema };
export type Database = typeof db;

// Graceful shutdown
async function gracefulShutdown() {
	console.log('Closing database connections...');
	await connection.end();
	console.log('Database connections closed.');
}

// Handle process termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);