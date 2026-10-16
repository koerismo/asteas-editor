import { HotspotRect } from 'vtf-js/resources';
import { AABB, type AABBLike, type RectLike } from './aabb.js';

export function toHotspotRect(rect: RectLike) {
	return new HotspotRect(
		rect.flags,
		rect.min_x,
		rect.min_y,
		rect.max_x,
		rect.max_y,
	);
}

export class RectEntry extends AABB implements AABBLike {
	flags: number = 0;

	static g_rectCount = 0;
	uuid = RectEntry.g_rectCount++;

	constructor(rect?: HotspotRect | RectEntry | AABBLike) {
		super();
		if (rect) {
			this.copy(rect);
			this.flags = 'flags' in rect ? rect.flags : 0;
		}
	}
}
