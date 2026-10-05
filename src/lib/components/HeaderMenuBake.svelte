<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import { getEditorCtx } from '$lib/core/context.svelte.js';
	import Picker from './pickers/Picker.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';
	import { onMount } from 'svelte';
	import { VImageData } from 'vtf-js';
	import { bakeToHeight, type ImageDataLike } from '$lib/core/bake/height';
	import { BakeMode } from '$lib/core/viewport/baker';

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
			height: { on: true },
			normal: { on: true },
			radius: 0.0,
			bevel: 32.0,
		},
	});

	function getBakeMode() {
		if (!options.bump.on) return BakeMode.None;
		const nrm = options.bump.normal.on;
		const height = options.bump.height.on;
		if (nrm && height) return BakeMode.Combined;
		if (nrm) return BakeMode.Normal;
		if (height) return BakeMode.Height;
		return BakeMode.None;
	}

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;

	const w = 1024;
	const vimage = new VImageData(new Uint8Array(w * w * 4), w, w);

	onMount(() => {
		ctx = canvas.getContext('2d')!;
	});

	let _busy = false;
	let _timeout: number | undefined;
	$effect(() => {
		const rects = context.rects;
		const bevel = options.bump.bevel;
		const radius = options.bump.radius;

		if (_busy) return;
		clearTimeout(_timeout);
		_timeout = setTimeout(async () => {
			console.log('building...');
			_busy = true;
			const p1 = performance.now();
			console.time('generated');
			bakeToHeight(rects, bevel, radius, vimage);
			console.timeEnd('generated');
			// await bakeToHeightThreaded(rects, radius, vimage);
			const image = new ImageData(new Uint8ClampedArray(vimage.data.buffer), vimage.width, vimage.height);
			ctx.putImageData(image, 0, 0)
			_busy = false;
		}, 50);
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
			<Picker options={[
				'height', 'normal', 'combined'
			]}></Picker>
		</label>
	</div>

</MenuItem>
<canvas bind:this={canvas} width={w} height={w}></canvas>

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
