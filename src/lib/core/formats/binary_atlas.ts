import { DataBuffer } from 'vtf-js';
import { HotspotRect, VHeader, VHeaderTags, VHotspotResource } from 'vtf-js/resources';
import { UploadType, type LoadResult } from '../file_uploader.js';
import type { AtlasFile } from '../context.svelte.js';
import { toHotspotRect } from '../file.js';
import type { RectLike } from '../aabb.js';

export async function load(file: Blob, filter: UploadType): Promise<LoadResult> {
	if (!(filter & UploadType.kAtlas)) return {};

	const buffer = await file.arrayBuffer();
	const rects = decode(buffer);

	return {
		atlas: { rects },
	}
}

export function save(src: AtlasFile): File {
	const buffer = encode(src.rects);
	return new File([buffer], src.name + '.hot');
}

export function decode(data: ArrayBuffer): HotspotRect[] {
	const header = new VHeader(VHeaderTags.TAG_HOTSPOT, 0x0, 0);
	const view = new DataBuffer(data);

	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return VHotspotResource.decode(header, view, null!).rects;
}

export function encode(rects: RectLike[]): ArrayBuffer {
	const res = new VHotspotResource(0, 1, 0, rects.map(v => toHotspotRect(v)));

	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return res.encode(null!);
}
