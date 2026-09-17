<script lang="ts">
	import PickerFlags from './pickers/PickerFlags.svelte';
	import { HotSpotRectFlags } from 'vtf-js/resources';
	import { RectEntry } from '$lib/core/file.svelte.js';
	import Checkbox from './buttons/Checkbox.svelte';

	import IconRotate from "@lucide/svelte/icons/rotate-cw";
	import IconFlip from "@lucide/svelte/icons/flip-horizontal-2";
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let {
		index,
		active,
		selected,
		rect = $bindable(),
		setFlags,
		...args
	}: Omit<HTMLButtonAttributes, 'class'> & {
		index: number;
		active: boolean;
		selected: boolean;
		rect: RectEntry;
		setFlags(flags: number, mask: number): void;
	} = $props();

	function onAltCheckbox(event: MouseEvent) {
		event.stopPropagation();
		setFlags(rect.flags ^ HotSpotRectFlags.AltGroup, HotSpotRectFlags.AltGroup);
	}

	function onFlagsSet(value: number) {
		setFlags(value, value ^ rect.flags);
	}

</script>

<button
	aria-label="Region {index}"
	class="rect"
	class:active={active}
	class:selected={selected}
	{...args}
>
	<div class="rect-info">
		<code>#{index} ({rect.uuid})</code>
		<code>{rect.min_x},{rect.min_y} - {rect.width}x{rect.height}</code>
	</div>
	<div class="rect-props">
		<PickerFlags
			oninput={onFlagsSet}
			options={[
				[IconRotate, HotSpotRectFlags.AllowRotation, 'Allow rotation'],
				[IconFlip, HotSpotRectFlags.AllowReflection, 'Allow reflection'],
			]}
			value={rect.flags}
		></PickerFlags>
		<PickerFlags
			oninput={onFlagsSet}
			options={[
				['x', HotSpotRectFlags.TileX, 'Tile horizontal'],
				['y', HotSpotRectFlags.TileY, 'Tile vertical'],
			]}
			value={rect.flags}
		></PickerFlags>
		<Checkbox
			class="check-alt"
			checked={!!(rect.flags & HotSpotRectFlags.AltGroup)}
			onclick={onAltCheckbox}
			onmousedown={e => e.stopPropagation()}
		></Checkbox>
		<span>transform</span>
		<span>tile</span>
		<span>alt</span>
	</div>
</button>

<style>
	button.rect {
		display: flex;
		flex-direction: column;
		gap: 0.3em;

		padding: 0.4em 0.6em;
		user-select: none;

		background-color: var(--bg-3);
		border: 1px solid var(--bg);
		border-radius: var(--radius-lg);

		&.selected {
			background-color: var(--bg-4);

			border-color: var(--text-3);
			outline: 1px solid var(--bg-2);
			outline-offset: -2px;
		}

		&.active {
			border-color: var(--accent);
		}

		:global(div.collapsed > div) > & {
			> div.rect-props {
				font-size: 0.85em;
			}

			> div.rect-props > span {
				display: none;
			}
		}
	}

	button.rect.selected div.rect-info {
		code {
			color: var(--text);
		}
	}

	div.rect-info {
		display: flex;
		justify-content: space-between;

		code {
			color: var(--text-3);
			font-family: var(--mono);
			font-size: 0.75em;
		}

		code:first-child {
			color: var(--text-2);
		}
	}

	div.rect-props {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		grid-auto-rows: auto;
		width: 100%;
		gap: 0.2em 0.5em;
		font-size: 0.9em;

		span {
			color: var(--text-3);
			place-self: start;
		}

		:global(input.check-alt) {
			height: 100%;
		}
	}
</style>
