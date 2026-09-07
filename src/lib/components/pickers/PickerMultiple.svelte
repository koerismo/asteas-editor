<script lang="ts">

	interface Props {
		options: string[];
		selected?: Record<number, boolean>;
		value?: string;
		oninput?(): void;
	}

	let { options, selected = $bindable({}), oninput }: Props = $props();

	function doClick(i: number) {
		selected[i] = !selected[i];
		oninput?.();
	}
</script>

<div>
	{#each options as option, i (i)}
		<button
			role="checkbox"
			aria-checked={selected[i]}
			onclick={() => doClick(i)}>{option}</button>
	{/each}
</div>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;
	
	div {
		@include btn.btn-group-accent(true);
	}
</style>
