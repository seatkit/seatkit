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
];
