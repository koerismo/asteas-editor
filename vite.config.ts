import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: '/asteas-editor/',
  resolve: {
	alias: {
		'$lib': resolve('./src/lib')
	}
  }
})
