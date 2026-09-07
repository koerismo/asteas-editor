<script lang="ts">
    function createCanvas(canvas: HTMLCanvasElement) {
        

        return () => {

        };
    }
</script>

<canvas width=512 height=512 {@attach createCanvas}></canvas>

<style>
    canvas {
        border: 1px solid var(--border);
        background-color: var(--bg-2);
		aspect-ratio: 1 / 1;

		/* height: 80vh; */
		width: 60%;

		flex-shrink: 1;
    }
</style>
