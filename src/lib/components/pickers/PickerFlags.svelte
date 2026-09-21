<script lang="ts">
	import type { Component } from 'svelte';

	type Option = (
		readonly [Component | string, number] |
		readonly [Component | string, number, string]
	)

	interface Props {
		options: readonly Option[];
		value: number;
		oninput?(new_value: number): void;
	}

	let { options, value = $bindable(0), oninput }: Props = $props();

	function onclick(event: MouseEvent, v: number) {
		event.stopPropagation();
		value ^= v;
		oninput?.(value);
	}
</script>

{#snippet renderIcon(Icon: Component)}
	<Icon size="1em"></Icon>
{/snippet}

<div>
	{#each options as [optContent, v, desc], i (i)}
		<button
			role="checkbox"
			title={desc ?? (typeof optContent === 'string' ? optContent : 'Flag')}
			aria-checked={!!(value & v)}
			onclick={e => onclick(e, v)}
			onmousedown={e => e.stopPropagation()}
			>
			{#if typeof optContent === 'string'}
				{optContent}
			{:else}
				{@render renderIcon(optContent)}
			{/if}
		</button>
	{/each}
</div>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;
	
	div {
		@include btn.btn-group-accent(true);
	}

	button {
		display: flex;
		justify-content: center;
		place-items: center;
	}
</style>
