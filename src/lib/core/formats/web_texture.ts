import { VImageData } from 'vtf-js';
import { DataBuffer } from 'vtf-js';
import { UploadType, type LoadResult } from '../file_uploader.js';

export async function load(
	file: File,
	filter: UploadType,
): Promise<LoadResult> {
	if (!(filter & UploadType.kMaps)) return {};
	const color = await decode(file);
	return {
		maps: { color },
	};
}

export async function save(
	img: VImageData<Uint8Array<ArrayBuffer>>,
): Promise<Blob> {
	const srcData = img.data;
	const canvas = new OffscreenCanvas(img.width, img.height);

	const data = new ImageData(
		new Uint8ClampedArray(
			srcData.buffer,
			srcData.byteOffset,
			srcData.length,
		),
		img.width,
		img.height,
	);

	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const ctx = canvas.getContext('2d')!;
	ctx.putImageData(data, 0, 0);

	return await canvas.convertToBlob({ type: 'image/png' });
}

export async function decode(file: Blob): Promise<VImageData> {
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

	return new VImageData(
		new Uint8Array(
			rawData.data.buffer,
			rawData.data.byteOffset,
			rawData.data.length,
		),
		rawData.width,
		rawData.height,
	);
}


// async function getPngSize(file: Blob): Promise<[number, number]> {
// 	const view = DataBuffer.ref(await file.arrayBuffer());

// 	if (view.read_u32(false) !== 0x89_50_4e_47)
// 		throw Error('Expected PNG header!');

// 	view.seek(0x0c);
// 	if (view.read_u32(false) !== 0x49_48_44_52)
// 		throw Error('Expected IHDR at 0x0C!');

// 	const width = view.read_u32(false);
// 	const height = view.read_u32(false);
// 	return [width, height];
// }

// async function getGenericSize(file: Blob): Promise<[number, number]> {
// 	const img = new Image();
// 	const url = URL.createObjectURL(file);
// 	img.src = url;

// 	await img.decode();
// 	const width = img.width, height = img.height;

// 	URL.revokeObjectURL(url);
// 	img.remove();

// 	return [width, height];
// }

// /** Retrieves the dimensions for a given image file, avoiding a full decode if possible. */
// export async function getImageSize(file: Blob) {
// 	switch (file.type) {
// 		case 'image/png':
// 			return getPngSize(file);
// 		default:
// 			console.warn('getImageSize: No fastpath for type ' + file.type);
// 			return getGenericSize(file);
// 	}
// }