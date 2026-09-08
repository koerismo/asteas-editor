<script lang="ts">
	interface Props {
		options: string[];
		index?: number;
		value?: string;
		oninput?(opt: string): void;
	}

	let { options, index = $bindable(-1), value, oninput }: Props = $props();

	$effect(() => {
		if (index < 0 || index >= options.length) return;
		value = options[index];
	});

	function setValue(i: number) {
		index = i;
	}
</script>

<div role="radiogroup">
	{#each options as option, i (i)}
		<button
			role="radio"
			aria-checked={i === index}
			onclick={() => setValue(i)}>{option}</button>
	{/each}
</div>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;
	
	div {
		@include btn.btn-group-accent(false);
		font-size: 0.8em;
	}
</style>
