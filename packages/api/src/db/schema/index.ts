/**
 * Database schema exports
 * Centralizes all table definitions for Drizzle ORM
 */

export * from './reservations';

// Export all tables in a single object for Drizzle
export { reservations } from './reservations';

export * from './tables';

export * from './restaurant_settings';
