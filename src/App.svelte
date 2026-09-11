<script lang="ts">
	// import svelteLogo from './assets/svelte.svg'
	// import viteLogo from './assets/vite.svg'
	// import heroImg from './assets/hero.png'
	// import Counter from './lib/TopBar.svelte'

	import Canvas from '$lib/components/Canvas.svelte';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { EditorState, setEditorCtx } from '$lib/core/context.svelte';
	
	import { RectFile } from '$lib/core/file.svelte';
	import { HotspotRect } from 'vtf-js/resources';

	const context = new EditorState();
	setEditorCtx(context);

	context.file = RectFile.fromRects([
		new HotspotRect(0x10, 10, 10, 20, 20),
		new HotspotRect(0x01, 10, 10, 40, 40),
		new HotspotRect(0x02, 10, 20, 20, 80),
		new HotspotRect(0x06, 10, 20, 80, 80),
	]);

</script>

<div id="root">
<!-- sidebar -->
<Sidebar></Sidebar>

<!-- main body -->
<main>
	<Header></Header>
	<div>
		<Canvas></Canvas>
	</div>
</main>
</div>

<style>
	div#root {
		flex: 1 1;
		display: flex;
		overflow: hidden;
	}

	main {
		width: 1fr;
		flex: 1 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	main > div {
		display: flex;
		justify-content: center;
		place-items: center;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}
</style>
