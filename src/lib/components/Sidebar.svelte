<script lang="ts">
	import { HotspotRect } from 'vtf-js/resources';
	import { onMount } from 'svelte';

	import { RectFile } from '$lib/core/file.svelte.js';
	import { getEditorCtx } from '$lib/core/context.svelte.js';

	import SidebarList from './SidebarList.svelte';
	import Button from './buttons/Button.svelte';

	import IconUndo from '@lucide/svelte/icons/undo';
	import IconRedo from '@lucide/svelte/icons/redo';
	import TrashCan from '@lucide/svelte/icons/trash';
	import IconSelect from '@lucide/svelte/icons/square-dashed-mouse-pointer';
	import IconDeselect from '@lucide/svelte/icons/square-minus';
	import IconCollapse from '@lucide/svelte/icons/chevrons-down-up';
	import IconExpand from '@lucide/svelte/icons/unfold-vertical';

	const context = getEditorCtx();

	let collapsed = $state(false);
	let rectList = $state<SidebarList>();

	$effect(() => {
		return context.mount();
	});

</script>

<aside>
	<section class="s-header">
		<div>
			<Button
				variant="icon"
				disabled={!context.canUndo()}
				onclick={() => context.undo()}
				title="Undo"
				><IconUndo></IconUndo></Button
			>
			<Button
				variant="icon"
				disabled={!context.canRedo()}
				onclick={() => context.redo()}
				title="Redo"
				><IconRedo></IconRedo></Button
			>
			<Button
				variant="icon"
				disabled={!context.selection.size}
				onclick={() => context.rectsRemoveSelected()}
				title="Delete selected"
				><TrashCan></TrashCan></Button
			>
			<div class="divider"></div>
			<Button
				variant="icon"
				disabled={!rectList}
				onclick={() => rectList!.toggleAllSelected()}
				title="Toggle all selected"
			>
				{#if rectList?.getSelectionSize()}
					<IconDeselect></IconDeselect>
				{:else}
					<IconSelect></IconSelect>
				{/if}
			</Button>
			<Button
				variant="icon"
				onclick={() => {collapsed = !collapsed;
				}}
				title="Toggle items collapsed"
			>
				{#if collapsed}
					<IconExpand></IconExpand>
				{:else}
					<IconCollapse></IconCollapse>
				{/if}
			</Button>
		</div>
	</section>
	<section>
		{#if context.active}
			<SidebarList {collapsed} bind:this={rectList}></SidebarList>
		{/if}
	</section>
</aside>

<style>
	aside {
		background-color: var(--bg-2);
		border-right: 1px solid var(--border);
		padding: 0 0.4em 10vh 0.4em;

		display: flex;
		flex-direction: column;

		overflow-y: scroll;
		scrollbar-width: thin;
		scrollbar-color: var(--bg-3) var(--bg-2);
		height: 100vh;

		min-width: 16em;
	}

	section {
		display: flex;
		flex-direction: column;
		border-bottom: 1px solid var(--border-2);
		padding: 0.4em 0;
		gap: 0.4em;
	}

	section.s-header {
		> div {
			display: flex;
			gap: 0.2em;

			> div {
				flex-grow: 1;
			}
		}

		background-color: var(--bg-2);
		padding-top: 0.4em;
		position: sticky;
		top: 0;
		font-size: 1em;
	}
</style>
