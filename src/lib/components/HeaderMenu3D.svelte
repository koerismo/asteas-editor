<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import { getEditorState, getViewState } from '$lib/core/context.svelte.js';
	import Checkbox from './buttons/Checkbox.svelte';
	import Picker from './pickers/Picker.svelte';

	const view = getViewState();

	const indexGetSet = {
		get value() {
			return 2 + Math.log2(view.meshScale);
		},
		set value(v: number) {
			view.meshScale = 2 ** (v - 2);
		}
	}

</script>

<MenuItem text="3D" width={'18em'}>
	<b>3D View</b>
	<label>
		<span>Enable</span>
		<Checkbox bind:checked={view.enable}></Checkbox>
	</label>
	<label>
		<span>Use baked normals</span>
		<Checkbox bind:checked={view.useBakedNormals}></Checkbox>
	</label>
	<label>
		<span>Scale</span>
		<Picker bind:index={indexGetSet.value} options={['.25x', '.5x', '1x', '2x', '4x']}></Picker>
	</label>
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
