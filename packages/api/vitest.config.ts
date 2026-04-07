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

		// API tests might need more isolation due to database operations
		poolOptions: {
			forks: {
				singleFork: true, // Ensure database tests don't interfere with each other
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