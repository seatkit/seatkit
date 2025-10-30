import seatkitConfig from '@seatkit/eslint-config';

/** @type {import('eslint').Linter.Config[]} */
export default [
	...seatkitConfig,
	{
		ignores: [
			'.next/**',
			'node_modules/**',
			'dist/**',
			'playwright-report/**',
			'test-results/**',
			'e2e/**',
			'playwright.config.ts',
			'**/*.test.ts',
			'**/*.test.tsx',
			'**/*.spec.ts',
			'**/*.spec.tsx',
		],
	},
	{
		files: ['**/*.tsx', '**/*.ts'],
		rules: {
			// Allow PascalCase for React components
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'function',
					format: ['camelCase', 'PascalCase'],
				},
			],
			// React components don't need explicit return types (JSX is self-documenting)
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			// React is in scope with React 17+ JSX transform
			'no-undef': 'off',
		},
	},
];
