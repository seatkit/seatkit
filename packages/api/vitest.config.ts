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
		setupFiles: [
			// We can add API-specific setup files here later if needed
		],

		// API tests might need more isolation due to database operations
		poolOptions: {
			forks: {
				singleFork: true, // Ensure database tests don't interfere with each other
			},
		},
	},
});