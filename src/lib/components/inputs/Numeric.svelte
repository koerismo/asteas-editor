<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	let { value = $bindable(),...args }: HTMLInputAttributes = $props();
</script>

<input type="number" bind:value {...args} />

<style>
	input {
		width: auto;
		min-width: 0;

		appearance: none;
		color-scheme: dark;

		border: 1px solid var(--bg);
		border-radius: var(--radius-sm);
		background-color: var(--bg);
		color: var(--text-3);

		padding: 0.2em;
		padding-left: 0.4em;

		&:hover {
			background: var(--bg-2);
			color: var(--text);
		}
		
		&:focus-visible {
			outline: 1px solid var(--accent);
		}
	}
</style>
