<script lang="ts">
	import { CanvasRenderer } from '$lib/core/canvas.svelte.js';
	import type { RectFile } from '$lib/core/file.svelte';
	import { onMount } from 'svelte';

	let { file }: { file: RectFile } = $props();

	let canvas: HTMLCanvasElement;
	let renderer: CanvasRenderer;

	onMount(() => {
		renderer = new CanvasRenderer(canvas);
		return () => {
			renderer.dispose();
		}
	});
	
	$effect(() => {
		if (!renderer) return;
		renderer.setFile(file);
	})
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		width: 100%;
		height: 100%;
	}
</style>