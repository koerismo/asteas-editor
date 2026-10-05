import type { VImageData, VPixelArray } from 'vtf-js';
import type { RectLike, Vec2Like } from '../aabb.js';
import { getPixelArrayMax } from 'vtf-js/dist/core/image.js';

export interface ImageDataLike {
	width: number;
	height: number;
	data: VPixelArray<ArrayBuffer> | Uint8ClampedArray<ArrayBuffer>;
}

function roundedRectSdf(x: number, y: number, w: number, h: number, radius: number) {
	const ix = Math.abs(x) - w + radius;
	const iy = Math.abs(y) - h + radius;
	return Math.min(
		Math.max(ix, iy), 0.0
	) + Math.hypot(
		Math.max(ix, 0), Math.max(iy, 0)
	) - radius;
}

function roundedRectNormal(x: number, y: number, w: number, h: number, radius: number, out: Vec2Like) {
	const cr_w = w - radius;
	const cr_h = h - radius;
	const ax = Math.abs(x);
	const ay = Math.abs(y);

	if (ax > cr_w || ay > cr_h) {
		const clamp_x = x < -cr_w ? -cr_w : x > cr_w ? cr_w : x;
		const clamp_y = y < -cr_h ? -cr_h : y > cr_h ? cr_h : y;
		const delta_x = x - clamp_x, delta_y = y - clamp_y;
		const l = Math.hypot(delta_x, delta_y);
		out.x = delta_x / l;
		out.y = delta_y / l;
		return out;
	}

	const in_x = ax - w;
	const in_y = ay - h;

	if (in_x > in_y) {
		out.x = Math.sign(x)
		out.y = 0.0;
	} else {
		out.x = 0.0;
		out.y = Math.sign(y)
	}

	return out;
}

export function bakeRectHeight(
	rect: RectLike,
	image: ImageDataLike,
	max_v: number,
	int_v: boolean,
	bevel: number,
	radius: number,
) {
	const data = image.data;
	const min_x = Math.max(rect.min_x, 0);
	const min_y = Math.max(rect.min_y, 0);
	const max_x = Math.min(rect.max_x, image.width);
	const max_y = Math.min(rect.max_y, image.height);
	const w = rect.max_x - rect.min_x;
	const h = rect.max_y - rect.min_y;

	const dx0 = min_x - rect.min_x;
	const dy0 = min_x - rect.min_x;
	const half_w = w * 0.5;
	const half_h = h * 0.5;

	const half = int_v ? Math.round(max_v * 0.5) : max_v * 0.5;
	const full = max_v;

	const _tmp = { x: 0, y: 0 };
	const corner_d = bevel + radius;

	for (let y = min_y, dy = dy0; y < max_y; y++, dy++) {
		const edge_y = y <= rect.min_y + corner_d || y >= rect.max_y - corner_d;
		let idx = (min_x + y * image.width) * 4;

		for (let x = min_x, dx = dx0; x < max_x; x++, dx++) {
			const edge_x = x <= rect.min_x + corner_d || x >= rect.max_x - corner_d;
			
			if (!(edge_y || edge_x)) {
				data[idx++] = data[idx++] = half;
				data[idx++] = data[idx++] = full;
				continue;
			}
			
			const sdf_x = dx - half_w + 0.5;
			const sdf_y = dy - half_h + 0.5;

			const d = roundedRectSdf(
				sdf_x,
				sdf_y,
				half_w,
				half_h,
				radius,
			);

			const alpha = Math.min(max_v, -Math.min(d, 0) * max_v / bevel);

			if (d < -bevel) {
				data[idx++] = data[idx++] = half;
				data[idx++] = data[idx++] = full;
				continue;
			}

			roundedRectNormal(
				sdf_x,
				sdf_y,
				half_w,
				half_h,
				radius,
				_tmp
			);

			const l = Math.hypot(_tmp.x, _tmp.y, 1.0);
			const xyz = {
				x: _tmp.x / l,
				y: _tmp.y / l,
				z: 1.0 / l,
			}

			data[idx++] = (xyz.x * 0.5 + 0.5) * max_v;
			data[idx++] = (xyz.y * 0.5 + 0.5) * max_v;
			data[idx++] = (xyz.z * 0.5 + 0.5) * max_v;
			data[idx++] = alpha;
		}
	}
}

export function bakeToHeight(rects: RectLike[], bevel: number, radius: number, image: ImageDataLike) {
	const data = image.data;
	data.fill(0x0);

	const max_v = getPixelArrayMax(image.data as VPixelArray);
	
	for (let i=0; i<rects.length; i++) {
		const rect = rects[i];
		bakeRectHeight(rect, image, max_v, max_v !== 1.0, bevel, radius);
	}
}
