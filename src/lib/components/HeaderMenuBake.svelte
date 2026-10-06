<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import { getEditorState, getViewState } from '$lib/core/context.svelte.js';
	import Picker from './pickers/Picker.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';
	import { onMount } from 'svelte';
	import { BakeMode, Baker } from '$lib/core/viewport/baker';
	import Button from './buttons/Button.svelte';
	import Numeric from './inputs/Numeric.svelte';
	import Checkbox from './buttons/Checkbox.svelte';

	const editor = getEditorState();
	const view = getViewState();

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
			radius: 0.0,
			bevel: 8.0,
			expo: 1.8,
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
		heightBaker?.setRects(editor.rects);
		normalBaker?.setRects(editor.rects);
	});

	$effect(() => {
		if (editor.image) {
			const S = options.common.scale;
			heightBaker?.setSize(editor.image.width * S, editor.image.height * S, S);
			normalBaker?.setSize(editor.image.width * S, editor.image.height * S, S);
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
		if (options.height.on) {
			heightBaker.render();
			view.maps.height = heightBaker.copyToTexture();
		} else {
			view.maps.height = undefined;
		}

		if (options.normals.on) {
			normalBaker.render();
			view.maps.normal = normalBaker.copyToTexture();
		} else {
			view.maps.normal = undefined;
		}
	}

	function canSave() {
		if (!options.normals.on && !options.height.on)
			return false;
		if (options.normals.on && !view.maps.normal)
			return false;
		if (options.height.on && !view.maps.height)
			return false;
		return true;
	}

	function save() {

	}
</script>

<MenuItem text="Bake" side="left" width={'18em'}>
	<b>Bake</b>
	<PickerMultiple
		options={[
			opt('height', options.height),
			opt('normals', options.normals),
		]}
	></PickerMultiple>

	<Button onclick={bake}>Bake</Button>
	<Button onclick={save} disabled={!canSave()}>Save</Button>


	<div class="group" class:disabled={!options.height.on && !options.normals.on}>
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
			<Numeric bind:value={options.common.expo} min="0.1" max="4.0" step="0.1"></Numeric>
		</label>
		<!-- <label>
			<span>DirectX</span>
			<Checkbox bind:checked={options.normals.dx}></Checkbox>
		</label> -->
	</div>

	<div class="group">
		<b>Preview</b>
		<div class="preview">
			<canvas bind:this={heightCanvas} width="256" height="256"></canvas>
			<canvas bind:this={normalCanvas} width="256" height="256"></canvas>
		</div>
	</div>
</MenuItem>

<style>
	canvas {
		max-width: 100%;
	}

	div.preview {
		display: flex;
		gap: 0.5em;

		canvas {
			width: 100%;
			aspect-ratio: 1 / 1;
			background-color: var(--bg);
			border-radius: var(--radius-sm);
		}
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

		&.disabled {
			opacity: 0.5;
		}
	}

	/* i {
		color: var(--text-3);
		font-size: 0.9em;
	} */

	hr {
		border-color: var(--border);
		margin: var(--hr-margin) 0;
	}

	label {
		display: flex;
		gap: 0.6em;
		place-items: center;
		color: var(--text-2);

		:global(input[type="number"]) {
			min-width: 50%;
		}

		span {
			flex-grow: 1;
		}
	}
</style>
