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
	]
});
