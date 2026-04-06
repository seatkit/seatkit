/**
 * Seed script — idempotent bootstrap for Koenji restaurant tables and settings
 *
 * Run: pnpm --filter @seatkit/api db:seed
 * Safe to re-run: uses ON CONFLICT DO NOTHING
 * Does NOT run automatically with db:migrate (separate step per D-07)
 */

import { getSecrets } from '../lib/simple-secrets.js';

const TABLE_DATA = [
	{ name: 'T1', maxCapacity: 2, minCapacity: 1, positionX: 14, positionY: 1 },
	{ name: 'T2', maxCapacity: 2, minCapacity: 1, positionX: 10, positionY: 1 },
	{ name: 'T3', maxCapacity: 2, minCapacity: 1, positionX: 6,  positionY: 1 },
	{ name: 'T4', maxCapacity: 2, minCapacity: 1, positionX: 1,  positionY: 1 },
	{ name: 'T5', maxCapacity: 2, minCapacity: 1, positionX: 7,  positionY: 8 },
	{ name: 'T6', maxCapacity: 2, minCapacity: 1, positionX: 1,  positionY: 6 },
	{ name: 'T7', maxCapacity: 2, minCapacity: 1, positionX: 1,  positionY: 11 },
] as const;

const DEFAULT_PRIORITY_ORDER = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] as const;

async function seed(): Promise<void> {
	console.log('Starting SeatKit seed...');

	const secrets = await getSecrets();
	process.env.DATABASE_URL = secrets.databaseUrl;

	// Dynamic import after DATABASE_URL is set (same pattern as migrate.ts)
	const { db, connection } = await import('../db/index.js');
	const { tables, restaurantSettings } = await import('../db/schema/index.js');

	// Insert tables — idempotent on name
	console.log('Seeding tables...');
	for (const tableData of TABLE_DATA) {
		const result = await db
			.insert(tables)
			.values(tableData)
			.onConflictDoNothing({ target: tables.name })
			.returning({ id: tables.id, name: tables.name });
		if (result.length > 0) {
			console.log(`  Inserted ${tableData.name}`);
		} else {
			console.log(`  Skipped ${tableData.name} (already exists)`);
		}
	}

	// Insert default restaurant settings — idempotent (only one row expected)
	console.log('Seeding restaurant settings...');
	const settingsResult = await db
		.insert(restaurantSettings)
		.values({ priorityOrder: [...DEFAULT_PRIORITY_ORDER] })
		.onConflictDoNothing()
		.returning({ id: restaurantSettings.id });
	if (settingsResult.length > 0) {
		console.log(`  Inserted default settings (priority order: ${DEFAULT_PRIORITY_ORDER.join(', ')})`);
	} else {
		console.log('  Skipped settings (already exists)');
	}

	console.log('Seed complete.');

	// Clean up connection
	await connection.end();
}

seed().catch(error => {
	console.error('Seed failed:', error);
	process.exit(1);
});
