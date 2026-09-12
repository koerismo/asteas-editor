import * as Three from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import Cube1 from '../../../assets/meshes/cube1.glb?url';

export class ModelHotspotter {
	mesh: Three.Mesh;
	geo: Three.BufferGeometry;
	islands: { source: Float32Array; bounds: Three.Box2; }[] = [];

	constructor(mesh: Three.Mesh) {
		this.mesh = mesh;
		this.geo = mesh.geometry;
		this.parseIslands();
	}

	parseIslands() {
		const vertexIslands: Record<number, number> = {};

		const indices = this.geo.index!.array;
		for (let i=0, f=0; i<indices.length; i+=3, f++) {
			const v1 = indices[i];
			const v2 = indices[i+1];
			const v3 = indices[i+2];

			let target = f;
			if (v1 in vertexIslands) {
				target = vertexIslands[v1];
			} else if (v2 in vertexIslands) {
				target = vertexIslands[v2];
			} else if (v3 in vertexIslands) {
				target = vertexIslands[v3];
			}

			vertexIslands[v1] = target;
			vertexIslands[v2] = target;
			vertexIslands[v3] = target;
		}

		console.log(vertexIslands);

		const islandBounds: Record<string, Three.Box2> = {};
		const islandVertices: Record<number, number[]> = {};

		for (const vtx in vertexIslands) {
			const isl = vertexIslands[vtx];
			if (isl in islandVertices) {
				islandVertices[isl].push(+vtx);
			} else {
				islandVertices[isl] = [+vtx];
			}
		}

		console.log(islandVertices);
		// const uvs = this.geo.getAttribute('uv');
	}
}

// const group = await new FBXLoader().loadAsync(Cube1);
// const mesh = group.children[0] as Three.Mesh;
const group = await new GLTFLoader().loadAsync(Cube1);
const mesh = group.scene.children[0] as Three.Mesh;
console.log(group); 
export const hs = new ModelHotspotter(mesh);
