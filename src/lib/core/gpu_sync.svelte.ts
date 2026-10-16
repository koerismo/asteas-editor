import type { VImageEither } from 'vtf-js';

import { Disposable } from './disposable.js';
import type { DocumentMaps, EditorState } from './context.svelte.js';
import type { VTextureLoader } from './viewport/vtex_loader.js';

/** This class loads with everything else, and only loads the VTextureLoader once the viewports request it. */
export class TextureSync extends Disposable {
	protected started = false;
	protected vtex_loader?: typeof VTextureLoader = $state.raw();

	constructor(protected state: EditorState) {
		super();
		this.disposables.push(
			$effect.root(() => {
				$effect(() => {
					this.upload('color', state.document?.maps.color);
				});
				$effect(() => {
					this.upload('normal', state.document?.maps.normal, false);
				});
				$effect(() => {
					this.upload('height', state.document?.maps.height);
				});
			}),
		);
	}

	protected upload(
		key: keyof DocumentMaps,
		texture: VImageEither | undefined,
		srgb: boolean = true,
	) {
		if (!this.vtex_loader) return; // { console.log('load fail:', map); return; }
		// console.log('load:', map, texture);

		const converted = texture && this.vtex_loader.parseImage(texture, srgb);
		this.state.viewport.setCacheMap(key, converted);

		// console.log('load:', key, !!texture);

		// TODO: SOMETHING EVIL IS AFOOT HERE.
		// WE LITERALLY CANNOT REMOVE THIS CONLOG OR IT BREAKS
		// console.log('load:', !!converted);
	}

	async initialize() {
		if (this.started) return;
		this.started = true;

		const { VTextureLoader } = await import('./viewport/vtex_loader.js');
		this.vtex_loader = VTextureLoader;
		console.log('TextureSync active!');
	}
}

// export const [getSync, setSync] = createContext<TextureSync>();
