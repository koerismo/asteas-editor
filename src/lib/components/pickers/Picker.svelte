<script lang="ts">
	import Styles from '$lib/css/components/menu.module.scss';

	interface Props {
		options: string[];
		index?: number;
		// value?: string;
	}

	let { options, index = $bindable(-1) }: Props = $props();

	// $effect(() => {
	// 	if (index < 0 || index >= options.length) return;
	// 	value = options[index];
	// });

	function setValue(i: number) {
		index = i;
	}
</script>

<div role="radiogroup" class={Styles.WideInput}>
	{#each options as option, i (i)}
		<button
			role="radio"
			aria-checked={i === index}
			onclick={() => setValue(i)}
			onmousedown={e => e.stopPropagation()}
			>
			{option}</button>
	{/each}
</div>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;

	div {
		@include btn.btn-group-accent(false);
	}
</style>
