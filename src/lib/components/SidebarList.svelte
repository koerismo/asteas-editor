<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { HotspotRect } from 'vtf-js/resources';
	import { RectEntry, RectFile } from '$lib/core/file.svelte.js';
	import { getEditorCtx  } from '$lib/core/context.svelte.js';

	import SidebarRect from './SidebarRect.svelte';
	import SidebarRectGhost from './SidebarRectGhost.svelte';
	
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Binder from '$lib/core/binder.js';

	let { collapsed }: { collapsed: boolean } = $props();
	
	const context = getEditorCtx();

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
			context.setSelection([rectId]);
			hoverSelect = HoverSelect.Select;
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
			context.selectionAdd([id]);
		} else {
			context.selectionRemove([id]);
		}
	}

	function onMouseUp() {
		hoverSelect = HoverSelect.None;
	}

	function onKeyDown(event: KeyboardEvent) {
		shiftKey = event.shiftKey;

		if (event.key === 'Delete' || event.key === 'Backspace') {
			context.commitActions();
			context.rectsRemove(Array.from(context.selection));
			context.commitActions();
			return;
		}

		if (event.key === 'a' && event.metaKey) {
			toggleAllSelected();
			return;
		}
		
		if (event.key === 'Escape') {
			context.commitActions();
			context.selectionClear();
			context.commitActions();
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
		context.commitActions();
		if (context.selection.size) {
			context.selectionClear();
		} else {
			context.selectionSetAll();
		}
		context.commitActions();
	}

	function isIdSelected(rectId: number) {
		return context.selection.has(rectId);
	}

	function setFlags(rectId: number, flags: number, mask: number) {
		context.commitActions();
		if (shiftKey && context.selection.has(rectId)) {
			context.setRectFlags(Array.from(context.selection.values()), flags, mask);
		} else {
			context.setRectFlags([rectId], flags, mask);
		}
		context.commitActions();
	}

	function addRect() {
		context.rectsAdd([
			new RectEntry(
				new HotspotRect(0x0, 0, 0, 100, 100)
			)
		]);
		context.commitActions();
	}
</script>

<div class:collapsed={collapsed}>
	{#each context.rects as _rect, i (_rect.uuid)}
		<div transition:scale={{ duration: 100, easing: cubicOut, start: 0.8 }}>
			<SidebarRect
				rect={context.rects[i]}
				index={i}
				selected={context.selection.has(i)}
				active={false}
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

