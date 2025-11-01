import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts', 'src/lib/utils.ts', 'src/components/glass-container.tsx'],
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	external: ['react', 'react-dom'],
	treeshake: true,
	splitting: false,
});
