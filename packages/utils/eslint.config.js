import baseConfig from '@seatkit/eslint-config';

export default [
	...baseConfig,
	{
		ignores: ['vitest.config.ts', 'dist/**'],
	},
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			globals: {
				process: 'readonly',
				console: 'readonly',
			},
		},
	},
	{
		files: ['src/test-utils.ts'],
		rules: {
			// TypeScript handles Response type checking, so disable no-undef for DOM types
			'no-undef': 'off',
		},
	},
];
