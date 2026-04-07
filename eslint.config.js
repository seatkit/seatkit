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
      // vitest.config.ts is outside rootDir: src in the engine package tsconfig,
      // so the TypeScript project service can't resolve it during linting.
      'packages/engine/vitest.config.ts',
    ],
  },
];
