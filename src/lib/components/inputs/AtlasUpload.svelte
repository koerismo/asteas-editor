<script lang="ts">
	import type { EditorState } from '$lib/core/context.svelte.js';
	import { UploadHandler, UploadType } from '$lib/core/file_uploader.js';
	import FileUpload from './FileUpload.svelte';
	import { RectEntry } from '$lib/core/file.js';

	let { state }: { state: EditorState } = $props();

	let dummy = $derived(
		state.document && state.document.rects.length > 0
			? { name: 'Atlas' }
			: null,
	);

	const handler = new UploadHandler();

	function oninput(files: FileList | null) {
		const document = state.document;
		if (!files || !files.length || !document) return;

		handler.clear();
		handler.setContext(document);
		
		handler.loadFiles(files, UploadType.kAtlas).then((success) => {
			if (!success) console.log('Files loaded with warnings!');

			const atlas = handler.getResult().atlas;
			if (!atlas) {
				console.warn('Asset(s) did not contain an atlas!');
				return;
			}

			document.setRects(atlas.rects.map((v) => new RectEntry(v)));
			if (atlas.meta) {
				document.width = atlas.meta.width;
				document.height = atlas.meta.height;
			}
		});

		return false;
	}

	function onclear(files: FileList | null) {
		if (state.document?.rects.length) state.document.setRects([]);
		return false;
	}
</script>

<FileUpload {dummy} {oninput} downloadable={false} {onclear}></FileUpload>
