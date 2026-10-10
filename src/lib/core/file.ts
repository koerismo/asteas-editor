import { HotspotRect } from 'vtf-js/resources';
import { AABB, type AABBLike } from './aabb.js';

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

	toHotspotRect() {
		return new HotspotRect(
			this.flags,
			this.min_x,
			this.min_y,
			this.max_x,
			this.max_y
		);
	}
}
