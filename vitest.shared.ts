/**
 * Shared Vitest configuration for all SeatKit packages
 *
 * This configuration provides common settings that all packages can extend,
 * including test environment variables and database configuration.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Set test environment
		env: {
			NODE_ENV: 'test',
			// Default test database URL for local PostgreSQL
			// Individual packages can override this in their own config
			TEST_DATABASE_URL:
				process.env.TEST_DATABASE_URL ||
				'postgresql://localhost:5432/seatkit_test',
		},

		// Test timeout settings
		testTimeout: 10000, // 10 seconds for database tests
		hookTimeout: 10000, // 10 seconds for setup/teardown

		// Test file patterns
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],

		// Coverage settings (can be overridden by individual packages)
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/**',
				'dist/**',
				'build/**',
				'coverage/**',
				'**/*.d.ts',
				'**/*.config.{js,ts}',
				'**/vitest.config.{js,ts}',
			],
		},

		// Reporter configuration
		reporters: process.env.CI ? ['github-actions', 'json'] : ['verbose'],

		// Fail fast in CI to save resources
		bail: process.env.CI ? 1 : 0,

		// Pool settings for database tests
		pool: 'forks', // Use forks for better database test isolation

		// Setup files (can be extended by individual packages)
		setupFiles: [],

		// Global setup (can be extended by individual packages)
		globalSetup: [],
	},
});

/**
 * Helper function to merge this config with package-specific configuration
 *
 * @param packageConfig - Package-specific Vitest configuration
 * @returns Merged configuration
 */
export function createPackageConfig(packageConfig: any = {}) {
	const baseConfig = defineConfig({
		test: {
			// Set test environment
			env: {
				NODE_ENV: 'test',
				// Default test database URL for local PostgreSQL
				// Individual packages can override this in their own config
				TEST_DATABASE_URL:
					process.env.TEST_DATABASE_URL ||
					'postgresql://localhost:5432/seatkit_test',
			},

			// Test timeout settings
			testTimeout: 10000, // 10 seconds for database tests
			hookTimeout: 10000, // 10 seconds for setup/teardown

			// Test file patterns
			include: ['src/**/*.{test,spec}.{js,ts}'],
			exclude: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],

			// Coverage settings (can be overridden by individual packages)
			coverage: {
				provider: 'v8',
				reporter: ['text', 'json', 'html'],
				exclude: [
					'node_modules/**',
					'dist/**',
					'build/**',
					'coverage/**',
					'**/*.d.ts',
					'**/*.config.{js,ts}',
					'**/vitest.config.{js,ts}',
				],
			},

			// Reporter configuration
			reporters: process.env.CI ? ['github-actions', 'json'] : ['verbose'],

			// Fail fast in CI to save resources
			bail: process.env.CI ? 1 : 0,

			// Pool settings for database tests
			pool: 'forks', // Use forks for better database test isolation

			// Setup files (can be extended by individual packages)
			setupFiles: [],

			// Global setup (can be extended by individual packages)
			globalSetup: [],
		},
	});

	return defineConfig({
		// Merge test configuration
		test: {
			...baseConfig.test,
			...packageConfig.test,

			// Merge arrays properly
			include: [
				...(baseConfig.test?.include || []),
				...(packageConfig.test?.include || []),
			],
			exclude: [
				...(baseConfig.test?.exclude || []),
				...(packageConfig.test?.exclude || []),
			],
			setupFiles: [
				...(baseConfig.test?.setupFiles || []),
				...(packageConfig.test?.setupFiles || []),
			],
			globalSetup: [
				...(baseConfig.test?.globalSetup || []),
				...(packageConfig.test?.globalSetup || []),
			],

			// Merge environment variables
			env: {
				...baseConfig.test?.env,
				...packageConfig.test?.env,
			},
		},

		// Allow other Vite configuration options
		...packageConfig,
	});
}
