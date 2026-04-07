/**
 * Vitest configuration for @seatkit/api package
 *
 * Extends the shared configuration with API-specific settings
 */

import { defineConfig } from 'vitest/config';
import { createPackageConfig } from '../../vitest.shared.js';

const base = createPackageConfig({
	test: {
		// API-specific test timeout (database operations might take longer)
		testTimeout: 15000,
		hookTimeout: 15000,

		// API-specific environment variables
		env: {
			// Inherit from shared config, can override TEST_DATABASE_URL here if needed
		},

		// Setup files specific to API tests
		setupFiles: [
			// We can add API-specific setup files here later if needed
		],

		// Run test files sequentially to prevent parallel DB writes from interfering.
		// vitest 4 changed pool behavior — fileParallelism:false is the reliable way
		// to serialize test file execution when sharing a single PostgreSQL database.
		fileParallelism: false,
		poolOptions: {
			forks: {
				singleFork: true, // Keep single fork for memory efficiency
			},
		},

		// better-auth-invite-plugin uses extensionless relative imports (./constants
		// instead of ./constants.js) which fail in strict Node.js ESM. Inlining
		// the package through Vite resolves the extensions.
		// Server-side resolve conditions ensure better-auth resolves its Node.js
		// entry (not the browser .mjs bundle) when inlined packages import it.
		server: {
			deps: {
				inline: ['better-auth-invite-plugin'],
			},
		},
	},
});

export default defineConfig({
	...base,
	resolve: {
		conditions: ['node', 'import', 'module', 'default'],
	},
});