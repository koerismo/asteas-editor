<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { RectFile } from '$lib/core/file.svelte.js';
	import { HotspotRect } from 'vtf-js/resources';

	import SidebarRect from './SidebarRect.svelte';
	import SidebarRectGhost from './SidebarRectGhost.svelte';
	
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Binder from '$lib/core/binder.js';

	let { file = $bindable(), collapsed }: { file: RectFile, collapsed: boolean } = $props();

	const HoverSelect = {
		None: 0,
		Select: 1,
		Deselect: 2
	};

	let shiftKey = false;
	let hoverSelect = HoverSelect.None;
	let activeRects = new SvelteSet<number>();

	onMount(() => {
		return Binder(document)
			.add('keydown', onKeyDown)
			.add('keyup', onKeyUp)
			.add('mouseup', onMouseUp);
	});

	function onMouseDownRect(rectId: number) {
		if (!shiftKey) {
			activeRects.clear();
			activeRects.add(rectId);
			hoverSelect = HoverSelect.Select;
			return;
		}

		hoverSelect = isIdSelected(rectId)
			? HoverSelect.Deselect
			: HoverSelect.Select;

		onMouseEnterRect(rectId);
	}

	function onMouseEnterRect(id: number) {
		if (!hoverSelect) return;
		if (hoverSelect === HoverSelect.Select)
			activeRects.add(id);
		else
			activeRects.delete(id);
	}

	function onMouseUp() {
		hoverSelect = HoverSelect.None;
	}

	function onKeyDown(event: KeyboardEvent) {
		shiftKey = event.shiftKey;

		if (event.key === 'Delete' || event.key === 'Backspace') {
			removeSelected();
			return;
		}

		if (event.key === 'a' && event.metaKey) {
			toggleAllSelected();
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

<div class:collapsed={collapsed}>
	{#each file.rects as _rect, i (_rect.uuid)}
		<div transition:scale={{ duration: 100, easing: cubicOut, start: 0.8 }}>
			<SidebarRect
				rect={file.rects[i]}
				index={i}
				selected={activeRects.has(i)}
				setFlags={(v, m) => setFlags(i, v, m)}
				onmousedown={() => onMouseDownRect(i)}
				onmouseenter={() => onMouseEnterRect(i)}
				></SidebarRect>
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

