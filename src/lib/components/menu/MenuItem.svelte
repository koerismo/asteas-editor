<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '../buttons/Button.svelte';
	import MenuItemPopup from './MenuItemPopup.svelte';
	let { text, children, width }: { text: string; children?: any, width?: string } = $props();
	const id = $props.id();
	
	// svelte-ignore non_reactive_update
	let button: HTMLButtonElement;

	// svelte-ignore non_reactive_update
	let popup: HTMLDivElement;

	function onbeforetoggle(event: ToggleEvent) {
		if (event.newState !== 'open') return;
		const bounds = button.getBoundingClientRect();
		popup.style.top = bounds.bottom + 'px';
		popup.style.right = (window.innerWidth - bounds.right) + 'px';
	}

</script>

<Button bind:element={button} popovertarget={id} popovertargetaction="toggle">{text}</Button>
<MenuItemPopup {width} bind:element={popup} {id} {onbeforetoggle}>
	{@render children?.()}
</MenuItemPopup>

