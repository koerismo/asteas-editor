import * as Three from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import Cube1 from '../../../assets/meshes/cube1.glb?url';
import { AABB } from '../aabb.js';

export class ModelHotspotter {
	mesh: Three.Mesh;
	geo: Three.BufferGeometry;
	islandBounds: AABB[] = [];

	constructor(mesh: Three.Mesh) {
		this.mesh = mesh;
		this.geo = mesh.geometry;
		this.parseIslands();
	}

	/**
	 * Identifies each UV island and saves it.
	 * This is fairly expensive, so don't run it often!!!
	 */
	parseIslands() {
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
		this.geo.setAttribute('island', islandAttribute);

		// Grab vertex UVs
		const uvAttribute = this.geo.getAttribute('uv')!;
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
		this.islandBounds = islandBounds;

		// rescale islands to fill UV space

		const islandTf = new Float32Array(islandBounds.length * 4);
		for (let i=0, idx=0; i<islandBounds.length; i++) {
			const island = islandBounds[i];
			if (island.width == 0 || island.height == 0)
				throw 'Bad UVs on island ' + i + '!';

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
}

// const group = await new FBXLoader().loadAsync(Cube1);
// const mesh = group.children[0] as Three.Mesh;
const group = await new GLTFLoader().loadAsync(Cube1);
const mesh = group.scene.children[0] as Three.Mesh;

export const hs = new ModelHotspotter(mesh);
console.log(hs.islandBounds);
