import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/.next/**',
			'**/e2e/**',
			'**/playwright-report/**',
			'**/test-results/**',
		],
		environment: 'jsdom',
		globals: true,
		passWithNoTests: true,
		setupFiles: ['./src/test/setup.ts'],
	},
});
