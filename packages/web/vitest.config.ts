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
		environment: 'node',
		globals: true,
		passWithNoTests: true,
	},
});
