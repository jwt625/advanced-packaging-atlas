import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({ pages: 'build', assets: 'build', fallback: undefined, precompress: false, strict: true }),
			paths: { base: (process.env.BASE_PATH ?? '') as '' | `/${string}`, relative: false },
			prerender: { handleHttpError: 'fail' }
		})
	],
	// /sim bundles ../sims/*.yaml and ../engine/data/materials/*.yaml via ?raw imports (DevLog-012 L6)
	server: { fs: { allow: ['..'] } },
	// the /sim solver worker (the app's only worker) as an ES module worker, so its dynamic imports stay separate
	// chunks (engine modules per study type, the RVE table) instead of one inlined file (lane L12, audit A3 M11)
	worker: { format: 'es' }
});
