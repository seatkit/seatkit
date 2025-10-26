/**
 * Database connection and configuration
 */

import { createDatabaseInstance, gracefulShutdown } from '@seatkit/utils';
import * as schema from './schema/index.js';

// Create database instance using shared utilities
// This automatically handles environment detection (test vs development)
const { db, connection } = createDatabaseInstance(schema);

// Export database instance and connection
export { db, connection };

// Export schema and types for convenience
export { schema };
export type Database = typeof db;

// Handle process termination with shared graceful shutdown
process.on('SIGINT', () => gracefulShutdown(connection));
process.on('SIGTERM', () => gracefulShutdown(connection));