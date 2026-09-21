// This code was ported from koerismo/Hammer-Hotspots
// Licensed under LGPLv3.0+

function Ref<T>(t?: T): Ref<T> {
	return { v: t! };
}

interface Ref<T> {
	v: T;
}


const kFloatEpsilon = 0.0001;
const kFloatInf = Infinity;

type FloatArray = Float32Array | Float64Array;

function f32swap<T extends FloatArray>(a: T, b: T) {
	for (let i=0, t=0; i<a.length; i++) {
		t = a[i];
		a[i] = b[i];
		b[i] = t;
	}
}

export class Vec2 {
	public xy: number[] = [0, 0];

	constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}

	get x(): number { return this.xy[0]; }
	get y(): number { return this.xy[1]; }
	set x(v: number) { this.xy[0] = v; }
	set y(v: number) { this.xy[1] = v; }

	Normalized(length?: Ref<number>) {
		const l = Math.hypot.apply(null, this.xy);
		if (length) length.v = l;
		return new Vec2(this.x / l, this.y / l);
	}
	
	Swapped() {
		return new Vec2(this.y, this.x);
	}

	Dot(v: Vec2) {
		return this.x * v.x + this.y * v.y;
	}

	Copy(v: Vec2) {
		this.x = v.x;
		this.y = v.y;
	}

	Scale(s: number) {
		this.xy[0] *= s;
		this.xy[1] *= s;
	}
}

export class Mat3x2 {
	readonly values: FloatArray;
	readonly x: FloatArray;
	readonly y: FloatArray;
	readonly z: FloatArray;

	constructor(v: FloatArray = new Float64Array(6)) {
		if (v.length !== 6) throw 'whoops';
		this.values = v;
		this.x = v.subarray(0, 2);
		this.y = v.subarray(2, 4);
		this.z = v.subarray(4, 6);
	}
	
	Multiply(input: Vec2, output: Vec2) {
        output.x = input.x * this.x[0] + input.y * this.y[0] + this.z[0];
        output.y = input.x * this.x[1] + input.y * this.y[1] + this.z[1];
    }
}

// HotspotRectFlags_t
export const enum RectFlags_t {
    enable_rotation   = 0x1,  // Can this region be randomly rotated?
    enable_reflection = 0x2,  // Can this region be randomly horizontally flipped?
    alt_group         = 0x4,  // If true, this region belongs to the alternate group.
    tile_x            = 0x8,  // Can this region tile horizontally?
    tile_y            = 0x10, // Can this region tile vertically?
    tile_x_y          = tile_x | tile_y,
};


// HotspotRect_t
export class Rect {
	constructor(
		public flags: number,
		public mins: Vec2,
		public maxs: Vec2,
	) {}

    GetWidth() { return this.maxs.x - this.mins.x; }
    GetHeight() { return this.maxs.y - this.mins.y; }

    CanRotate() { return !!(this.flags & RectFlags_t.enable_rotation) }
    CanReflect() { return !!(this.flags & RectFlags_t.enable_reflection) }
    CanTile() { return !!(this.flags & RectFlags_t.tile_x_y) }
    CanTileX() { return !!(this.flags & RectFlags_t.tile_x) }
    CanTileY() { return !!(this.flags & RectFlags_t.tile_y) }
    IsAltGroup() { return !!(this.flags & RectFlags_t.alt_group) }
};


export class RectFitResult {
    constructor(
		public rect_idx: number,
		public rotated: boolean
	) {}

    tiling: Vec2 = new Vec2(0, 0);
    score: number = 0;

	Copy(v: RectFitResult) {
		this.rect_idx = v.rect_idx;
		this.rotated = v.rotated;
		this.tiling.Copy(v.tiling);
		this.score = v.score;
	}
};

export class RectFile {
	constructor(
		public flags: number,
		public tex_size: Vec2,
		public rects: Rect[] = [],
	) {}
}

export class WeightConfig {
    // Aspect scores are raised to the power of ~6.0 when either dimension of the rect approaches 0
    pow_cardinality = 6.0;
    // perfect aspect = 100.0, worst-case approaches 0.0
    weight_dot = 100.0;
    // perfect scale = 50.0,
    // 2x smaller/larger = 0.5 * (50.0) = 25.0,
    // 4x smaller/larger = 0.25 * (50.0) = 12.5
    weight_scale = 50.0;
    // 1x1 tiling = 0.0, 12x12 tiling = -0.144
    weight_tiling = -0.001;
    // The error margin within which matches can be randomized.
    error_margin = 0.1;
}

export class RectFitter {
	constructor(
		public config: WeightConfig = new WeightConfig()
	) {}

	protected GetCardinalityFactor(nrm_dir: Vec2, max_v: number): number {
		const basis = Math.abs(nrm_dir.x) + Math.abs(nrm_dir.y);
		return Math.max(1.0, max_v - (basis - 1.0) * (max_v - 1.0) / Math.SQRT2);
	}

	protected GetBasicScore(dims_surf: Vec2, dims_rect: Vec2): number {
		const len_surf = Ref<number>();
		const len_rect = Ref<number>();
		const dir_surf = dims_surf.Normalized(len_surf);
		const dir_rect = dims_rect.Normalized(len_rect);

		const dot_prod = dir_surf.Dot(dir_rect);
		const cardinality = this.GetCardinalityFactor(dir_rect, this.config.pow_cardinality);
		const dot_weight = Math.pow(dot_prod, cardinality);

		let scale_weight = 0.0;
		if (len_rect.v > kFloatEpsilon && len_surf.v > kFloatEpsilon) {
			scale_weight = len_rect.v > len_surf.v
				? len_surf.v / len_rect.v
				: len_rect.v / len_surf.v;
		}

		return (
			dot_weight * this.config.weight_dot +
			scale_weight * this.config.weight_scale
		);
	}

	protected GetTiledScoreOnAxis(
		dims_surf: Vec2,
		dims_rect: Vec2,
		major_axis: number,
		use_major: boolean,
		use_minor: boolean,
		out_tiling: Vec2
	): number {
		const minor_axis = 1 - major_axis;    

		const major_axis_scale = dims_surf.xy[major_axis] / dims_rect.xy[major_axis];
		const major_axis_count = use_major
			? Math.max(1, Math.round(major_axis_scale))
			: 1;

		const major_axis_tiled_scale = major_axis_scale / major_axis_count;
		const minor_axis_count = use_minor
			? Math.max(1, Math.round(dims_surf.xy[minor_axis] / dims_rect.xy[minor_axis] / major_axis_tiled_scale))
			: 1;

		out_tiling.xy[major_axis] = major_axis_count;
		out_tiling.xy[minor_axis] = minor_axis_count;

		const dims_rect_tiled = new Vec2(dims_rect.x * out_tiling.x, dims_rect.y * out_tiling.y);
		return this.GetBasicScore(dims_surf, dims_rect_tiled);
	}

	protected GetTiledScore(
		dims_surf: Vec2,
		rect: Rect,
		out_score: Ref<number>,
		out_tiling: Vec2
	) {
		const dims_rect = new Vec2(rect.GetWidth(), rect.GetHeight());

		const can_tile_x = rect.CanTileX();
		const can_tile_y = rect.CanTileY();
		const use_minor_axis = can_tile_x && can_tile_y;

		const major_axis =
			+(use_minor_axis ? (dims_surf.y > dims_surf.x) : can_tile_y);

		let tiling_1 = new Vec2(), tiling_2 = new Vec2();
		let score_1: number, score_2: number;

		score_1 = this.GetTiledScoreOnAxis(dims_surf, dims_rect, major_axis, true, use_minor_axis, tiling_1);
		score_2 = this.GetTiledScoreOnAxis(dims_surf, dims_rect, 1 - major_axis, use_minor_axis, true, tiling_2);

		out_tiling.Copy(
			score_2 > score_1
				? tiling_2
				: tiling_1
		);
	}

	GetScore(
		dims_surf: Vec2,
		rect: Rect,
		out_result: RectFitResult,
	) {
		const width = rect.GetWidth();
		const height = rect.GetHeight();

		// Tiled texture
		if (rect.CanTile() && width && height) {
			const score = Ref<number>();
			this.GetTiledScore(dims_surf, rect,  score, out_result.tiling);
			out_result.score = score.v;
		} else {
			out_result.tiling = new Vec2(1, 1);
			out_result.score = this.GetBasicScore(dims_surf, new Vec2(rect.GetWidth(), rect.GetHeight()));
		}
	}

	FitRectToSurface(
		rects: Rect[],
		surf_dims: Vec2,
		out_result: RectFitResult,
	) {
		// let fit_count = rects.length;
		// for (let i=0; i<rects.length; i++) {
		// 	if (rects[i].CanRotate()) fit_count ++;
		// }

		const fit_results: RectFitResult[] = [];
		// fit_results.length = fit_count;

		let best_score = -kFloatInf;
		let best_index = -1;

		const PushFit = (rect_idx: number, rotated: boolean): RectFitResult => {
			return fit_results[fit_results.push(new RectFitResult(rect_idx, rotated)) - 1];
		};

		for (let rect_idx = 0; rect_idx < rects.length; rect_idx++) {
			// Initial fit
			{
				const result = PushFit(rect_idx, false);
				this.GetScore(surf_dims, rects[rect_idx], result);

				if (result.score > best_score) {
					// console.log('New best:', result.score, fit_results.length - 1)
					best_score = result.score;
					best_index = fit_results.length - 1;
				}
			}

			// Rotated fit
			if (rects[rect_idx].CanRotate()) {
				const result = PushFit(rect_idx, true);
				this.GetScore(surf_dims.Swapped(), rects[rect_idx], result);

				if (result.score > best_score) {
					best_score = result.score;
					best_index = fit_results.length - 1;
				}
			}
		}

		const best_fits: number[] = [];

		for (let fit_idx = 0; fit_idx < fit_results.length; fit_idx++) {
			const result = fit_results[fit_idx];
			if (result.score < best_score - this.config.error_margin) continue;
			best_fits.push(fit_idx);
		}

		if (best_fits.length == 0)
			return -1;

		const result_idx = best_fits[Math.round(Math.random() * (best_fits.length - 1))];
		const result = fit_results[result_idx];
		out_result.Copy(result);

		return result.rect_idx;
	}

	GetFinalTransform(
        tex_size: Vec2,
        rect: Rect,
        tiling: Vec2,
        inset: number,
        rotation: number,
        m: Mat3x2
	) {
		// Calculate bounds
		const scale_x = (rect.GetWidth() * tiling.x - inset * 2.0) / tex_size.x;
		const scale_y = (rect.GetHeight() * tiling.y - inset * 2.0) / tex_size.y;
		const offset_x = (rect.mins.x + inset) / tex_size.x;
		const offset_y = (rect.mins.y + inset) / tex_size.y;

		// Create identity matrix
		m.x[0] = 1;  m.x[1] = 0;
		m.y[0] = 0;  m.y[1] = 1;
		m.z[0] = 0;  m.z[1] = 0;

		// Rotate
		if (rotation === 2) {
			m.x[0] = -1; m.y[1] = -1;
			m.z[0] =  1; m.z[1] =  1;
		} else if (rotation) {
			f32swap(m.x, m.y);
			if (rotation > 0)  { m.x[1] = -1; m.z[1] = 1; }
			else               { m.y[0] = -1; m.z[0] = 1; }
		}

		// if (scale_x === 0 || scale_y === 0)
		// 	throw 'whoops';

		// if (m.x[0] === 0 && m.x[1] === 0)
		// 	throw 'whoops x';

		// if (m.y[0] === 0 && m.y[1] === 0)
		// 	throw 'whoops y';



		// Scale
		m.x[0] *= scale_x;
		m.y[0] *= scale_x;
		m.z[0] *= scale_x;

		m.x[1] *= scale_y;
		m.y[1] *= scale_y;
		m.z[1] *= scale_y;

		// Translate
		m.z[0] += offset_x;
		m.z[1] += offset_y;
	}
}
