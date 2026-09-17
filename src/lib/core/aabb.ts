import type { HotspotRect } from 'vtf-js/resources';

export interface Vec2Like {
	x: number;
	y: number;
}

export interface AABBLike {
	min_x: number;
	min_y: number;
	max_x: number;
	max_y: number;
}

export interface RectLike extends AABBLike {
	flags: number;
}

export abstract class AABB_Methods implements AABBLike {
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

	overlapsRect(rect: AABBLike): boolean {
		return (
			rect.min_x < this.max_x &&
			rect.max_x > this.min_x &&
			rect.min_y < this.max_y &&
			rect.max_y > this.min_y
		)
		// const L = (rect.max_x > this.min_x) && (rect.max_x < this.max_x);
		// const R = (rect.min_x < this.max_x) && (rect.min_x > this.min_x);
		// const S = (rect.max_y > this.min_y) && (rect.max_y < this.max_y);
		// const N = (rect.min_y < this.max_y) && (rect.min_y > this.min_y);

		// return (
		// 	(L || R) && (S || N)
		// );
	}


	expandToPoint(x: number, y: number) {
		if (x < this.min_x) this.min_x = x;
		if (x > this.max_x) this.max_x = x;
		if (y < this.min_y) this.min_y = y;
		if (y > this.max_y) this.max_y = y;
		return this;
	}

	expandToRect(r: AABB) {
		if (r.min_x < this.min_x) this.min_x = r.min_x;
		if (r.max_x > this.max_x) this.max_x = r.max_x;
		if (r.min_y < this.min_y) this.min_y = r.min_y;
		if (r.max_y > this.max_y) this.max_y = r.max_y;
		return this;
	}

	set(x1: number, y1: number, x2: number, y2: number) {
		this.min_x = x1;
		this.min_y = y1;
		this.max_x = x2;
		this.max_y = y2;
		return this;
	}

	isValid() {
		return (
			isFinite(this.min_x) &&
			isFinite(this.min_y) &&
			isFinite(this.max_x) &&
			isFinite(this.max_y));
	}

	equals(v: AABB) {
		return (
			v.min_x === this.min_x && v.min_y === this.min_y &&
			v.max_x === this.max_x && v.max_y === this.max_y
		);
	}

	scale(x: number, y: number) {
		this.min_x *= x;
		this.max_x *= x;
		this.min_y *= y;
		this.max_y *= y;
		return this;
	}

	translate(x: number, y: number) {
		this.min_x += x;
		this.max_x += x;
		this.min_y += y;
		this.max_y += y;
		return this;
	}

	snap(snap: number) {
		const s = (v: number) => Math.round(v / snap) * snap;
		this.min_x = s(this.min_x);
		this.min_y = s(this.min_y);
		this.max_x = s(this.max_x);
		this.max_y = s(this.max_y);
	}

	copy(b: { min_x: number; max_x: number; min_y: number; max_y: number; }) {
		this.set(b.min_x, b.min_y, b.max_x, b.max_y);
		return this;
	}

	stringify() {
		const r = (v: number) => v.toFixed(3);
		return `AABB(${r(this.min_x)}, ${r(this.min_y)}, ${r(this.max_x)}, ${r(this.max_y)})`;
	}

	get width() {
		return this.max_x - this.min_x;
	}

	get height() {
		return this.max_y - this.min_y;
	}
}

export class AABB extends AABB_Methods implements AABBLike {
	min_x = 0;
	min_y = 0;
	max_x = 0;
	max_y = 0;
}
