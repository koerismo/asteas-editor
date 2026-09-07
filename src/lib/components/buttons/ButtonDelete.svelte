<script lang="ts">
	let { onclick }: { onclick?(): void } = $props();
</script>

<button {onclick} aria-label="Delete"></button>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;
	
	button {
		@include btn.btn-fill;

		padding: 0.3rem;
		border-radius: var(--radius-sm);
	}
</style>
