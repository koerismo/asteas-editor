<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { RectFile } from '$lib/core/file.svelte.js';
	import { HotspotRect } from 'vtf-js/resources';

	import SidebarRect from './SidebarRect.svelte';
	import SidebarRectGhost from './SidebarRectGhost.svelte';
	
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let { file = $bindable() }: { file: RectFile } = $props();

	let shiftKey = false;
	let activeRects = new SvelteSet<number>();

	onMount(() => {
		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('keyup', onKeyUp);
	});

	function onKeyDown(event: KeyboardEvent) {
		shiftKey = event.shiftKey;

		if (event.key === 'Delete' || event.key === 'Backspace') {
			removeSelected();
			return;
		}
		
		if (event.key === 'Escape') {
			activeRects.clear();
			return;
		}
	}

	function onKeyUp(event: KeyboardEvent) {
		shiftKey = event.shiftKey;
	}

	export function getSelectionSize(): number {
		return activeRects.size;
	}

	export function toggleAllSelected() {
		if (activeRects.size) {
			activeRects.clear();
			return;
		}
	
		for (let i=0; i<file.rects.length; i++)
			activeRects.add(i);
	}

	export function removeSelected() {
		if (!activeRects.size) return;
		file.removeRects(Array.from(activeRects.values()));
		activeRects.clear();
	}

	function selectId(rectId: number) {
		if (shiftKey) {
			if (activeRects.delete(rectId)) return;
		} else {
			activeRects.clear();
		}
		activeRects.add(rectId);
	}

	function isIdSelected(rectId: number) {
		return activeRects.has(rectId);
	}

	function setFlags(rectId: number, flags: number, mask: number) {
		if (shiftKey && activeRects.has(rectId)) {
			file.setRectFlags(Array.from(activeRects.values()), flags, mask);
		} else {
			file.setRectFlags([rectId], flags, mask);
		}
	}

	function addRect() {
		file.addRect(new HotspotRect(0x0, 0, 0, 100, 100));
	}

</script>

<div>
	{#each file.rects as _rect, i (_rect.uuid)}
		<div transition:scale={{ duration: 100, easing: cubicOut, start: 0.8 }}>
			<SidebarRect rect={file.rects[i]} index={i} {selectId} {isIdSelected} setFlags={(v, m) => setFlags(i, v, m)}></SidebarRect>
		</div>
	{/each}
	<SidebarRectGhost onclick={addRect}></SidebarRectGhost>
</div>

<style>
	div {
		display: flex;
		flex-direction: column;
		gap: 0.3em;
	}
</style>

