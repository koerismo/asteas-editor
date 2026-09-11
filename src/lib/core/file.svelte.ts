import type { HotspotRect, VHotspotResource } from "vtf-js/resources";
import { createContext } from 'svelte';
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

export interface Vec2Like {
	x: number;
	y: number;
}

class AABB_Methods {
	declare min_x: number;
	declare min_y: number;
	declare max_x: number;
	declare max_y: number;

	get center_x() {
		return (this.min_x + this.max_x) * 0.5;
	}

	get center_y() {
		return (this.min_y + this.max_y) * 0.5;
	}

	getSize(v: Vec2Like = {} as Vec2Like): Vec2Like {
		v.x = this.width;
		v.y = this.height;
		return v;
	}

	containsPoint(v: Vec2Like): boolean {
		return (
			v.x >= this.min_x && v.x <= this.max_x &&
			v.y >= this.min_y && v.y <= this.max_y
		);
	}

	set(x1: number, y1: number, x2: number, y2: number) {
		this.min_x = x1;
		this.min_y = y1;
		this.max_x = x2;
		this.max_y = y2;
		return this;
	}

	equals(v: AABB) {
		return (
			v.min_x === this.min_x && v.min_y === this.min_y &&
			v.max_x === this.max_x && v.max_y === this.max_y
		);
	}

	translate(x: number, y: number) {
		this.min_x += x;
		this.max_x += x;
		this.min_y += y;
		this.max_y += y;
		return this;
	}

	copy(b: { min_x: number; max_x: number; min_y: number; max_y: number; }) {
		this.set(b.min_x, b.min_y, b.max_x, b.max_y);
		return this;
	}

	get width() {
		return this.max_x - this.min_x;
	}

	get height() {
		return this.max_y - this.min_y;
	}
}

export class AABB extends AABB_Methods {
	min_x = 0;
	min_y = 0;
	max_x = 0;
	max_y = 0;
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
