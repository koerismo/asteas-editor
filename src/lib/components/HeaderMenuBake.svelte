<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import { getState } from '$lib/core/context.svelte.js';
	import Picker from './pickers/Picker.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';
	import { onMount } from 'svelte';
	import { BakeMode, Baker } from '$lib/core/viewport/baker';
	import Button from './buttons/Button.svelte';
	import Numeric from './inputs/Numeric.svelte';
	import Checkbox from './inputs/Checkbox.svelte';

	import Styles from '$lib/css/components/menu.module.scss';

	import { setFileExt } from '$lib/core/file_uploader.js';
	import { download } from '$lib/core/file_downloader.js';

	const editor = getState();

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
			heightBaker?.setSize(w, h, S);
			normalBaker?.setSize(w, h, S);
		} else {
			heightBaker?.setSize(0, 0, 1);
			normalBaker?.setSize(0, 0, 1);
		}
	});

	$effect(() => {
		heightBaker?.setOptions(options.common);
		normalBaker?.setOptions(options.common);
	});

	async function bake() {
		if (!editor.document)
			return;

		if (options.height.on) {
			heightBaker.render();
			editor.document.maps.height = heightBaker.getData();
		} else {
			editor.document.maps.height = undefined;
		}

		if (options.normals.on) {
			normalBaker.render();
			editor.document.maps.normal = normalBaker.getData();
		} else {
			editor.document.maps.normal = undefined;
		}
	}

	function canSave() {
		if (!editor.document)
			return false;
		if (!options.normals.on && !options.height.on)
			return false;
		if (options.normals.on && !editor.document.maps.normal)
			return false;
		if (options.height.on && !editor.document.maps.height)
			return false;
		return true;
	}

	async function save() {
		if (!editor.document) return;
		const rootName = setFileExt(editor.document.name, '')
		const files: File[] = [];

		if (options.normals.on)
			files.push(new File([await normalBaker.toBlob()], rootName + '_normals.png'));
		if (options.height.on)
			files.push(new File([await heightBaker.toBlob()], rootName + '_height.png'));

		download(files, rootName + '_bake.zip');
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


	<div class={Styles.Group} class:disabled={!options.height.on && !options.normals.on}>
		<b>Options</b>
		<label class={Styles.Row}>
			<span>Scale</span>
			<Picker bind:index={scaleGetSet.value} options={['.25x', '.5x', '1x', '2x', '4x']}></Picker>
		</label>
		<label class={Styles.Row}>
			<span>Radius</span>
			<Numeric bind:value={options.common.radius} min="0" max="256" step="8"></Numeric>
		</label>
		<label class={Styles.Row}>
			<span>Bevel</span>
			<Numeric bind:value={options.common.bevel} min="0" max="256" step="8"></Numeric>
		</label>
		<label class={Styles.Row}>
			<span>Exponent</span>
			<Numeric bind:value={options.common.expo} min="0.1" max="4.0" step="0.1"></Numeric>
		</label>
		<!-- <label>
			<span>DirectX</span>
			<Checkbox bind:checked={options.normals.dx}></Checkbox>
		</label> -->
	</div>

	<div class={Styles.Group}>
		<b>Preview</b>
		<div class="preview">
			<canvas bind:this={heightCanvas} width="256" height="256"></canvas>
			<canvas bind:this={normalCanvas} width="256" height="256"></canvas>
		</div>
	</div>
</MenuItem>

<style>

div.preview {
	display: flex;
	gap: 0.5em;

	canvas {
			max-width: 100%;
			width: 100%;
			aspect-ratio: 1 / 1;
			object-fit: contain;
			background-color: var(--bg);
			border-radius: var(--radius-sm);
		}
	}
</style>
