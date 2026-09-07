<script lang="ts">
	import Picker from "./components/pickers/Picker.svelte";


</script>

<header>
	<Picker index={0} options={['Paint', 'Edit', 'Delete']}></Picker>
</header>

<style>
	header {
		display: flex;
		gap: 1em;
		padding: 1em;
	}
</style>