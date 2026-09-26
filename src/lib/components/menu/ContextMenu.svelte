<script lang="ts">
	import MenuItemPopup from "./MenuItemPopup.svelte";

	let { children }: { children?: any } = $props();
	let element: HTMLDivElement;
	
	export function show(at: { x: string, y: string }) {
		if (!element) return;
		element.style.left = at.x;
		element.style.top = at.y;
		element.showPopover();
	}

	export function hide() {
		if (!element) return;
		element.hidePopover();
	}


</script>

<MenuItemPopup bind:element {children}></MenuItemPopup>

