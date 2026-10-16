<script lang="ts">
	import type {
		EditorState,
		ViewportMaps,
	} from '$lib/core/context.svelte.js';
	import { UploadHandler, UploadType } from '$lib/core/file_uploader.js';
	import { download } from '$lib/core/file_downloader.js';
	import FileUpload from './FileUpload.svelte';
	import * as WebFormat from '$lib/core/formats/web_texture.js';

	let { state, key }: { state: EditorState; key: keyof ViewportMaps } =
		$props();

	let dummy = $derived(
		state.document && state.document.maps[key] !== undefined
			? { name: 'Image' }
			: null,
	);

	const handler = new UploadHandler();

	function oninput(files: FileList | null) {
		const document = state.document;
		if (!files || !files.length || !document) return;

		handler.clear();
		handler.loadFiles(files, UploadType.kMaps).then((success) => {
			if (!success) console.log('Files loaded with warnings!');

			const maps = handler.getResult().maps;
			if (!maps || !maps.color) {
				console.warn('Asset(s) did not contain a color map!');
				return;
			}

			document.maps[key] = maps.color;
		});

		return false;
	}

	function onclear(files: FileList | null) {
		if (state.document) state.document.maps[key] = undefined;
		return false;
	}

	function ondownload() {
		if (!state.document) return;
		const map = state.document.maps[key];
		if (!map) return;

		WebFormat.save(map.decode().coerce(Uint8Array)).then(
			(blob) => {
				download([new File([blob], 'image', { type: blob.type })]);
			},
		);

		return false;
	}
</script>

<FileUpload {dummy} {oninput} {ondownload} {onclear}></FileUpload>
