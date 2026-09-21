<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import Button from './buttons/Button.svelte';
	import PickerFlags from './pickers/PickerFlags.svelte';
	import { getEditorCtx } from '$lib/core/context.svelte.js';
	import Checkbox from './buttons/Checkbox.svelte';
	import Picker from './pickers/Picker.svelte';
	import type { SaveOptions } from '$lib/core/disk_io';
	import PickerMultiple from './pickers/PickerMultiple.svelte';

	const context = getEditorCtx();

	function display(value: unknown) {
		return value ? '' : 'none';
	}

	function getStatusMsg(): string | undefined {
		if (!context.active)
			return 'No session active.';
		if (!(options.vtf.on || options.hot.on || options.rect.on))
			return 'No targets selected.';
		if (options.vtf.on && !context.image)
			return "No active image to export."
	}

	function opt(name: string, out: { on: boolean }, desc?: string) {
		return {
			name,
			desc,
			get value() { return out.on },
			set value(v) { out.on = v; },
		}
	}

	const options: SaveOptions = $state({
		vtf: {
			on: true,
			create: {
				lossy: true,
				mipmaps: true,
				strata: true,
			}
		},
		hot: { on: false },
		rect: { on: false },
	});

	function onSave() {
		context.io.save(options);
	}

</script>

<MenuItem text="Save" width={'18em'}>
	<b>Save</b>

	<PickerMultiple
		options={[
			opt('vtf', options.vtf),
			opt('hot', options.hot),
			opt('rect', options.rect),
		]}
	></PickerMultiple>

	{@const disabled = !context.image}
	
	<div class="group" hidden={!options.vtf.on} class:disabled>
		<b>Vtf</b>
		<i>{
			context.vtf
				? 'The current VTF will be modified.'
				: 'A new VTF will be generated.'
		}</i>

		{#if !context.vtf}
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
		{/if}

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
