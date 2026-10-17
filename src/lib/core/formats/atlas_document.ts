import type { AtlasFile, DocumentMaps } from '../context.svelte.js';

import { DataBuffer } from 'vtf-js';
import { getProduct } from '../version.js';

import * as BinFormat from './binary_atlas.js';
import * as WebFormat from './web_texture.js';
import { getFileName, setFileExt, type LoadAtlasMeta } from '../file_uploader.js';
import type { RectLike } from '../aabb.js';

// u32: magic[3] + version
// u16: chunkCount

// | u8: chunkRole
// | u8: chunkCompression
// | u16: chunkPos

// | | u8: chunkMimeSize
// | | str: chunkMime
// | | u16: chunkDataSize
// | | bytes: chunkData

const enum Role {
	kInvalid = 0x0,
	kComment,

	kMeta = 0x8,
	kRects,
	kMap,
}

function compressBlob(blob: Blob): Response {
	return new Response(blob.stream().pipeThrough(new CompressionStream('deflate')));
}

function decompressBlob(blob: Blob): Response {
	return new Response(blob.stream().pipeThrough(new DecompressionStream('deflate')));
}

// Atl, version 0x1
const kMagic = 0x41_74_6c_01;

interface IntermediateChunk {
	role: Role;
	compress: boolean;
	type: string;
	data: Uint8Array<ArrayBuffer>;
}

const kProductBytes = new TextEncoder().encode(getProduct());

export async function save(file: AtlasFile): Promise<File> {
	const chunkList: IntermediateChunk[] = [];
	let headerSize = 4 + 2;
	let bodySize = 0;

	const addChunk = (chunk: IntermediateChunk) => {
		chunkList.push(chunk);
		headerSize += 4;
		bodySize += 1 + chunk.type.length + 2 + chunk.data.byteLength;
	};

	// Comment for versioning
	addChunk({
		role: Role.kComment,
		compress: false,
		type: 'text/plain',
		data: kProductBytes,
	});

	// Metadata
	const meta = DataBuffer.new(4);
	meta.write_u16(file.width);
	meta.write_u16(file.height);

	addChunk({
		role: Role.kMeta,
		compress: false,
		type: 'text/plain',
		data: meta,
	});

	// Rects
	if (file.rects.length) {
		addChunk({
			role: Role.kRects,
			compress: false,
			type: 'application/atlas.binary',
			data: new Uint8Array(BinFormat.encode(file.rects)),
		});
	}

	// Textures
	for (const name in file.maps) {
		const map = file.maps[name as keyof DocumentMaps];
		if (!map) continue;
		if (!name.length || name.length > 255) throw Error('whoops');

		const body = await WebFormat.save(map.decode().coerce(Uint8Array));
		const data = DataBuffer.new(1 + name.length + body.size);

		data.write_u8(name.length);
		data.write_str(name);
		data.write_u8array(await body.bytes());

		addChunk({
			role: Role.kMap,
			compress: true,
			type: 'image/png',
			data,
		});
	}

	const fileView = DataBuffer.new(headerSize + bodySize);
	const bodyView = fileView.ref();

	bodyView.seek(headerSize);

	fileView.write_u32(kMagic, false);
	fileView.write_u16(chunkList.length);

	for (const chunk of chunkList) {
		fileView.write_u8(chunk.role);
		fileView.write_u8(+chunk.compress);
		fileView.write_u16(bodyView.pointer);

		let content: Uint8Array;
		if (chunk.compress) {
			content = await compressBlob(new Blob([chunk.data])).bytes();
		} else {
			content = chunk.data;
		}

		bodyView.write_u8(chunk.type.length);
		bodyView.write_str(chunk.type);
		bodyView.write_u16(content.length);
		bodyView.write_u8array(content);
	}

	return new File([fileView], file.name + '.atlas');
}

export async function decode(file: File) {
	const abuf = await file.arrayBuffer();
	const fileView = DataBuffer.ref(abuf);
	const bodyView = fileView.ref();

	if (fileView.read_u32(false) !== kMagic)
		throw Error('File magic does not match expected value!');

	const chunkCount = fileView.read_u16();
	if (chunkCount === 0 || chunkCount > 100)
		throw Error('Bad chunk count!? ' + chunkCount + ' items!');

	const chunkList: IntermediateChunk[] = [];
	chunkList.length = chunkCount;

	for (let i = 0; i < chunkCount; i++) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment
		const role: Role = fileView.read_u8();
		const compress = !!fileView.read_u8();
		const pointer = fileView.read_u16();

		bodyView.seek(pointer);
		const mimeLength = bodyView.read_u8();
		const type = bodyView.read_str(mimeLength);

		const byteLength = bodyView.read_u16();
		let data = bodyView.read_u8array(byteLength, false);
		if (compress) data = await decompressBlob(new Blob([data], { type })).bytes();

		chunkList[i] = {
			role,
			compress,
			type,
			data,
		};
	}

	let rects: RectLike[] | undefined;
	let meta: LoadAtlasMeta | undefined;

	for (const chunk of chunkList) {
		switch (chunk.role) {
			case Role.kRects: {
				const chunk_rects = BinFormat.decode(chunk.data.buffer);
				rects ??= chunk_rects;
				break;
			}
			case Role.kMeta: {
				const data = DataBuffer.ref(chunk.data);
				const width = data.read_u16();
				const height = data.read_u16();
				meta ??= { width, height, name: setFileExt(getFileName(file.name), '') };
				break;
			}
			case Role.kMap: {
				break;
			}
		}
	}
}
