import { DataBuffer } from 'vtf-js';
import { VHeader, VHeaderTags, VHotspotResource } from 'vtf-js/resources';
import { UploadType, type LoadResult } from '../file_uploader.js';
import type { AtlasFile } from '../context.svelte.js';
import { toHotspotRect } from '../file.js';

export async function load(file: File, filter: UploadType): Promise<LoadResult> {
	if (!(filter & UploadType.kAtlas)) return {};

	const buffer = await file.arrayBuffer();
	const res = decode(buffer);

	return {
		atlas: { rects: res.rects }
	}
}

export function save(src: AtlasFile): File {
	const res = new VHotspotResource(0, 1, 0, src.rects.map(v => toHotspotRect(v)));
	const buffer = encode(res);
	return new File([buffer], src.name + '.hot');
}

export function decode(data: ArrayBuffer): VHotspotResource {
	const header = new VHeader(VHeaderTags.TAG_HOTSPOT, 0x0, 0);
	const view = new DataBuffer(data);

	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return VHotspotResource.decode(header, view, null!);
}

export function encode(data: VHotspotResource): ArrayBuffer {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return data.encode(null!);
}
