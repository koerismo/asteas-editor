<script lang="ts">
	import { onMount } from 'svelte';
	import { CanvasRenderer } from '$lib/core/canvas.svelte.js';

	let canvas: HTMLCanvasElement;
	let renderer: CanvasRenderer;

	onMount(() => {
		renderer = new CanvasRenderer(canvas);
		return () => {
			renderer.dispose();
		}
	});
</script>

<canvas bind:this={canvas}></canvas>

<style>
	canvas {
		width: 100%;
		height: 100%;
	}
</style>