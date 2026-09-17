<script lang="ts">
	import { onMount } from 'svelte';
	import type { CanvasRenderer } from '$lib/core/viewport/canvas.svelte.js';
	import { getEditorCtx } from '$lib/core/context.svelte';
	import LoadingIcon from '@lucide/svelte/icons/loader-circle';

	let canvas: HTMLCanvasElement;
	let renderer: CanvasRenderer;

	let loading = $state(false);

	const context = getEditorCtx();
	
	onMount(() => {
		let cancel = false;

		async function initCanvas() {
			loading = true;
			const { CanvasRenderer } = await import('$lib/core/viewport/canvas.svelte.js');
			if (cancel) return;
			renderer = new CanvasRenderer(canvas, context);
			loading = false;
		}

		initCanvas();
		
		return () => {
			cancel = true;
			renderer?.dispose();
		}
	});
</script>

<div>
	<canvas bind:this={canvas}></canvas>
	<div class="loader" class:loading>
		<LoadingIcon></LoadingIcon>
	</div>
</div>


<style>
	div {
		width: 100%;
		height: 100%;
		position: relative;

		div.loader {
			position: absolute;
			left: 0;
			top: 0;
			right: 0;
			bottom: 0;

			user-select: none;
			pointer-events: none;

			display: none;
			justify-content: center;
			place-items: center;

			&.loading {
				display: flex;
			}
			
			& > :global(svg) {
				animation: spin 0.4s linear infinite;
			}
		}
	}

	canvas {
		width: 100%;
		height: 100%;
	}
</style>