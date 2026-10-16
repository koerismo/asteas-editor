<script lang="ts">
	import MenuItemPopup from './MenuItemPopup.svelte';

	let { children }: { children?: any } = $props();

	// svelte-ignore non_reactive_update
	let element: HTMLDivElement;
	
	export function show(at: { x: number, y: number }) {
		if (!element) return;
		element.style.left = at.x + 'px';
		element.style.top = (at.y + 4) + 'px';
		element.showPopover();
	}

	export function hide() {
		if (!element) return;
		element.hidePopover();
	}


</script>

<MenuItemPopup bind:element {children}></MenuItemPopup>

