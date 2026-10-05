<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import { getEditorCtx } from '$lib/core/context.svelte.js';
	import Picker from './pickers/Picker.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';
	import { onMount } from 'svelte';
	import { BakeMode, Baker } from '$lib/core/viewport/baker';
	import Button from './buttons/Button.svelte';
	import Numeric from './inputs/Numeric.svelte';

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
		common: {
			scale: 1,
			radius: 16.0,
			bevel: 32.0,
			expo: 0.5,
		},
		height: {
			on: true,
		},
		normals: {
			on: true,
			dx: false,
		},
	});

	let heightBaker: Baker;
	let normalBaker: Baker;
	let heightCanvas: HTMLCanvasElement;
	let normalCanvas: HTMLCanvasElement;

	const scaleGetSet = {
		get value() {
			return 2 + Math.log2(options.common.scale);
		},
		set value(v: number) {
			options.common.scale = 2 ** (v - 2);
		}
	}

	onMount(() => {
		heightBaker = new Baker(heightCanvas, BakeMode.Height);
		normalBaker = new Baker(normalCanvas, BakeMode.Normal);
	});

	$effect(() => {
		heightBaker?.setRects(context.rects);
		normalBaker?.setRects(context.rects);
	});

	$effect(() => {
		if (context.image) {
			const S = options.common.scale;
			heightBaker?.setSize(context.image.width * S, context.image.height * S, S);
			normalBaker?.setSize(context.image.width * S, context.image.height * S, S);
		} else {
			heightBaker?.setSize(0, 0, 1);
			normalBaker?.setSize(0, 0, 1);
		}
	});

	$effect(() => {
		heightBaker?.setOptions(options.common);
		normalBaker?.setOptions(options.common);
	});

	function bake() {
		if (options.height.on) heightBaker.render();
		if (options.normals.on) normalBaker.render();
	}
</script>

<MenuItem text="Bake" width={'18em'}>
	<b>Bake</b>
	<PickerMultiple
		options={[
			opt('height', options.height),
			opt('normals', options.normals),
		]}
	></PickerMultiple>

	<Button onclick={bake}>Bake</Button>

	<div class="group" hidden={!options.height.on && !options.normals.on}>
		<b>Options</b>
		<label>
			<span>Scale</span>
			<Picker bind:index={scaleGetSet.value} options={['.25x', '.5x', '1x', '2x', '4x']}></Picker>
		</label>
		<label>
			<span>Radius</span>
			<Numeric bind:value={options.common.radius} min="0" max="256" step="8"></Numeric>
		</label>
		<label>
			<span>Bevel</span>
			<Numeric bind:value={options.common.bevel} min="0" max="256" step="8"></Numeric>
		</label>
		<label>
			<span>Exponent</span>
			<Numeric bind:value={options.common.expo} min="0.01" max="2" step="0.01"></Numeric>
		</label>
	</div>

	<div class="group">
		<b>Preview</b>
		<canvas bind:this={heightCanvas}></canvas>
		<canvas bind:this={normalCanvas}></canvas>
	</div>
</MenuItem>

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
