import { HotspotRect, HotSpotRectFlags } from 'vtf-js/resources';
import { UploadType, type LoadAtlasMeta, type LoadResult } from '../file_uploader.js';
import type { RectLike } from '../aabb.js';
import type { AtlasFile } from '../context.svelte.js';
import { getProduct } from '../version.js';

interface OBJMeshDict {
	/** step=3 */
	vertices: number[];
	/** step=2 */
	uvs: number[];
	/** step=1xN */
	faces: number[][];
}

const kSplitRegex = /\s+/g;
const kDefaultFlags = HotSpotRectFlags.AllowRotation | HotSpotRectFlags.AllowReflection;

// #region OBJ format read/write

const OBJFormat = {
	encode({ vertices, uvs, faces }: OBJMeshDict): string {
		const output: string[] = ['# ' + getProduct(), 'o Atlas'];

		for (let idx = 0; idx < vertices.length;) {
			output.push('v ' + vertices[idx++] + ' ' + vertices[idx++] + ' ' + vertices[idx++]);
		}

		for (let idx = 0; idx < uvs.length;) {
			output.push('vt ' + uvs[idx++] + ' ' + uvs[idx++]);
		}

		for (let i = 0; i < faces.length; i++) {
			const f = faces[i];
			const lineOut = f.map((v) => v + 1 + '/' + (v + 1));
			output.push('f ' + lineOut.join(' '));
		}

		return output.join('\n');
	},

	decode(text: string): OBJMeshDict {
		const lines = text.split('\n');
		const objVerts: number[] = [];
		const objUvs: number[] = [];

		let vertCount = 0;
		const faces: number[][] = [];
		const vertices: number[] = [];
		const uvs: number[] = [];

		const vertCache: Record<string, number> = {};
		const getVert = (vertIdx: number, uvIdx: number) => {
			const hash = vertIdx + ',' + uvIdx;
			if (hash in vertCache) return vertCache[hash];

			const newId = vertCount;
			vertCache[hash] = newId;
			vertCount++;

			vertices.push(objVerts[vertIdx], objVerts[vertIdx + 1], objVerts[vertIdx + 2]);
			uvs.push(objUvs[uvIdx], objUvs[uvIdx + 1]);
			return newId;
		};

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line.length < 2 || line[0] === '#') continue;

			const args = line.split(kSplitRegex);
			const cmd = args.shift();

			switch (cmd) {
				case 'v':
					objVerts.push(+args[0], +args[1], +args[2]);
					break;
				case 'vt':
					objUvs.push(+args[0], +(args[1] ?? 0));
					break;
				case 'f':
					faces.push(
						args.map<number>((v) => {
							const VUN = v.split('/', 3);
							const V = +VUN[0],
								U = +VUN[1];
							return getVert((V - 1) * 3, (U - 1) * 2);
						}),
					);
					break;
			}
		}

		return {
			uvs,
			vertices,
			faces,
		};
	},
} as const;

// #region Atlas transpiler

export async function load(
	file: Blob,
	filter: UploadType,
	context: LoadAtlasMeta,
): Promise<LoadResult> {
	if (!(filter & UploadType.kAtlas)) return {};

	const text = await file.text();
	const rects = decode(text, context.width, context.height);
	return { atlas: { rects } };
}

export function save(src: AtlasFile): File {
	const text = encode(src.rects, src.width, src.height);
	return new File([text], src.name + '.obj');
}

export function decode(text: string, width: number, height: number): HotspotRect[] {
	const { faces, uvs } = OBJFormat.decode(text);
	const rects = new Array<HotspotRect>(faces.length);

	for (let i = 0; i < faces.length; i++) {
		const face = faces[i];
		let min_x = Infinity;
		let min_y = Infinity;
		let max_x = -Infinity;
		let max_y = -Infinity;

		for (let j = 0; j < face.length; j++) {
			const idx = face[j] * 2;
			const u = uvs[idx],
				v = 1.0 - uvs[idx + 1];
			if (u < min_x) min_x = u;
			if (u > max_x) max_x = u;
			if (v < min_y) min_y = v;
			if (v > max_y) max_y = v;
		}

		rects[i] = new HotspotRect(
			kDefaultFlags,
			Math.round(min_x * width),
			Math.round(min_y * height),
			Math.round(max_x * width),
			Math.round(max_y * height),
		);
	}

	return rects;
}

export function encode(rects: RectLike[], width: number, height: number): string {
	let vertCount = 0;

	const vertices: number[] = [];
	const uvs: number[] = [];
	const vertCache: Record<string, number> = {};

	const getVert = (x: number, y: number) => {
		const hash = x.toString() + ',' + y.toString();
		if (hash in vertCache) return vertCache[hash];

		vertices.push((x / width) * 2 - 1, 0, (y / height) * 2 - 1);
		uvs.push(x / width, 1 - y / height);

		const index = vertCount;
		vertCache[hash] = vertCount;
		vertCount++;

		return index;
	};

	const faces: number[][] = [];

	for (let i = 0; i < rects.length; i++) {
		const rect = rects[i];
		const v1 = getVert(rect.min_x, rect.min_y);
		const v2 = getVert(rect.max_x, rect.min_y);
		const v3 = getVert(rect.min_x, rect.max_y);
		const v4 = getVert(rect.max_x, rect.max_y);
		faces.push([v3, v4, v2, v1]);
	}

	return OBJFormat.encode({
		uvs,
		vertices,
		faces,
	});
}
