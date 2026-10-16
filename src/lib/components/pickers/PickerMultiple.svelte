<script module lang="ts">
	export interface Option {
		readonly name: Component | string;
		readonly desc?: string;
		value: boolean;
	}

	export function opt(name: Component | string, v: { on: boolean }, desc?: string): Option {
		return {
			name, desc,
			get value() { return v.on; },
			set value(_v: boolean) { v.on = _v; },
		}
	}
</script>

<script lang="ts">
	import Styles from '$lib/css/components/menu.module.scss';
	import type { Component } from 'svelte';

	interface Props {
		options: Option[];
		oninput?(): void;
	}

	let { options, oninput }: Props = $props();

	function doClick(i: number) {
		const opt = options[i];
		opt.value = !opt.value;
		oninput?.();
	}

	export function getSelectedCount() {
		let v = 0;
		for (let i=0; i<options.length; i++)
			v += +options[i].value;
		return v;
	}
</script>

<div class={Styles.WideInput}>
	{#each options as option, i (i)}
		<button
			role="checkbox"
			name={option.desc}
			aria-checked={option.value}
			onclick={() => doClick(i)}>{option.name}</button>
	{/each}
</div>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;
	
	div {
		@include btn.btn-group-accent(true);
	}
</style>
