import type { HotspotRect, VHotspotResource } from 'vtf-js/resources';
import { AABB_Methods, type AABBLike } from './aabb.js';

export class RectFile {
	public version: number = 1;
	public rects: Readonly<RectEntry>[] = [];

	static fromResource(res: VHotspotResource) {
		const file = new RectFile(res.version);
		file.setRectsFrom(res.rects);
		return file;
	}

	static fromRects(rects: HotspotRect[]) {
		const file = new RectFile(1);
		file.setRectsFrom(rects);
		return file;
	}

	constructor(version: number, rects?: RectEntry[]) {
		this.version = version;
		if (rects) this.rects = rects;
	}

	setRectsFrom(rects: (AABBLike | HotspotRect)[]) {
		this.rects = rects.map(v => new RectEntry(v));
	}
}

export class RectEntry extends AABB_Methods implements AABBLike {
	flags: number = $state.raw(0);
	min_x: number = $state.raw(0);
	min_y: number = $state.raw(0);
	max_x: number = $state.raw(0);
	max_y: number = $state.raw(0);

	static g_rectCount = 0;
	uuid = (RectEntry.g_rectCount++);

	constructor(rect?: HotspotRect | RectEntry | AABBLike) {
		super();
		if (rect) {
			this.copy(rect);
			this.flags = 'flags' in rect ? rect.flags : 0;
		}
	}

	get width() { return this.max_x - this.min_x; }
	get height() { return this.max_y - this.min_y; }
}
