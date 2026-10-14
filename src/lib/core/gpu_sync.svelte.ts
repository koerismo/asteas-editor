import type { VImageEither, VPixelArray } from 'vtf-js';

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
		map: keyof DocumentMaps,
		texture: VImageEither<VPixelArray> | undefined,
		srgb: boolean = true,
	) {
		if (!this.vtex_loader) return;
		this.state.viewport.mapCache[map] = texture
			? this.vtex_loader.parseImage(texture, srgb)
			: undefined;
		console.log(texture, this.state.viewport.mapCache[map]);
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
