<script lang="ts">
	import Upload from "./buttons/Upload.svelte";
	import HelloExample from "./HelloExample.svelte";
	import Icon from '$lib/assets/logo-white.svg';
	import { getEditorCtx } from "$lib/core/context.svelte";
	import { EditorInitializer } from "$lib/core/loader";
	
	const context = getEditorCtx();
	const loader = new EditorInitializer(context);

	function onFile(files: FileList) {
		if (!files.length) return;
		loader.loadFile(files[0]);
	}

	import ThumbExample from '$lib/assets/examples/thumb_example.jpg';
	import ThumbGrating from '$lib/assets/examples/thumb_grating.jpg';

	import FileExample from '$lib/assets/examples/example.vtf?url';
	import FileGrating from '$lib/assets/examples/grating.vtf?url';
</script>

{#snippet makeExample(thumb: string, url: string, title: string, author: string)}
	<HelloExample
		{thumb}
		{url}
		{loader}
		{title}
		{author}></HelloExample>
{/snippet}

<article>
	<div class="header">
		<h1>
			<img src={Icon} alt="Asteas Icon" />
			Asteas Atlas Editor
		</h1>
		<b>ALPHA {APP_VERSION}</b>
	</div>
	<hr>
	<div class="content">
		<h3>Import</h3>
		<Upload {onFile}></Upload>
	</div>
	<div class="content">
		<h3>Examples</h3>
		{@render makeExample(ThumbExample, FileExample, 'Example', 'leukbaars')}
		{@render makeExample(ThumbGrating, FileGrating, 'Grating', 'koerismo')}
	</div>
</article>

<style>
	h1 {
		margin: 0;
		line-height: 1.0;
	}

	h3 {
		margin: 0;
	}

	b {
		font-weight: 900;
		font-size: 0.8em;
		color: var(--text-3)
	}

	div.header {
		grid-column: 1 / 3;
	}

	div.content {
		display: flex;
		flex-direction: column;
		justify-content: stretch;
		gap: 1rem;
	}

	hr {
		height: 1px;
		width: 100%;
		grid-column: 1 / 3;

		border: none;
		border-bottom: 1px solid var(--border-3);
	}

	img {
		height: 1lh;
	}

	article {
		padding: 1em;
		margin: auto;
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr 1fr;
		grid-auto-rows: min-content;

		width: 100%;
		max-width: 40em;
		min-height: 50vh;
	}
</style>