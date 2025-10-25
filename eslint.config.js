/**
 * Root ESLint configuration for SeatKit monorepo
 */

import seatkitConfig from '@seatkit/eslint-config';

export default [
  ...seatkitConfig,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
    ],
  },
];
