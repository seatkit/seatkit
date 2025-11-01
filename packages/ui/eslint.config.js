import seatKitConfig from '@seatkit/eslint-config';

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    ...seatKitConfig,
];
