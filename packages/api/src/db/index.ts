/**
 * Database connection and configuration
 *
 * Exports lazy `db` and `connection` proxies. The real postgres.js connection
 * is only established on the first property access, which happens after the
 * server's start() function has set DATABASE_URL from secrets or .env.
 *
 * This allows db/index.ts to be statically imported by auth.ts and route
 * modules without requiring DATABASE_URL to be present at module-load time.
 */

import { createDatabaseInstance, gracefulShutdown } from '@seatkit/utils';
import * as schema from './schema/index.js';

type DbInstance = ReturnType<typeof createDatabaseInstance<typeof schema>>;

let _instance: DbInstance | undefined;

function getInstance(): DbInstance {
	if (!_instance) {
		_instance = createDatabaseInstance(schema);
		process.on('SIGINT', () => gracefulShutdown(_instance!.connection));
		process.on('SIGTERM', () => gracefulShutdown(_instance!.connection));
	}
	return _instance;
}

export const db = new Proxy({} as DbInstance['db'], {
	get(_target, prop, receiver) {
		return Reflect.get(getInstance().db, prop, receiver);
	},
});

export const connection = new Proxy({} as DbInstance['connection'], {
	get(_target, prop, receiver) {
		return Reflect.get(getInstance().connection, prop, receiver);
	},
});

export { schema };
export type Database = DbInstance['db'];
