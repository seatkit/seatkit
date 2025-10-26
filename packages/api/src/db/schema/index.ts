/**
 * Database schema exports
 * Centralizes all table definitions for Drizzle ORM
 */

export * from './reservations.js';

// Export all tables in a single object for Drizzle
export { reservations } from './reservations.js';

// Will add more tables as we implement them:
// export { tables } from './tables.js';
// export { sessions } from './sessions.js';
// export { sales } from './sales.js';
// export { profiles } from './profiles.js';
// export { restaurants } from './restaurants.js';
// export { rooms } from './rooms.js';