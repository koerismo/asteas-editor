<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	let { value = $bindable(),...args }: HTMLInputAttributes = $props();
</script>

<input type="range" bind:value {...args} />

<style>
	input {
		width: auto;
		min-width: 0;
	}
</style>
