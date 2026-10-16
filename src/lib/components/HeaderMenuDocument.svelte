<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import Button from './buttons/Button.svelte';
	import { getState } from '$lib/core/context.svelte.js';
	import Checkbox from './buttons/Checkbox.svelte';
	import PickerMultiple from './pickers/PickerMultiple.svelte';
	import Upload from './inputs/FileUpload.svelte';
	import Numeric from './inputs/Numeric.svelte';
	import Styles from '$lib/css/components/menu.module.scss';
	import MapUpload from './inputs/MapUpload.svelte';

	const editor = getState();

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

	// function makeFileBind<T>(obj: T, key: keyof T) {
	// 	return {
	// 		get files(): File[] {
	// 			return obj[key] ? [obj[key]] 
	// 		},
	// 		set files(f: File[]) {

	// 		}
	// 	}
	// }

	function onSave() {
		// editor.document.
		// editor.io.save(options);
	}

</script>

<MenuItem text="Document"side="left" width={'18em'}>
	<b>Document Configuration</b>

	<div class={Styles.Group}>
		<b>Maps</b>
		<div>
			<span>Color</span>
			<MapUpload state={editor} key="color"></MapUpload>
		</div>
		<div>
			<span>Normals</span>
			<MapUpload state={editor} key="normal"></MapUpload>
		</div>
		<div>
			<span>Height</span>
			<MapUpload state={editor} key="height"></MapUpload>
		</div>
	</div>
	
	<div class={Styles.Group}>
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
	/* div.group {
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
	} */

	/* i {
		color: var(--text-3);
		font-size: 0.9em;
	} */

	/* hr {
		border-color: var(--border);
		margin: var(--hr-margin) 0;
	} */

	/* label {
		display: flex;
		gap: 0.6em;
		place-items: center;
		color: var(--text-2);

		span {
			flex-grow: 1;
		}
	} */
</style>
