<script lang="ts">
	let { img, title, author }: { img: string, title: string, author: string } = $props();
</script>

<div class="example">
	<img src={img} alt={title} />
	<div class="content">
		<h3>{title}</h3>
		<p>by {author}</p>
	</div>
</div>

<style>
	div.example {
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
			gap: 0.2em;
		}
	
		img {
			width: 30%;
			aspect-ratio: 1 / 1;
			
			padding: 0.5em;
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
