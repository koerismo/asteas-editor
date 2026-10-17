import { Vtf } from 'vtf-js';
import { VHeaderTags, VHotspotResource } from 'vtf-js/resources';
import { getFileName, UploadType, type LoadResult } from '../file_uploader.js';
import type { AtlasFile } from '../context.svelte.js';
import { toHotspotRect } from '../file.js';

export async function load(file: File, filter: UploadType): Promise<LoadResult> {
	const vtf = await Vtf.decode(await file.arrayBuffer(), {
		onDemand: true,
		noClone: true,
	});

	const [width, height] = vtf.body.getSize();
	const color = filter & UploadType.kMaps && vtf.body.getRawImage(0, 0, 0, 0);

	const hot = filter & UploadType.kAtlas && (await vtf.getResource(VHeaderTags.TAG_HOTSPOT));

	const atlas: LoadResult['atlas'] = hot
		? {
				rects: hot.rects,
				meta: { width, height, name: getFileName(file.name) },
			}
		: undefined;

	return {
		maps: color ? { color } : undefined,
		atlas,
	};
}

export function embed(src: AtlasFile, target: Vtf): void {
	const res = new VHotspotResource(
		0,
		1,
		0,
		src.rects.map((v) => toHotspotRect(v)),
	);

	const resIdx = target.meta.findIndex((v) => v.tag === VHeaderTags.TAG_HOTSPOT);

	if (resIdx === -1) target.meta.push(res);
	else target.meta[resIdx] = res;
}
