<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	let { children, variant='', ...args }: { children?: Snippet, variant?: '' | 'icon' } & HTMLButtonAttributes = $props();
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
		
		&[data-variant="icon"] {
			padding-left: 0.2em;
			padding-right: 0.2em;
		}
		
		display: flex;
		justify-content: center;
		place-items: center;
	}
</style>
