<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import Button from './buttons/Button.svelte';
	import { getState } from '$lib/core/context.svelte.js';
	import {
		AtlasDownloadHandler,
		download,
		type DownloadOptions,
	} from '$lib/core/file_downloader.js';
	import Checkbox from './buttons/Checkbox.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';

	const editor = getState();

	function getStatusMsg(): string | undefined {
		if (!editor.document) return 'No session active.';
		if (!(
			options.vtf.on ||
			options.hot.on ||
			options.rect.on ||
			options.obj.on
		))
			return 'No targets selected.';
		if (options.vtf.on && !editor.document.maps.color)
			return 'No active image to export.';
	}

	function opt(name: string, out: { on: boolean }, desc?: string) {
		return {
			name,
			desc,
			get value() {
				return out.on;
			},
			set value(v) {
				out.on = v;
			},
		};
	}

	const options: DownloadOptions = $state({
		vtf: {
			on: false,
			source: undefined,
		},
		hot: { on: false },
		rect: { on: false },
		obj: { on: true },
	});

	async function onSave() {
		if (!editor.document) return;
		const downloader = new AtlasDownloadHandler(editor.document);
		const files = await downloader.toCollection(options);
		await download(files, editor.document.name);
	}
</script>

<MenuItem text="Save" width={'18em'}>
	<b>Save</b>

	<PickerMultiple
		options={[
			opt('vtf', options.vtf),
			opt('hot', options.hot),
			opt('rect', options.rect),
			opt('obj', options.obj),
		]}
	></PickerMultiple>

	{@const disabled = !editor.document}

	<div class="group" hidden={!options.vtf.on} class:disabled>
		<b>Vtf</b>
		<!-- <i>{
			editor.document?.vtf
				? 'The current VTF will be modified.'
				: 'A new VTF will be generated.'
		}</i> -->

		<!-- {#if !editor.document?.vtf}
			<label>
				<span>Use DXT</span>
				<Checkbox bind:checked={options.vtf.create.lossy} {disabled}></Checkbox>
			</label>
			<label>
				<span>Generate mipmaps</span>
				<Checkbox bind:checked={options.vtf.create.mipmaps} {disabled}></Checkbox>
			</label>
			<label>
				<span>Use Strata compression</span>
				<Checkbox bind:checked={options.vtf.create.strata} {disabled}></Checkbox>
			</label>
		{/if} -->
	</div>

	<div class="group" hidden={!options.hot.on}>
		<b>Hotfile</b>
		<i>No options.</i>
	</div>

	<div class="group" hidden={!options.rect.on}>
		<b>Rectfile</b>
		<i>No options.</i>
		<!-- <label>
			<span>Metadata extension</span>
			<Checkbox></Checkbox>
		</label> -->
	</div>

	{@const msg = getStatusMsg()}
	{#if msg}
		<i>{msg}</i>
	{/if}

	<Button onclick={onSave} disabled={!!msg}>Save</Button>
</MenuItem>

<style>
	div.group {
		--gap: 0.4em;
		--hr-margin: 0.1em;

		display: flex;
		flex-direction: column;
		gap: var(--gap);
		border-top: 1px solid var(--border);
		padding: calc(var(--gap) + var(--hr-margin) * 2) 0;
		margin-top: 0.4em;

		&[hidden] {
			display: none;
		}

		&.disabled {
			opacity: 0.5;
		}
	}

	i {
		color: var(--text-3);
		font-size: 0.9em;
	}

	hr {
		border-color: var(--border);
		margin: var(--hr-margin) 0;
	}

	label {
		display: flex;
		gap: 0.6em;
		place-items: center;
		color: var(--text-2);

		span {
			flex-grow: 1;
		}
	}
</style>
