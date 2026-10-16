<script lang="ts">
	import MenuItem from './menu/MenuItem.svelte';
	import { getState } from '$lib/core/context.svelte.js';
	import Checkbox from './inputs/Checkbox.svelte';
	import Picker from './pickers/Picker.svelte';

	import Styles from '$lib/css/components/menu.module.scss';

	const editor = getState();
	const indexGetSet = {
		get value() {
			return 2 + Math.log2(editor.viewport.meshScale3d);
		},
		set value(v: number) {
			editor.viewport.meshScale3d = 2 ** (v - 2);
		}
	}

</script>

<MenuItem text="View" width={'20em'}>
	<b>Viewport Settings</b>
	<label class={Styles.Row}>
		<span>Enable 3D</span>
		<Checkbox bind:checked={editor.viewport.enable3d}></Checkbox>
	</label>
	<label class={Styles.Row}>
		<span>Enable Lighting</span>
		<Checkbox bind:checked={editor.viewport.useLighting3d}></Checkbox>
	</label>
	<div class={Styles.Row}>
		<span>Fit Scale</span>
		<Picker bind:index={indexGetSet.value} options={['.25x', '.5x', '1x', '2x', '4x']}></Picker>
	</div>
</MenuItem>
