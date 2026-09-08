<script lang="ts">
	import { HotspotRect } from 'vtf-js/resources';
	import { RectFile } from '$lib/core/file.svelte';
	import { onMount } from 'svelte';

	import SidebarList from './SidebarList.svelte';
	import Button from './buttons/Button.svelte';

	import IconUndo from '@lucide/svelte/icons/undo';
	import IconRedo from '@lucide/svelte/icons/redo';
	import TrashCan from '@lucide/svelte/icons/trash';
	import IconSelect from '@lucide/svelte/icons/square-dashed-text';

	let rectList = $state<SidebarList>();
	let file = $state<RectFile>(
		RectFile.fromRects([
			new HotspotRect(0x10, 10, 10, 20, 20),
			new HotspotRect(0x01, 10, 10, 40, 40),
			new HotspotRect(0x02, 10, 20, 20, 80),
			new HotspotRect(0x06, 10, 20, 80, 80),
		])
	);

	onMount(file.history.mount.bind(file.history));
</script>

<aside>
	<section class="s-header">
		<div>
			<Button disabled={!file?.history.sCanUndo} onclick={() => file.history.undo()} ><IconUndo></IconUndo></Button>
			<Button disabled={!file?.history.sCanRedo} onclick={() => file.history.redo()} ><IconRedo></IconRedo></Button>
			<Button disabled={!(rectList?.getSelectionSize())} onclick={() => rectList?.removeSelected()}><TrashCan></TrashCan></Button>
			<Button disabled={!rectList} onclick={() => rectList!.toggleAllSelected()}><IconSelect></IconSelect></Button>
		</div>
	</section>
	<section>
		<SidebarList bind:this={rectList} file={file}></SidebarList>
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
		}

		background-color: var(--bg-2);
		padding-top: 0.4em;
		position: sticky;
		top: 0;
		font-size: 0.85em;
	}
</style>
