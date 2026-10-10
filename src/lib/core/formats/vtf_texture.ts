import { Vtf } from 'vtf-js';
import { VHeaderTags } from 'vtf-js/resources';
import { getFileName, UploadType, type LoadResult } from '../file_uploader.js';

export async function load(
	file: File,
	filter: UploadType,
): Promise<LoadResult> {
	const vtf = await Vtf.decode(await file.arrayBuffer(), {
		onDemand: true,
		noClone: true,
	});

	const [width, height] = vtf.body.getSize();
	const color = filter & UploadType.kMaps && vtf.body.getRawImage(0, 0, 0, 0);

	const hot =
		filter & UploadType.kAtlas &&
		(await vtf.getResource(VHeaderTags.TAG_HOTSPOT));

	const atlas: LoadResult['atlas'] = hot
		? { rects: hot.rects, meta: { width, height, name: getFileName(file.name) } }
		: undefined;

	return {
		maps: color ? { color } : undefined,
		atlas,
	};
}
