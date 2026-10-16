<script lang="ts">
	import { download } from '$lib/core/file_downloader.js';
	import { getFileName } from '$lib/core/file_uploader';
	import XIcon from '@lucide/svelte/icons/x';
	import DLIcon from '@lucide/svelte/icons/download';
	import type { HTMLInputAttributes } from 'svelte/elements';
	const id = $props.id();

	interface Props {
		files?: File[];
		accept?: string;
		multiple?: boolean;
		dummy?: { name: string } | null;
		downloadable?: boolean;
		/** Skips original functionality if false is returned. */
		ondownload?(): boolean | void;
		/** Skips original functionality if false is returned. */
		onclear?(files: FileList | null): boolean | void;
		oninput?(files: FileList | null): boolean | void;
	}

	let {
		files = $bindable([]),
		accept,
		multiple,
		dummy,
		downloadable = true,
		ondownload,
		oninput,
		onclear,
		...args
	}: Omit<HTMLInputAttributes, 'files' | 'oninput'> & Props = $props();

	let input: HTMLInputElement;
	let has_files = $derived.by(() => {
		if (dummy !== undefined) return dummy != null;
		return !!files.length;
	});

	function handleInput() {
		if (oninput?.(input.files) === false)
			return;

		if (input.files) {
			files = Array.from(input.files!);
		} else {
			files.length = 0;
		}
	}

	function clearInput() {
		if (onclear?.(input.files) === false) return;
		// This forces files to clear
		input.value = '';
		files.length = 0;
	}

	function downloadInput() {
		if (ondownload?.() === false) return;
		if (!files) return;
		download(files);
	}

	function getTitle() {
		if (dummy !== undefined) return dummy == null ? '' : dummy.name;
		if (!files.length) return '';
		const name = getFileName(files[0].name);
		if (files.length > 1) return name + ' (+' + (files.length - 1) + ')';
		return name;
	}
</script>

<div class="upload" data-filled={has_files ? '' : undefined}>
	<label for={id}>
		<span>{getTitle()} </span>
	</label>
	{#if downloadable}
		<button onclick={downloadInput} disabled={!has_files}>
			<DLIcon size="1em" strokeWidth="0.15em"></DLIcon>
		</button>
	{/if}
	<button onclick={clearInput} disabled={!has_files}>
		<XIcon size="1em" strokeWidth="0.15em"></XIcon>
	</button>
</div>

<input
	type="file"
	bind:this={input}
	{id}
	{multiple}
	{accept}
	oninput={handleInput}
	hidden
	{...args}
/>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;

	div {
		@include btn.btn-radius();

		display: flex;

		label {
			width: 100%;
		}

		button {
			width: 4ch;
		}

		&[data-filled] {
			@include btn.btn-fill-accent(false);

			label:hover,
			button:hover {
				background-color: var(--accent-400);
			}

			label {
				color: inherit;
			}
		}

		label {
			// mask: linear-gradient(90deg, #fff 80%, #0000 98%);
			padding: 0.2em 0.6em;
			color: var(--text-3);

			white-space: nowrap;
			overflow: hidden;
			height: calc(1lh + 0.4em);
		}

		label:hover,
		button:hover {
			background-color: var(--bg-2);
		}

		button {
			appearance: none;
			background: none;
			border: none;
			border-left: 1px solid var(--bg);

			color: inherit;
			font: inherit;

			margin: 0;
			padding: 0;

			display: flex;
			justify-content: center;
			place-items: center;

			&:disabled {
				background: var(--bg-2);
			}
		}
	}
</style>
