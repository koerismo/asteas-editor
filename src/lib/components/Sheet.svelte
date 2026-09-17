<script lang="ts">
	let { children }: { children?: any } = $props();
</script>

<div class="sheet">
	{@render children?.()}
</div>

<style>
	div.sheet {
		display: grid;
		grid-template-columns: auto auto;
		grid-auto-rows: min-content;
		gap: 0.2em;
	}
</style>