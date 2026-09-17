<script lang="ts">
	import type { EditorInitializer } from '$lib/core/loader';

	let {
		thumb: img,
		url,
		loader,
		title,
		author,
	}: {
		thumb: string;
		url: string;
		loader: EditorInitializer,
		title: string;
		author: string
	} = $props();

	import LoadingIcon from '@lucide/svelte/icons/loader-circle';

	let loading = $state(false);
	async function onclick() {
		loading = true;
		await loader.loadUrl(url);
		loading = false;
	}
</script>

<button class="example" class:loading disabled={loading} {onclick}>
	<img src={img} alt={title} />
	<div class="content">
		<h3>{title}</h3>
		<p>by {author}</p>
	</div>
	<div class="loader">
		<LoadingIcon></LoadingIcon>
	</div>
</button>

<style>
	button.example {
		position: relative;
		appearance: none;
		cursor: pointer;

		padding: 0;
		margin: 0;
		text-align: left;
		font-size: 1em;

		display: flex;
		gap: 0.4em;
		line-height: 1;

		overflow: hidden;
		border: 1px solid var(--border-2);
		border-radius: var(--radius-lg);

		transition: 0.2s ease-out;

		background-color: var(--bg);
		color: var(--text-4);

		h3 {
			color: var(--text-2);
		}

		div.content {
			padding: 0.5em;
			display: flex;
			flex-direction: column;
			gap: 0.3em;
		}

		img {
			width: 30%;
			aspect-ratio: 1 / 1;
			border: none;
			background-color: var(--bg-2);
		}

		&:hover {
			background-color: var(--bg-2);
			border-color: var(--border-3);
			color: var(--text);
		}

		& > div.loader {
			display: none;
			position: absolute;
			left: 0;
			top: 0;
			right: 0;
			bottom: 0;
		}

		&.loading > div.loader {
			background-color: var(--bg);
			opacity: 0.8;
			display: flex;
			justify-content: center;
			place-items: center;

			& > :global(svg) {
				animation: rotate 0.3s linear infinite;
			}
		}
	}

	@keyframes rotate {
		0% { transform: rotate(0deg) }
		100% { transform: rotate(360deg) }
	}
</style>
