<script lang="ts">
	import { getState } from '$lib/core/context.svelte.js';

	import MenuItem from './menu/MenuItem.svelte';
	import Button from './buttons/Button.svelte';

	import Checkbox from './inputs/Checkbox.svelte';
	import Numeric from './inputs/Numeric.svelte';
	import MapUpload from './inputs/MapUpload.svelte';
	// import PickerMultiple from './pickers/PickerMultiple.svelte';
	// import Upload from './inputs/FileUpload.svelte';

	import Styles from '$lib/css/components/menu.module.scss';
	import { clamp } from 'vtf-js/utils';

	const editor = getState();

	function onSave() {
		// editor.document.
		// editor.io.save(options);
	}

	function canSyncDimensions() {
		const doc = editor.document;
		const map = doc?.maps.color;
		if (!map) return false;
		return map.width !== doc.width || map.height !== doc.height;
	}

	function syncDimensions() {
		const doc = editor.document;
		const map = doc?.maps.color;
		if (!map) return false;
		doc.width = map.width;
		doc.height = map.height;
	}

	function validator(key: 'width' | 'height') {
		return {
			get v(): number {
				return editor.document?.[key] ?? 0;
			},
			set v(_v: unknown) {
				if (!editor.document) return;
				if (typeof _v !== 'number') return;
				editor.document[key] = clamp(Math.round(_v), 1, 8192);
			}
		}
	}

	const widthWrapped = validator('width');
	const heightWrapped = validator('height');

</script>

<MenuItem text="Document"side="left" width={'18em'}>
	<b>Document Configuration</b>

	<div class={Styles.Group}>
		<b>Maps</b>
		<div class={Styles.Group}>
			<span>Color</span>
			<MapUpload state={editor} key="color"></MapUpload>
		</div>
		<div class={Styles.Group}>
			<span>Normals</span>
			<MapUpload state={editor} key="normal"></MapUpload>
		</div>
		<div class={Styles.Group}>
			<span>Height</span>
			<MapUpload state={editor} key="height"></MapUpload>
		</div>
	</div>
	
	<div class={Styles.Group}>
		<b>Atlas</b>
		<div class={Styles.Group}>
			<span>Dimensions</span>
			<div class="hsplit">
				<Numeric min="1" step="1" max="8192" bind:value={widthWrapped.v} ></Numeric>
				<Numeric min="1" step="1" max="8192" bind:value={heightWrapped.v} ></Numeric>
			</div>
		</div>
		<Button onclick={syncDimensions} disabled={!canSyncDimensions()}>Sync Dimensions</Button>
	</div>
</MenuItem>

<style>
	.hsplit {
		width: 100%;
		display: flex;
		gap: 0.5em;
		justify-content: stretch;
	}
</style>
