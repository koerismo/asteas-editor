<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import { getEditorCtx } from '$lib/core/context.svelte.js';
	import Picker from './pickers/Picker.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';
	import { onMount } from 'svelte';
	import { VImageData } from 'vtf-js';
	import { bakeToHeight, type ImageDataLike } from '$lib/core/bake/height';
	import { BakeMode, Baker } from '$lib/core/viewport/baker';

	const context = getEditorCtx();
	
	function opt(name: string, out: { on: boolean }, desc?: string) {
		return {
			name,
			desc,
			get value() { return out.on },
			set value(v) { out.on = v; },
		}
	}

	const options = $state({
		bump: {
			on: { on: true },
			mode: BakeMode.Height,
			radius: 16.0,
			bevel: 32.0,
			expo: 0.4,
		},
	});

	let baker: Baker;
	let canvas: HTMLCanvasElement;
	
	onMount(() => {
		baker = new Baker(canvas);
	});

	$effect(() => {
		baker?.setRects(context.rects);
		baker?.render();
	});

	$effect(() => {
		if (context.image) {
			// baker?.setSize(256, 256, 1);
			const S = 1 / 1;
			baker?.setSize(context.image.width * S, context.image.height * S, S);
		} else {
			baker?.setSize(0, 0, 1);
		}
	})

	$effect(() => {
		baker?.setOptions(options.bump);
		baker?.render();
	});
</script>

<MenuItem text="Bake" width={'18em'}>
	<b>Save</b>
	<PickerMultiple
		options={[
			opt('bumpmap', options.bump.on)
		]}
	></PickerMultiple>

	{@const disabled = !context.image}
	<div class="group" hidden={!options.bump.on} class:disabled>
		<b>Bumpmap</b>
		<label>
			Mode
			<Picker bind:index={options.bump.mode} options={[
				'none',
				'height', 'normal', 'combined'
			]}></Picker>
		</label>
	</div>

</MenuItem>
<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		width: 128px;
	}

	div.group {
		--gap: 0.4em;
		--hr-margin: 0.1em;

		display: flex;
		flex-direction: column;
		gap: var(--gap);
		border-top: 1px solid var(--border);
		padding: calc(var(--gap) + var(--hr-margin) * 2) 0;
		margin-top: 0.4em;

		&[hidden] {
			display: none;
		}

		&.disabled {
			opacity: 0.5;
		}
	}

	i {
		color: var(--text-3);
		font-size: 0.9em;
	}

	hr {
		border-color: var(--border);
		margin: var(--hr-margin) 0;
	}

	label {
		display: flex;
		gap: 0.6em;
		place-items: center;
		color: var(--text-2);

		span {
			flex-grow: 1;
		}
	}
</style>
