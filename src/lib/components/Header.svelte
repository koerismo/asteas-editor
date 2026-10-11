<script lang="ts">
	import Picker from "./pickers/Picker.svelte";
	import MenuSave from "./HeaderMenuSave.svelte";
	import MenuView from "./HeaderMenuView.svelte";
	import MenuBake from "./HeaderMenuBake.svelte";
	import MenuDocument from "./HeaderMenuDocument.svelte";
</script>

<header>
	<MenuDocument></MenuDocument>
	<MenuBake></MenuBake>
	<div style="flex-grow: 1;"></div>
	<!-- <MenuItem text="Load">
		<b>Load Options</b>
		<Picker options={['Replace', 'Merge']}></Picker>
		<label>
			Rectfile
			<input type="file" />
		</label>
	</MenuItem> -->
	<MenuView></MenuView>
	<MenuSave></MenuSave>
</header>

<style>
	header {
		display: flex;
		padding: 0.4em;
		font-size: 0.8em;
		gap: 0.4em;

		background-color: var(--bg-2);
		border-bottom: 1px solid var(--border);
	}

	div.grid {
		grid-template-columns: auto auto;
		grid-auto-rows: min-content;
		gap: 0.4em;
	}
</style>
