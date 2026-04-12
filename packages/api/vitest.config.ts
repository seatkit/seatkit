/**
 * Vitest configuration for @seatkit/api package
 *
 * Extends the shared configuration with API-specific settings
 */

import { createPackageConfig } from '../../vitest.shared.js';

export default createPackageConfig({
	test: {
		// API-specific test timeout (database operations might take longer)
		testTimeout: 15000,
		hookTimeout: 15000,

		// API-specific environment variables
		env: {
			// Inherit from shared config, can override TEST_DATABASE_URL here if needed
		},

		// Setup files specific to API tests
		setupFiles: [],

		// Run test files sequentially to prevent parallel DB writes from interfering.
		// vitest 4 changed pool behavior — fileParallelism:false is the reliable way
		// to serialize test file execution when sharing a single PostgreSQL database.
		fileParallelism: false,
		poolOptions: {
			forks: {
				singleFork: true,
			},
		},

		// Inline packages with ESM compatibility issues under Node.js:
		// - @opentelemetry/semantic-conventions: directory imports transitively
		//   pulled in by better-auth, incompatible with strict Node.js ESM
		server: {
			deps: {
				inline: [/^@opentelemetry\//],
			},
		},
	},
});
