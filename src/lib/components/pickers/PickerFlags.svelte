<script lang="ts">
	import type { Component } from 'svelte';

	interface Props {
		options: [Component | string, number, string | undefined][];
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

<div>
	{#each options as [optContent, v, desc], i (i)}
		<button
			role="checkbox"
			aria-label={desc ?? 'Flag'}
			aria-checked={!!(value & v)}
			onclick={e => onclick(e, v)}>
			{#if typeof optContent === 'string'}
				{optContent}
			{:else}
				<!-- svelte-ignore svelte_component_deprecated -->
				<svelte:component this={optContent}></svelte:component>
			{/if}
		</button>
	{/each}
</div>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;
	
	div {
		@include btn.btn-group-accent(true);
	}

	button > :global(svg) {
		width: 1.6ch;
		vertical-align: middle;
	}

</style>
