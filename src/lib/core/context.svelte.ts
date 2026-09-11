import { createContext } from 'svelte';
import type { RectFile } from './file.svelte';
import { SvelteSet } from 'svelte/reactivity';

export class EditorState {
	active: number = $state(-1);
	selection: Set<number> = new SvelteSet();
	file: RectFile = $state()!;

	#checkId(index: number) {
		if (index < 0 || index >= this.file!.rects.length) {
			throw `Attempted to address invalid rect ${index}`;
		}
		return index;
	}

	setActive(index: number = -1) {
		if (!this.file) {
			return console.error('Attempted to set rect with no active file!');
		}
		if (index < 0 || index >= this.file!.rects.length) {
			return console.error(`Attempted to select invalid rect ${index}`);
		}
		this.#checkId(index);
		this.active = index;
		return index;
	}

	hasActive() {
		return this.active !== -1;
	}

	getActive() {
		return this.active;
	}

	clearSelection() {
		this.active = -1;
		this.selection.clear();
	}
	
	deleteSelected() {
		this.file.removeRects(Array.from(this.selection.values()));
	}

	getSelectSize() {
		return this.selection.size;
	}

	selectAdd(index: number) {
		this.#checkId(index);
		this.selection.add(index);
	}

	selectRemove(index: number) {
		this.#checkId(index);
		this.selection.delete(index);
		if (this.active === index)
			this.active = -1;
	}

	selectId(index: number) {
		this.#checkId(index);
		this.selection.clear();
		this.selection.add(index);
	}

	selectAll() {
		if (!this.file) return;
		for (let i=0; i<this.file.rects.length; i++)
			this.selection.add(i);
	}
}

export const [getEditorCtx, setEditorCtx] = createContext<EditorState>();
