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
	
	fitScale = 1.0;
	size = new Vec2(1, 1);
	uvIslandName = 'island';
	uvFixName = 'uvnrm';

	constructor(geo: Three.BufferGeometry) {
		this.geo = geo;

		const uvsIn = geo.getAttribute('uv')!;
		const uvsOut = new Three.Float32BufferAttribute(new Float32Array(uvsIn.array.length), 2);
		geo.setAttribute(this.uvFixName, uvsOut)!;

		this._parseIslands(uvsIn, uvsOut);
		
		uvsIn.array.set(uvsOut.array);
		uvsIn.needsUpdate = true;
	}

	setRects(rects: RectEntry[]) {
		this.rects = rects.map(v => new Rect(v.flags, new Vec2(v.min_x, v.min_y), new Vec2(v.max_x, v.max_y)));
	}

	setSize(w: number, h: number) {
		this.size.x = w;
		this.size.y = h;
	}

	setScale(scale: number) {
		this.fitScale = scale;
	}

	/**
	 * Identifies each UV island and saves it.
	 * This is fairly expensive, so don't run it often!!!
	 */
	_parseIslands(uvSrcAttribute: Attr, uvTargetAttribute: Attr) {
		const faceCorners = this.geo.index!.array;
		const vertexIslands = new Uint16Array(faceCorners.length).fill(0xffff);

		// Grab vertex UVs
		const srcUvs = uvSrcAttribute.array;
		const outUvs = uvTargetAttribute.array;

		// sort faces by V
		// extend current bounds for each connected face
		// if a new vert isn't connected:
		// - if it is inside the current bounds:
		//   - mark it as attached and continue
		// - else:
		//   - start a new boundary

		const sortedFaces = new Uint16Array(faceCorners.length / 3);
		for (let i=0; i<sortedFaces.length; i++)
			sortedFaces[i] = i * 3;
		
		sortedFaces.sort((faceA, faceB) => {
			const vertex1A = faceCorners[faceA];
			const vertex1B = faceCorners[faceB];
			const vv1A = srcUvs[vertex1A * 2 + 1];
			const vv1B = srcUvs[vertex1B * 2 + 1];
			return vv1A - vv1B;
		}) as Uint16Array;

		const islandBounds: AABB[] = [];
		let islandIdx = -1;
		let islandVMax = -Infinity;
	
		for (let face=0; face<sortedFaces.length; face++) {
			const index = sortedFaces[face];
			const vtx1 = faceCorners[index];
			const vtx2 = faceCorners[index + 1];
			const vtx3 = faceCorners[index + 2];

			const vv1 = srcUvs[vtx1 * 2 + 1];
			const vv2 = srcUvs[vtx2 * 2 + 1];
			const vv3 = srcUvs[vtx3 * 2 + 1];

			const vMin = Math.min(vv1, vv2, vv3);
			const vMax = Math.max(vv1, vv2, vv3);
			
			if (vMin === vMax) {
				console.warn('wtf');
			}

			if (vMin > islandVMax + 0.01) {
				islandIdx ++;
				islandBounds[islandIdx] = new AABB().invalidate();
				islandVMax = vMax;
				// console.log('Created island at', islandVMax);
			} else if (vMax > islandVMax) {
				islandVMax = vMax;
			}

			vertexIslands[vtx1] = islandIdx;
			vertexIslands[vtx2] = islandIdx;
			vertexIslands[vtx3] = islandIdx;
		}

		// Write island data back to mesh
		const islandAttribute = new Three.Uint16BufferAttribute(vertexIslands, 1);
		this.geo.setAttribute(this.uvIslandName, islandAttribute);

		// Find bounds of each island
		for (let i=0; i<faceCorners.length; i++) {
			const vertexIdx = faceCorners[i];
			const uvIdx = vertexIdx * 2;
			const u = srcUvs[uvIdx], v = srcUvs[uvIdx + 1];

			const island = vertexIslands[vertexIdx];
			islandBounds[island].expandToPoint(u, v);
		}

		// Save bounds.
		this.islands = islandBounds;

		// rescale islands to fill UV space

		const islandTf = new Float64Array(islandBounds.length * 4);
		for (let i=0, idx=0; i<islandBounds.length; i++) {
			const island = islandBounds[i];
			if (!island.isValid()) {
				console.warn('Empty island', i, '!');
				idx += 4;
				continue;
			}

			if (island.width === 0 || island.height === 0) {
				if (island.width === 0 && island.height === 0) {
					console.warn('Point UVs on island ' + i + '!');
				} else {
					console.warn('Bad UVs on island ' + i + '!', island.width === 0, island.height === 0);
				}
			}

			islandTf[idx++] = island.min_x;
			islandTf[idx++] = island.min_y;
			islandTf[idx++] = island.width ? (1 / island.width) : 1;
			islandTf[idx++] = island.height ? (1 / island.height) : 1;
		}
		
		for (let i=0, idx=0; i<uvSrcAttribute.count; i++, idx+=2) {
			const islandIdx = vertexIslands[i];
			const tfIdx = islandIdx * 4;

			const u = srcUvs[idx], v = srcUvs[idx + 1];
			const dstU = (u - islandTf[tfIdx])     * (islandTf[tfIdx + 2]);
			const dstV = (v - islandTf[tfIdx + 1]) * (islandTf[tfIdx + 3]);
			
			outUvs[idx] = dstU;
			outUvs[idx + 1] = dstV;
		}

		uvTargetAttribute.needsUpdate = true;
	}

	fit(targetUvAttribute: Attr) {
		const srcUvAttribute = this.geo.getAttribute(this.uvFixName);
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
			islandSize.x *= this.size.x * this.fitScale * 2.0; 
			islandSize.y *= this.size.y * this.fitScale * 2.0;

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

		const vec = new Vec2();

		for (let i=0, idx=0; i<uvCount; i++, idx+=2) {
			const islandIdx = vertexIslands[i];
			vec.Set(srcUvs[idx], srcUvs[idx + 1]);
			xForms[islandIdx].Multiply(vec, vec);
			targetUvs[idx] = vec.x;
			targetUvs[idx + 1] = vec.y;
		}

		targetUvAttribute.needsUpdate = true;
	}
}
