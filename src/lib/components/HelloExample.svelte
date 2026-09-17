<script lang="ts">
	let { img, onclick, title, author }: { img: string, onclick(): void, title: string, author: string } = $props();
</script>

<button class="example" {onclick}>
	<img src={img} alt={title} />
	<div class="content">
		<h3>{title}</h3>
		<p>by {author}</p>
	</div>
</button>

<style>
	button.example {
		appearance: none;
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

		cursor: pointer;

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
	}

</style>
