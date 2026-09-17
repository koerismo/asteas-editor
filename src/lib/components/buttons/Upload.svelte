<script lang="ts">
	import UploadIcon from '@lucide/svelte/icons/upload';
	import type { HTMLInputAttributes } from 'svelte/elements';
	const id = $props.id();
	let { onFile, ...args }: HTMLInputAttributes & { onFile?(files: FileList): void } = $props();
	let input: HTMLInputElement;

	function oninput() {
		if (input.files != null)
			onFile?.(input.files);
	}
</script>

<label for="upload-{id}">
	<span>import</span>
	<UploadIcon size="1.0em"></UploadIcon>
</label>

<input bind:this={input} type="file" id="upload-{id}" {oninput} hidden {...args}>

<style>
	label {
		display: flex;
		justify-content: center;
		place-items: center;
		gap: 0.5em;
		
		font-size: 1.0em;

		transition: 0.2s ease-out;

		height: 100%;
		background-color: var(--bg);
		color: var(--text-4);

		border: 1px solid var(--border-2);
		border-radius: var(--radius-lg);

		padding: 2em 1em;

		cursor: pointer;

		&:hover {
			background-color: var(--bg-2);
			color: var(--text);
			border-color: var(--border-3);
		}
	}
</style>