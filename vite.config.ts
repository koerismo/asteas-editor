import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
// import { analyzer } from 'vite-bundle-analyzer';

// https://vite.dev/config/
export default defineConfig({
	plugins: [svelte(), /* analyzer() */],
	base: '/asteas-editor/',
	resolve: {
		alias: {
			$lib: resolve('./src/lib'),
		},
	},
	define: {
		APP_VERSION: JSON.stringify(process.env.npm_package_version),
	},
});
