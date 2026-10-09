<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import Button from './buttons/Button.svelte';
	import { getState } from '$lib/core/context.svelte.js';
	import Checkbox from './buttons/Checkbox.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';

	const editor = getState();

	function opt(name: string, out: { on: boolean }, desc?: string) {
		return {
			name,
			desc,
			get value() { return out.on },
			set value(v) { out.on = v; },
		}
	}

	const options = $state({
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
		obj: { on: false },
	});

	function onSave() {
		// editor.io.save(options);
	}

</script>

<MenuItem text="Load" width={'18em'}>
	<b>Load</b>

	{@const disabled = !editor.document?.vtf}
	
	<div class="group" hidden={!options.vtf.on} class:disabled>
		<b>Vtf</b>
		<i>{
			editor.document?.vtf
				? 'The current VTF will be modified.'
				: 'A new VTF will be generated.'
		}</i>

		{#if !editor.document?.vtf}
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
<!-- 
	<Button onclick={onSave} disabled={!!msg}>Save</Button> -->
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
