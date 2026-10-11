<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import Button from './buttons/Button.svelte';
	import { getState } from '$lib/core/context.svelte.js';
	import Checkbox from './buttons/Checkbox.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';
	import Upload from './inputs/Upload.svelte';
	import Numeric from './inputs/Numeric.svelte';

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
		// editor.document.
		// editor.io.save(options);
	}

</script>

<MenuItem text="Document"side="left" width={'18em'}>
	<b>Document Configuration</b>

	<div class="group">
		<b>Maps</b>
		<div>
			<span>Color</span>
			<Upload></Upload>
		</div>
		<div>
			<span>Normals</span>
			<Upload></Upload>
		</div>
		<div>
			<span>Height</span>
			<Upload></Upload>
		</div>
	</div>
	
	<div class="group">
		<b>Atlas</b>
		<Button>Sync Dimensions</Button>
		<label>
			<span>dimensions</span>
			<div>
				<Numeric></Numeric>
				<Numeric></Numeric>
			</div>
		</label>
		<label>
			<span>width</span>
			<Checkbox></Checkbox>
		</label>
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
