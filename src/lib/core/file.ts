import type { HotspotRect, VHotspotResource } from 'vtf-js/resources';
import { AABB, type AABBLike } from './aabb.js';

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

export class RectEntry extends AABB implements AABBLike {
	flags: number = 0;

	static g_rectCount = 0;
	uuid = (RectEntry.g_rectCount++);

	constructor(rect?: HotspotRect | RectEntry | AABBLike) {
		super();
		if (rect) {
			this.copy(rect);
			this.flags = 'flags' in rect ? rect.flags : 0;
		}
	}
}
