import type { HotspotRect, VHotspotResource } from 'vtf-js/resources';
import { createContext } from 'svelte';

import { AABB, AABB_Methods } from './aabb.js';
import { UndoRedo } from './undo.svelte.js';

export const [getFile, setFile] = createContext<RectFile>();

export class RectFile {
	public rects: RectEntry[] = $state([]);
	public version: number = 1;
	public history: UndoRedo = new UndoRedo();

	static fromResource(res: VHotspotResource) {
		const file = new RectFile(res.version, []);
		file.copyRects(res.rects);
		return file;
	}

	static fromRects(rects: HotspotRect[]) {
		const file = new RectFile(1, []);
		file.copyRects(rects);
		return file;
	}

	constructor(version: number, rects?: RectEntry[]) {
		this.version = version;
		if (rects) this.rects = rects;
	}

	copyRects(rects: HotspotRect[]) {
		this.rects = rects.map(r => new RectEntry(r));
	}

	addRect(hsr: HotspotRect): RectEntry {
		const entry = new RectEntry(hsr);
		this.rects.push(entry);

		this.history.add({
			type: 'add_rect',
			undo: () => {
				this.rects.pop();
			},
			redo: () => {
				this.rects.push(entry);
			}
		});

		return entry;
	}

	copyRect(index: number): RectEntry {
		const entry = new RectEntry().copy(this.rects[index]);
		this.rects.push(entry);

		this.history.add({
			type: 'add_rect',
			undo: () => {
				this.rects.pop();
			},
			redo: () => {
				this.rects.push(entry);
			}
		});

		return entry;
	}

	removeRects(indices: number[]) {
		indices.sort((a, b) => a - b);

		const deletedRects = new Array(indices.length);
		for (let i=indices.length-1; i>=0; i--) {
			const outp = this.rects.splice(indices[i], 1);
			if (!outp.length) throw `index ${indices[i]} (at ${i}) OOB (> ${this.rects.length})!`;
			if (!outp[0]) throw `invalid rect!`;
			deletedRects[i] = outp[0];
		}

		const redo = () => {
			for (let i=indices.length-1; i>=0; i--) {
				this.rects.splice(indices[i], 1);
			}
		};

		const undo = () => {
			for (let i=0; i<indices.length; i++) {
				this.rects.splice(indices[i], 0, deletedRects[i]);
			}
		}

		this.history.add({
			type: 'remove_rect',
			undo,
			redo,
		});
	}

	setRectFlags(indices: number[], flags: number, mask: number) {
		const oldFlags = new Uint16Array(indices.length);
		for (let i=0; i<indices.length; i++) {
			oldFlags[i] = this.rects[indices[i]].flags;
		}

		const redo = () => {
			for (let i=0; i<indices.length; i++) {
				const rect = this.rects[indices[i]];
				rect.flags ^= (rect.flags & mask);
				rect.flags |= (flags & mask);
			}
		};

		const undo = () => {
			for (let i=0; i<indices.length; i++) {
				this.rects[indices[i]].flags = oldFlags[i];
			}
		}

		this.history.add({
			type: 'set_flags',
			undo, redo
		});

		redo();
	}

	setRectBounds(index: number, bounds: AABB, noEntry: boolean = false) {
		if (this.rects[index].equals(bounds))
			return;

		if (noEntry) {
			this.rects[index].copy(bounds);
			return;
		}

		const newBounds = new AABB().copy(bounds);
		const oldBounds = new AABB().copy(this.rects[index]);

		const redo = () => {
			this.rects[index].copy(newBounds);
		}

		const undo = () => {
			this.rects[index].copy(oldBounds);
		}

		this.history.add({
			type: 'set_size',
			undo, redo
		});
		
		redo();
	}
}


export class RectEntry extends AABB_Methods {
	flags: number = $state(0);
	min_x: number = $state(0);
	min_y: number = $state(0);
	max_x: number = $state(0);
	max_y: number = $state(0);

	static g_rectCount = 0;
	uuid = (RectEntry.g_rectCount++);

	constructor(rect?: HotspotRect | RectEntry) {
		super();
		if (rect) {
			this.copy(rect);
			this.flags = rect.flags;
		}
	}

	get width() { return this.max_x - this.min_x; }
	get height() { return this.max_y - this.min_y; }
}
