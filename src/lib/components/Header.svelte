<script lang="ts">
	import Picker from "./pickers/Picker.svelte";


</script>

<header>
	<Picker options={['Edit', 'Paint', 'Remove']} index={0}></Picker>
</header>

<style>
	header {
		display: flex;
		padding: 0.4em;

		background-color: var(--bg-2);
		border-bottom: 1px solid var(--border);
	}
</style>
