<script lang="ts">
	let {
		onclick,
	}: {
		onclick(): void;
	} = $props();

	function onClick(event: MouseEvent) {
		event.stopPropagation();
		onclick();
	}
</script>

<button
	aria-label="Create Region"
	class="rect"
	onclick={onClick}
>+</button>

<style>
	button.rect {
		display: flex;
		flex-direction: column;

		padding: 0.8em 0.6em;
		user-select: none;

		background-color: var(--bg-2);
		color: var(--border-2);
		border: 1px solid currentColor;
		border-radius: var(--radius-lg);

		cursor: pointer;

		&:focus {
			color: var(--text-3);
		}
		
		&:hover, &:active {
			color: var(--accent);
		}
	}
</style>
