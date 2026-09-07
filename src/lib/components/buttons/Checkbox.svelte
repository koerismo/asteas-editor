<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	let args: Omit<HTMLInputAttributes, 'type'> = $props();
</script>

<input type="checkbox" {...args} />

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;

	input {
		@include btn.btn-fill;

		aspect-ratio: 1 / 1;
		height: 1.8em;
		width: auto;

		border-radius: var(--radius-md);
		border: 1px solid var(--bg);

		padding: 0;
		margin: 0;


		&:checked {
			@include btn.btn-fill-accent(true);
			display: flex;
			
			&::after {
				content: '✓';
				color: var(--bg);

				font-weight: 600;
				font-size: 0.8em;
				width: 100%;
				place-self: center;
				text-align: center;
			}
		}
	}
</style>
