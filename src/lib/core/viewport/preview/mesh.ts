import * as Three from 'three';
import { Mat3x2, Rect, RectFitResult, RectFitter, Vec2, WeightConfig } from './hotspot.js';
import type { RectEntry } from '$lib/core/file.js';
import { AABB } from '$lib/core/aabb.js';

type Attr = Three.BufferAttribute | Three.InterleavedBufferAttribute;

const kPreviewConfig = new WeightConfig();

export class ModelHotspotter {
	geo: Three.BufferGeometry;
	islands: AABB[] = [];

	rects: Rect[] = [];
	fitter = new RectFitter(kPreviewConfig);

	size = new Vec2(1, 1);

	uvIslandName = 'island';

	constructor(geo: Three.BufferGeometry) {
		this.geo = geo;
		const uvs = geo.getAttribute('uv')!;
		this._parseIslands(uvs);
	}

	setRects(rects: RectEntry[]) {
		this.rects = rects.map(v => new Rect(v.flags, new Vec2(v.min_x, v.min_y), new Vec2(v.max_x, v.max_y)));
	}

	setSize(w: number, h: number) {
		this.size.x = w;
		this.size.y = h;
	}

	/**
	 * Identifies each UV island and saves it.
	 * This is fairly expensive, so don't run it often!!!
	 */
	_parseIslands(uvAttribute: Attr) {
		const faceCorners = this.geo.index!.array;
		const vertexIslands = new Uint16Array(faceCorners.length).fill(0xffff);
		
		const islandBounds: AABB[] = [];
		for (let face=0, islandIdx=0; face<faceCorners.length; face+=3) {
			const v1 = faceCorners[face];
			const v2 = faceCorners[face + 1];
			const v3 = faceCorners[face + 2];

			let island: number;
			if (vertexIslands[v1] !== 0xffff) {
				island = vertexIslands[v1];
			} else if (vertexIslands[v2] !== 0xffff) {
				island = vertexIslands[v2];
			} else if (vertexIslands[v3] !== 0xffff) {
				island = vertexIslands[v3];
			} else {
				island = islandIdx++;
				if (island === 0xffff)
					throw 'Exceeded 65,535 islands! how???';
			}

			vertexIslands[v1] = island;
			vertexIslands[v2] = island;
			vertexIslands[v3] = island;
			islandBounds[island] = new AABB().set(1, 1, 0, 0);
		}

		// Write island data back to mesh
		const islandAttribute = new Three.Uint16BufferAttribute(vertexIslands, 1);
		this.geo.setAttribute(this.uvIslandName, islandAttribute);

		// Grab vertex UVs
		// const uvAttribute = this.geo.getAttribute('uv')!;
		const uvs = uvAttribute.array;

		// Find bounds of each island
		for (let i=0; i<faceCorners.length; i++) {
			const vertexIdx = faceCorners[i];
			const uvIdx = vertexIdx * 2;
			const u = uvs[uvIdx], v = uvs[uvIdx + 1];

			const island = vertexIslands[vertexIdx];
			islandBounds[island].expandToPoint(u, v);
		}

		// Save bounds.
		this.islands = islandBounds;

		// rescale islands to fill UV space

		const islandTf = new Float32Array(islandBounds.length * 4);
		for (let i=0, idx=0; i<islandBounds.length; i++) {
			const island = islandBounds[i];
			if (island.width === 0 || island.height === 0) {
				console.warn('Bad UVs on island ' + i + '!');
				if (island.width === 0)
					island.max_x += 0.00_001;
				if (island.height === 0)
					island.max_y += 0.00_001;
			}

			islandTf[idx++] = island.min_x;
			islandTf[idx++] = island.min_y;
			islandTf[idx++] = 1.0 / island.width;
			islandTf[idx++] = 1.0 / island.height;
		}
		
		for (let i=0, idx=0; i<uvAttribute.count; i++, idx+=2) {
			const islandIdx = vertexIslands[i];
			const tfIdx = islandIdx * 4;

			uvs[idx] = (
				(uvs[idx] - islandTf[tfIdx]) * islandTf[tfIdx + 2]
			);
			uvs[idx + 1] = (
				(uvs[idx + 1] - islandTf[tfIdx + 1]) * islandTf[tfIdx + 3]
			);
		}

		uvAttribute.needsUpdate = true;
	}

	fit(srcUvAttribute: Attr, targetUvAttribute: Attr) {
		// const srcUvAttribute = this.geo.getAttribute('uv');
		const srcUvs = srcUvAttribute.array;
		const uvCount = srcUvAttribute.count;

		const targetUvs = targetUvAttribute.array;

		const islandAttribute = this.geo.getAttribute(this.uvIslandName);
		const vertexIslands = islandAttribute.array;

		if (targetUvAttribute.count !== uvCount) {
			throw `Target mesh size does not match analyzed mesh! (${targetUvAttribute.count} !== ${uvCount})`;
		}

		const xFormBuffer = new Float64Array(this.islands.length * 6);
		const xForms = new Array<Mat3x2>(this.islands.length);

		const output = new RectFitResult(-1, false);
		const islandSize = new Vec2();

		for (let i=0, idx=0; i<this.islands.length; i++, idx+=6) {
			this.islands[i].getSize(islandSize);
			islandSize.x *= this.size.x * 10.0; 
			islandSize.y *= this.size.y * 10.0;

			const rectIdx = this.fitter.FitRectToSurface(this.rects, islandSize, output);
			const mat3x2 = xForms[i] = new Mat3x2(xFormBuffer.subarray(idx, idx + 6));
			if (rectIdx !== -1) {

				let rotation = 0;
				if (this.rects[rectIdx].CanRotate() && Math.random() > 0.5)
					rotation = 2;
				if (output.rotated)
					rotation -= 1;

				this.fitter.GetFinalTransform(this.size, this.rects[rectIdx], output.tiling, 0, rotation, mat3x2);
			} else {
				mat3x2.values.set([1, 0, 0, 1, 0, 0]);
			}
		}

		for (let i=0, idx=0; i<uvCount; i++, idx+=2) {
			const islandIdx = vertexIslands[i];
			const vec = new Vec2(srcUvs[idx], srcUvs[idx + 1]);
			xForms[islandIdx].Multiply(vec, vec);
			targetUvs[idx] = vec.x;
			targetUvs[idx + 1] = vec.y;
		}

		targetUvAttribute.needsUpdate = true;
	}
}
