import { createContext } from 'svelte';
import { RectEntry } from './file.svelte';
import { AABB } from './aabb.js';

import { History } from './history/history.js';
import { makeSubscriber } from  './history/reactive.js';
import type { HotspotRect } from 'vtf-js/resources';
import { on } from 'svelte/events';

function makeId(type: string, id: number) {
	return type + '#' + id;
}

export class EditorState {
	#history = new History<string>();
	#selection = new Set<number>();
	#rects: RectEntry[] = [];

	#selectSubscriber = makeSubscriber();
	#rectSubscriber = makeSubscriber();

	public active = true;

	get selection(): ReadonlySet<number> {
		this.#selectSubscriber.use();
		return this.#selection;
	}

	get rects(): RectEntry[] {
		this.#rectSubscriber.use();
		return this.#rects;
	}

	commitActions() {
		this.#history.commit();
	}

	clearHistory() {
		this.#history.clear();
	}

	mount() {
		return on(document, 'keydown', this._onKeyDown.bind(this));
	}

	undo() {
		return this.#history.undo();
	}

	redo() {
		return this.#history.redo();
	}

	canUndo() { return this.#history.canUndo(); }
	canRedo() { return this.#history.canRedo(); }

	_validateId(index: number) {
		if (index < 0 || index >= this.#rects.length)
			throw `Bad index ${index}!`;
	}

	_onKeyDown(event: KeyboardEvent) {
		if (!event.metaKey) return;
		if (event.key !== 'z' && event.key !== 'y') return;
		event.preventDefault();
		event.stopPropagation();

		if (event.key === 'y' || event.shiftKey) {
			this.redo();
		} else {
			this.undo();
		}
	}

	setSelection(indices: Iterable<number>) {
		const prev = this.#selection;
		const next = new Set(indices);

		for (const v of indices) {
			if (typeof v !== 'number')
				throw 'whoops';
			this._validateId(v);
		}

		this.#history.add({
			type: 'set_selection',
			fastMerge: true,
			run: true,

			redo: () => {
				this.#selection = next;
				this.#selectSubscriber.update();
			},
			undo: () => {
				this.#selection = prev;
				this.#selectSubscriber.update();
			}
		});
	}

	selectionSetAll() {
		this.setSelection(this.#rects.map((_, i) => i));
	}

	selectionClear() {
		this.setSelection([]);
	}

	selectionAdd(indices: Iterable<number>) {
		const selection = new Set(this.#selection);
		for (const idx of indices) selection.add(idx);
		this.setSelection(selection);
	}

	selectionRemove(indices: Iterable<number>) {
		const selection = new Set(this.#selection);
		for (const idx of indices) selection.delete(idx);
		this.setSelection(selection);
	}

	selectionToggle(index: number) {
		const selection = new Set(this.#selection);
		if (!selection.delete(index)) selection.add(index);
		this.setSelection(selection);
	}

	setRectBounds(entries: Record<number, AABB>) {
		const prev: Record<number, AABB> = {};
		for (const key in entries) {
			prev[key] = new AABB().copy(this.#rects[+key]);
		}

		const next: Record<number, AABB> = {};
		for (const key in entries) {
			next[key] = new AABB().copy(entries[key]);
		}
		
		this.#history.add({
			type: 'set_rect_bounds',
			fastMerge: false,
			run: true,

			redo: () => {
				for (const key in next) {
					this.#rects[+key].copy(next[key]);
				}
				this.#rectSubscriber.update();
			},
			undo: () => {
				for (const key in prev) {
					this.#rects[+key].copy(prev[key]);
				}
				this.#rectSubscriber.update();
			}
		});
	}

	setRectFlags(indices: ArrayLike<number>, flags: number, mask: number) {
		const oldFlags = new Uint16Array(indices.length);

		for (let i=0; i<indices.length; i++) {
			oldFlags[i] = this.#rects[indices[i]].flags;
		}

		const redo = () => {
			for (let i=0; i<indices.length; i++) {
				const rect = this.#rects[indices[i]];
				rect.flags ^= (rect.flags & mask);
				rect.flags |= (flags & mask);
			}
			this.#rectSubscriber.update();
		};

		const undo = () => {
			for (let i=0; i<indices.length; i++) {
				this.#rects[indices[i]].flags = oldFlags[i];
			}
			this.#rectSubscriber.update();
		}
	}

	setRects(rects: RectEntry[]) {
		const prev = this.#rects;
		this.selectionClear();

		this.#history.add({
			type: 'set_rects',
			fastMerge: true,
			run: true,

			redo: ( ) => {
				this.#rects = rects;
				this.#rectSubscriber.update();
			},
			undo: () => {
				this.#rects = prev;
				this.#rectSubscriber.update();
			}
		});
	}

	editRects(add: RectEntry[], remove: number[]): number[] {
		const prev = this.#rects;
		const next = new Array(this.#rects.length + add.length - remove.length);

		// Deselect rects to be removed
		this.selectionRemove(remove);

		let idx = 0;
		for (let i=0; i<this.#rects.length; i++) {
			if (remove.includes(i)) continue;
			next[idx++] = this.#rects[i];
		}

		const indicesOut = new Array<number>(add.length);
		for (let i=0; i<add.length; i++) {
			indicesOut[i] = idx;
			next[idx++] = add[i];
		}

		console.log('new indices:', indicesOut);
		console.log('new array:', next);

		this.#history.add({
			type: 'set_rects',
			fastMerge: true,
			run: true,

			redo: ( ) => {
				this.#rects = next;
				this.#rectSubscriber.update();
			},
			undo: () => {
				this.#rects = prev;
				this.#rectSubscriber.update();
			}
		});

		return indicesOut;
	}

	rectsAdd(rects: RectEntry[]) {
		return this.editRects(rects, []);
	}

	rectsClone(rects: Iterable<number>): number[] {
		const next = Array.from(rects, v => {
			this._validateId(v);
			return new RectEntry(this.#rects[v])
		});

		return this.rectsAdd(next);
	}

	rectsRemove(indices: number[]) {
		this.editRects([], indices);
	}

	rectsRemoveSelected() {
		this.rectsRemove(Array.from(this.selection));
	}

	// addRects(bboxes: AABBLike[]) {
	// 	const rects = bboxes.map(v => new RectEntry(v));

	// 	const redo = () => {
	// 		const i0 = this.#rects.length;
	// 		this.#rects.length += rects.length;
	// 		for (let i=0, o=i0; i<rects.length; i++) {
	// 			this.#rects[o] = rects[i];
	// 		}
	// 	}

	// 	const undo = () => {
	// 		this.#rects.length -= rects.length;
	// 	}

	// }

	// getSelectSize() {
	// 	return this.selection.size;
	// }

	// selectToggle(index: number) {
	// 	this.#checkId(index);
	// 	if (!this.selection.delete(index))
	// 		this.selection.add(index);
	// }

	// selectAdds(indices: number[]) {
	// 	for (let i=0; i<indices.length; i++) {
	// 		const index = indices[i];
	// 		this.#checkId(index);
	// 		this.selection.add(index);
	// 	}
	// }

	// selectRemove(index: number) {
	// 	this.#checkId(index);
	// 	this.selection.delete(index);
	// }

	// selectRemoves(indices: number[]) {
	// 	for (let i=0; i<indices.length; i++) {
	// 		const index = indices[i];
	// 		this.#checkId(index);
	// 		this.selection.delete(index);
	// 	}
	// }

	// selectOnly(index: number) {
	// 	this.#checkId(index);
	// 	this.selection.clear();
	// 	this.selection.add(index);
	// }

	// selectAll() {
	// 	if (!this.file) return;
	// 	for (let i=0; i<this.file.rects.length; i++)
	// 		this.selection.add(i);
	// }
}

export const [getEditorCtx, setEditorCtx] = createContext<EditorState>();
