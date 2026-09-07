<script>
	// import svelteLogo from './assets/svelte.svg'
	// import viteLogo from './assets/vite.svg'
	// import heroImg from './assets/hero.png'
	// import Counter from './lib/TopBar.svelte'

	import Canvas from '$lib/components/Canvas.svelte';
	import TopBar from '$lib/TopBar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
</script>

<div id="root">
<!-- sidebar -->
<Sidebar></Sidebar>

<!-- main body -->
<main>
	<TopBar></TopBar>
	<div>
		<Canvas></Canvas>
	</div>
</main>
</div>

<style>
	div#root {
		flex: 1 1;
		display: flex;
	}

	main {
		width: 1fr;
		flex: 1 1;
		display: flex;
		flex-direction: column;
	}

	main > div {
		display: flex;
		justify-content: center;
		place-items: center;
		width: 1fr;
		flex: 1 1;
	}
</style>
