<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		children,
		element = $bindable(),
		width,
		...args
	}: {
		children?: any;
		element?: HTMLDivElement;
		width?: string;
	} & HTMLAttributes<HTMLDivElement> = $props();
</script>

<div {...args} style:width={width} bind:this={element} popover="auto" class="sheet">
	{@render children?.()}
</div>

<style>
	div.sheet {
		color: unset;
		background: var(--bg-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);

		padding: 0.5em;
		position: absolute;
		inset: unset;

		margin-top: 0.2em;
	}

	div:popover-open {
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}
</style>
