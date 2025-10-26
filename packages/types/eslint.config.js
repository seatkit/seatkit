import seatkitConfig from '@seatkit/eslint-config';

export default [
  ...seatkitConfig,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.config.ts', '*.config.js'],
  },
];
