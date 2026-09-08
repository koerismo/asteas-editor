<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	let { children, variant='primary', ...args }: { children?: Snippet, variant?: 'primary' | 'secondary' | 'outline' | 'danger' } & HTMLButtonAttributes = $props();
</script>

<button {...args} data-variant={variant}>{@render children?.()}</button>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;

	button {
		@include btn.btn-fill;
		@include btn.btn-radius;

		&:active:not(:disabled) {
			@include btn.btn-fill-accent(false);
		}
		
		display: flex;
		justify-content: center;
		place-items: center;

		> :global(svg) {
			height: 0.9em;
		}
	}
</style>
