import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm'],
	target: 'node20',
	outDir: 'dist',
	clean: true,
	dts: true,
	sourcemap: true,
	minify: false, // Keep readable for debugging
});