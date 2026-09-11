<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { HotspotRect } from 'vtf-js/resources';
	import { RectFile } from '$lib/core/file.svelte.js';
	import { getEditorCtx  } from '$lib/core/context.svelte.js';

	import SidebarRect from './SidebarRect.svelte';
	import SidebarRectGhost from './SidebarRectGhost.svelte';
	
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Binder from '$lib/core/binder.js';

	let { collapsed }: { collapsed: boolean } = $props();
	
	const context = getEditorCtx();
	let file = $derived(context.file);

	const HoverSelect = {
		None: 0,
		Select: 1,
		Deselect: 2
	};

	let shiftKey = false;
	let hoverSelect = HoverSelect.None;

	onMount(() => {
		return Binder(document)
			.add('keydown', onKeyDown)
			.add('keyup', onKeyUp)
			.add('mouseup', onMouseUp);
	});

	function onMouseDownRect(rectId: number) {
		if (!shiftKey) {
			context.selectId(rectId);
			context.setActive(rectId);
			hoverSelect = HoverSelect.Select;
			return;
		}

		if (context.active !== rectId) {
			context.selectAdd(rectId);
			context.setActive(rectId);
			return;
		}

		hoverSelect = isIdSelected(rectId)
			? HoverSelect.Deselect
			: HoverSelect.Select;

		onMouseEnterRect(rectId);
	}

	function onMouseEnterRect(id: number) {
		if (!hoverSelect)
			return;
		if (hoverSelect === HoverSelect.Select) {
			context.selectAdd(id);
		} else {
			context.selectRemove(id);
			if (context.active === id)
				context.setActive();
		}
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
			context.clearSelection();
			return;
		}
	}

	function onKeyUp(event: KeyboardEvent) {
		shiftKey = event.shiftKey;
	}

	export function getSelectionSize(): number {
		return context.selection.size;
	}

	export function toggleAllSelected() {
		if (context.getSelectSize()) {
			context.clearSelection();
			return;
		}
	
		context.selectAll();
	}

	export function removeSelected() {
		if (!context.getSelectSize()) return;
		context.file!.removeRects(Array.from(context.selection.values()));
		context.clearSelection();
	}

	function isIdSelected(rectId: number) {
		return context.selection.has(rectId);
	}

	function setFlags(rectId: number, flags: number, mask: number) {
		if (shiftKey && context.selection.has(rectId)) {
			file.setRectFlags(Array.from(context.selection.values()), flags, mask);
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
				selected={context.selection.has(i)}
				active={i === context.active}
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

