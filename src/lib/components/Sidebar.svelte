<script lang="ts">
	import { HotspotRect } from 'vtf-js/resources';
	import { RectFile } from '$lib/core/file.svelte';
	import { onMount } from 'svelte';

	import SidebarList from './SidebarList.svelte';
	import Button from './buttons/Button.svelte';

	import Undo from 'carbon-icons-svelte/lib/Undo.svelte';
	import Redo from 'carbon-icons-svelte/lib/Redo.svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';

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
			<Button onclick={() => file.history.undo()} ><Undo></Undo></Button>
			<Button onclick={() => file.history.redo()} ><Redo></Redo></Button>
			<Button><TrashCan></TrashCan></Button>
		</div>
	</section>
	<section>
		<SidebarList file={file}></SidebarList>
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
	}

	section {
		display: flex;
		flex-direction: column;
		border-bottom: 1px solid var(--border-2);
		padding: 0.4em 0;
		gap: 0.4em;
	}

	section.s-header {
		background-color: var(--bg-2);
		padding-top: 0.4em;
		position: sticky;
		top: 0;
		font-size: 0.85em;
	}
</style>
