<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { HotspotRect } from 'vtf-js/resources';
	import { RectEntry, RectFile } from '$lib/core/file.js';
	import { getState } from '$lib/core/context.svelte.js';

	import SidebarRect from './SidebarRect.svelte';
	import SidebarRectGhost from './SidebarRectGhost.svelte';
	
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Binder from '$lib/core/binder.js';

	let { collapsed }: { collapsed: boolean } = $props();
	
	const editor = getState();

	const HoverSelect = {
		None: 0,
		Select: 1,
		Deselect: 2
	};

	let self: HTMLDivElement;
	let shiftKey = false;
	let hoverSelect = HoverSelect.None;

	onMount(() => {
		return Binder(document)
			.add('keydown', onKeyDown)
			.add('keyup', onKeyUp)
			.add('mouseup', onMouseUp);
	});

	function onMouseDownRect(rectId: number) {
		if (!editor.document) return;

		if (!shiftKey) {
			editor.document.$setSelection([rectId]);
			hoverSelect = HoverSelect.Select;
			return;
		}

		hoverSelect = isIdSelected(rectId)
			? HoverSelect.Deselect
			: HoverSelect.Select;

		onMouseEnterRect(rectId);
	}

	function onMouseEnterRect(id: number) {
		if (!editor.document)
			return;
		if (!hoverSelect)
			return;

		if (hoverSelect === HoverSelect.Select) {
			editor.document.$selectionAdd([id]);
		} else {
			editor.document.$selectionRemove([id]);
		}
	}

	function onMouseUp() {
		hoverSelect = HoverSelect.None;
	}

	function onKeyDown(event: KeyboardEvent) {
		if (!editor.document)
			return;
		if (event.target !== document.body && !self.contains(event.target as Node))
			return;

		shiftKey = event.shiftKey;

		if (event.key === 'Delete' || event.key === 'Backspace') {
			event.preventDefault();
			editor.document.$commitActions();
			editor.document.$rectsRemoveSelected();
			editor.document.$commitActions();
			return;
		}

		if (event.key === 'a' && event.metaKey) {
			event.preventDefault();
			toggleAllSelected();
			return;
		}
		
		if (event.key === 'Escape') {
			event.preventDefault();
			editor.document.$commitActions();
			editor.document.$selectionClear();
			editor.document.$commitActions();
			return;
		}
	}

	function onKeyUp(event: KeyboardEvent) {
		shiftKey = event.shiftKey;
	}

	export function getSelectionSize(): number {
		if (!editor.document) return 0;
		return editor.document.selection.size;
	}

	export function toggleAllSelected() {
		if (!editor.document)
			return;

		editor.document.$commitActions();
		if (editor.document.selection.size) {
			editor.document.$selectionClear();
		} else {
			editor.document.$selectionSetAll();
		}
		editor.document.$commitActions();
	}

	function isIdSelected(rectId: number) {
		if (!editor.document) return false;
		return editor.document.selection.has(rectId);
	}

	function setFlags(rectId: number, flags: number, mask: number) {
		if (!editor.document)
			return;

		editor.document.$commitActions();
		if (shiftKey && editor.document.selection.has(rectId)) {
			editor.document.$setRectFlags(Array.from(editor.document.selection.values()), flags, mask);
		} else {
			editor.document.$setRectFlags([rectId], flags, mask);
		}
		editor.document.$commitActions();
	}

	function addRect() {
		if (!editor.document)
			return;

		editor.document.$rectsAdd([
			new RectEntry(
				new HotspotRect(0x0, 0, 0, editor.document.width, editor.document.height)
			)
		]);
		editor.document.$commitActions();
	}
</script>

<div class:collapsed={collapsed} bind:this={self}>
	{#if editor.document}
		{#each editor.document.rects as _rect, i (_rect.uuid)}
			<div transition:scale={{ duration: 100, easing: cubicOut, start: 0.8 }}>
				<SidebarRect
					rect={editor.document.rects[i]}
					index={i}
					selected={editor.document.selection.has(i)}
					active={false}
					setFlags={(v, m) => setFlags(i, v, m)}
					onmousedown={() => onMouseDownRect(i)}
					onmouseenter={() => onMouseEnterRect(i)}
					></SidebarRect>
			</div>
		{/each}
	{/if}
	<SidebarRectGhost onclick={addRect}></SidebarRectGhost>
</div>

<style>
	div {
		display: flex;
		flex-direction: column;
		gap: 0.3em;
	}
</style>

