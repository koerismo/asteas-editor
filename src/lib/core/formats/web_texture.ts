import { VImageData } from 'vtf-js';
import { UploadType, type LoadResult } from '../file_uploader.js';

export async function load(file: File, filter: UploadType): Promise<LoadResult> {
	if (!(filter & UploadType.kMaps)) return {};

	const img = new Image();
	img.src = URL.createObjectURL(file);
	await img.decode();

	const canvas = new OffscreenCanvas(img.width, img.height);

	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const ctx = canvas.getContext('2d')!;

	ctx.drawImage(img, 0, 0);
	const rawData = ctx.getImageData(0, 0, img.width, img.height);

	URL.revokeObjectURL(img.src);
	img.remove();

	const color = new VImageData(
		new Uint8Array(rawData.data.buffer, rawData.data.byteOffset, rawData.data.length),
		rawData.width,
		rawData.height,
	);

	return {
		maps: { color },
	};
}
