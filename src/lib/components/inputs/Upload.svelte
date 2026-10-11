<script lang="ts">
	import { getFileName } from '$lib/core/file_uploader';
	import XIcon from '@lucide/svelte/icons/x';
	import type { HTMLInputAttributes } from 'svelte/elements';
	const id = $props.id();

	interface Props {
		files?: FileList | null;
		accept?: string;
		multiple?: boolean;
		onclear?(): void;
		oninput?(): void;
	}

	let {
		files = $bindable(null),
		multiple,
		accept,
		oninput,
		onclear,
		...args
	}: HTMLInputAttributes & Props = $props();
	let input: HTMLInputElement;

	let has_files = $state.raw(false);
	
	function handleInput() {
		files = input.files!;
		has_files = !!files?.length;
		oninput?.();
	}

	function handleClear() {
		// This forces files to clear
		input.value = '';
		files = input.files;
		has_files = false;
		onclear?.();
	}

	function getTitle() {
		if (!files || !files.length) return '';
		const name = getFileName(files[0].name);
		if (files.length > 1) return name + ' (+' + (files.length - 1) + ')';
		return name; 
	}
</script>

<div class="upload" data-filled={has_files ? '' : undefined}>
	<label for="{id}">
		<span>{getTitle()} </span>
	</label>
	<button onclick={handleClear} disabled={!has_files}>
		<XIcon size="1em" strokeWidth="0.15em"></XIcon>
	</button>
</div>


<input type="file" bind:this={input} {id} {multiple} {accept} oninput={handleInput} hidden {...args}>

<style lang="scss">
	@use '$lib/css/components/button.scss' as btn;

	div {
		@include btn.btn-radius();

		display: grid;
		grid-template-columns: 1fr 3ch;

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