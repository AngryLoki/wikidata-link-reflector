import adapter from '@sveltejs/adapter-node';
import {vitePreprocess} from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess({
		postcss: true,
	}),
	kit: {
		adapter: adapter({
			polyfill: false,
		}),
	},
	prerender: {entries: []},
};

export default config;
