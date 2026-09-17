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

</script>

<article>
	<div class="header">
		<h1>
			<img src={Icon} alt="Asteas Icon" />
			Asteas Editor
		</h1>
		<b>Beta {APP_VERSION}</b>
	</div>
	<hr>
	<div class="content">
		<h3>Import</h3>
		<Upload {onFile}></Upload>
	</div>
	<div class="content">
		<h3>Examples</h3>
		<HelloExample img="" title="Example" author="leukbaars"></HelloExample>
		<HelloExample img="" title="Grating" author="koerismo"></HelloExample>
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