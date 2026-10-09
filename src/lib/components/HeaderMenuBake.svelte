<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import { getState } from '$lib/core/context.svelte.js';
	import Picker from './pickers/Picker.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';
	import { onMount } from 'svelte';
	import { BakeMode, Baker } from '$lib/core/viewport/baker';
	import Button from './buttons/Button.svelte';
	import Numeric from './inputs/Numeric.svelte';
	import Checkbox from './buttons/Checkbox.svelte';
	import { FileSaver, setFileExt } from '$lib/core/disk_io';

	const editor = getState();
	const mapCache = $derived(editor.viewport.maps);

	const saver = new FileSaver();

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
		heightBaker?.setRects(editor.document?.rects ?? []);
		normalBaker?.setRects(editor.document?.rects ?? []);
	});

	$effect(() => {
		if (editor.document) {
			const S = options.common.scale;
			const w = editor.document.width * S, h = editor.document.height * S;
			heightBaker?.setSize(w, h, S, true);
			normalBaker?.setSize(w, h, S, true);
		} else {
			heightBaker?.setSize(0, 0, 1, true);
			normalBaker?.setSize(0, 0, 1, true);
		}
	});

	$effect(() => {
		heightBaker?.setOptions(options.common);
		normalBaker?.setOptions(options.common);
	});

	function bake() {
		if (options.height.on) {
			heightBaker.render();
			editor.viewport.maps.height = heightBaker.copyToTexture();
		} else {
			editor.viewport.maps.height = undefined;
		}

		if (options.normals.on) {
			normalBaker.render();
			editor.viewport.maps.normal = normalBaker.copyToTexture();
		} else {
			editor.viewport.maps.normal = undefined;
		}
	}

	function canSave() {
		if (!options.normals.on && !options.height.on)
			return false;
		if (options.normals.on && !mapCache.normal)
			return false;
		if (options.height.on && !mapCache.height)
			return false;
		return true;
	}
	
	async function canvasToFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
		return new Promise((resolve, reject) => {
			canvas.toBlob((blob) => {
				if (blob) resolve(new File([blob], filename, { type: 'image/png' }));
				else reject();
			}, 'image/png');
		});
	}

	async function save() {
		if (!editor.document) return;
		const rootName = setFileExt(editor.document.name, '')
		const files: File[] = [];

		if (options.normals.on)
			files.push(await canvasToFile(normalCanvas, rootName + '_normals.png'));
		if (options.height.on)
			files.push(await canvasToFile(heightCanvas, rootName + '_height.png'));

		saver.download(files, rootName + '_bake.zip');
	}
</script>

<MenuItem text="Bake" side="left" width={'18em'}>
	<b>Bake</b>
	<PickerMultiple
		options={[
			opt('height', options.height),
			opt('normals', options.normals),
			// opt('curvature', options.curvature),
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
