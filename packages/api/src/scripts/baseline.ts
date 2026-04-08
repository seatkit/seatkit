/**
 * Database baseline script
 * Stamps already-applied migrations into Drizzle's tracking table so
 * db:migrate only runs new ones.
 *
 * Usage:
 *   TEST_DATABASE_URL="..." pnpm --filter @seatkit/api db:baseline
 *
 * Run this ONCE when the drizzle.__drizzle_migrations table is empty but
 * migrations have already been applied to the database manually.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../db/migrations');

type JournalEntry = {
	idx: number;
	when: number;
	tag: string;
};

type Journal = {
	entries: JournalEntry[];
};

async function runBaseline() {
	const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error('❌ Set TEST_DATABASE_URL or DATABASE_URL');
		process.exit(1);
	}

	console.log('🔄 Running database baseline...');

	const sql = postgres(databaseUrl, { max: 1 });

	try {
		// Read journal
		const journal: Journal = JSON.parse(
			fs.readFileSync(path.join(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8'),
		);

		// Ensure drizzle schema + tracking table exist (same DDL Drizzle uses)
		await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
		await sql`
			CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
				id        SERIAL PRIMARY KEY,
				hash      TEXT NOT NULL,
				created_at BIGINT
			)
		`;

		// Check what's already stamped
		const existing = await sql<{ hash: string }[]>`
			SELECT hash FROM drizzle.__drizzle_migrations
		`;
		const stampedHashes = new Set(existing.map((r) => r.hash));

		// Find migrations that exist in DB (we assume all but the last N are applied).
		// Strategy: stamp every migration except those whose SQL would fail on a fresh
		// run against the current schema. The caller controls this via --up-to=N.
		const upToArg = process.argv.find((a) => a.startsWith('--up-to='));
		const upToIdx = upToArg ? Number.parseInt(upToArg.replace('--up-to=', ''), 10) : Infinity;

		let stamped = 0;
		let skipped = 0;

		for (const entry of journal.entries) {
			if (entry.idx > upToIdx) break;

			const filePath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
			const content = fs.readFileSync(filePath, 'utf8');
			const hash = crypto.createHash('sha256').update(content).digest('hex');

			if (stampedHashes.has(hash)) {
				console.log(`⏭  Already stamped: ${entry.tag}`);
				skipped++;
				continue;
			}

			await sql`
				INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
				VALUES (${hash}, ${entry.when})
			`;
			console.log(`✅ Stamped: ${entry.tag}`);
			stamped++;
		}

		console.log(`\n✅ Baseline complete — ${stamped} stamped, ${skipped} already tracked`);
		console.log('   You can now run db:migrate to apply remaining migrations.');
	} finally {
		await sql.end();
	}
}

try {
	await runBaseline();
} catch (err) {
	console.error('❌ Baseline failed:', err);
	process.exit(1);
}
