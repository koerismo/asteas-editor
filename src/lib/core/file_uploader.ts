import { VImageData, Vtf, VCollection, VFormats, VFilters, type VImageEither } from 'vtf-js';
import { getPixelArrayMax } from 'vtf-js/dist/core/image.js';
import 'vtf-js/addons/squish';

import * as TextFormat from './formats/text_atlas.js';
import * as BinFormat from './formats/binary_atlas.js';
import * as ObjFormat from './formats/obj_atlas.js';
import * as VtfFormat from './formats/vtf_texture.js';
import * as WebFormat from './formats/web_texture.js';

import { downloadZip } from 'client-zip';
import type { AtlasFile, DocumentMaps } from './context.svelte.js';

export interface LoadAtlasMeta {
	name: string;
	width: number;
	height: number;
}

/** Undefined indicates to leave unchanged. */
export interface LoadResult {
	/** The document maps to assign. */
	maps?: DocumentMaps;
	/** The atlas rects to assign, with optional associated metadata. */
	atlas?: { rects: AtlasFile['rects'], meta?: LoadAtlasMeta };
};

export const enum UploadType {
	kInvalid = 0x0,
	kAtlas = 0x1,
	kMaps = 0x2,
	kAll = 0x3,
}

/**
 * `abc.def` -> `def`
 * 
 * `abc` -> `abc`
 */
export function getFileExt(s: string): string {
	return s.slice(s.lastIndexOf('.') + 1);
}

export function getFileName(s: string): string {
	return s.slice(s.lastIndexOf('/') + 1);
}

export function setFileExt(s: string, to: string): string {
	const dot = s.lastIndexOf('.');
	return dot === -1
		? s + to
		: s.slice(0, dot) + to;
}

export async function download(files: File[], filename?: string) {
	const a = document.createElement('a');

	if (files.length > 1) {
		const zip = await downloadZip(files).blob();
		a.href = URL.createObjectURL(zip);
		a.download = setFileExt(filename ?? (files[0].name), '.zip');
	} else {
		a.href = URL.createObjectURL(files[0]);
		a.download = files[0].name;
	}

	a.click();

	URL.revokeObjectURL(a.href);
	a.remove();
}

export interface SaveOptions {
	vtf: {
		on: boolean;
		create: {
			lossy: boolean;
			mipmaps: boolean;
			strata: boolean;
		};
	};
	hot: { on: boolean; };
	rect: { on: boolean; };
	obj: { on: boolean; };
}

export class UploadHandler {
	#result: LoadResult = {};
	#context: LoadAtlasMeta | undefined;
	#fallbackName: string | undefined;

	clear() {
		this.#result = {};
		this.#context = undefined;
		this.#fallbackName = undefined;
	}

	appendResult(loadedFile: LoadResult) {
		this.#result.atlas ??= loadedFile.atlas;
		this.#result.maps ??= loadedFile.maps;
	}

	setContext(context?: LoadAtlasMeta) {
		this.#context = context;
	}

	getResult(): Readonly<LoadResult> {
		return this.#result;
	}

	/** Creates a new document from the uploaded results. */
	toAtlasFile(): AtlasFile | undefined {

		const atlas: LoadResult['atlas'] = this.#result.atlas ?? { rects: [] };
		const maps: LoadResult['maps'] = this.#result.maps ?? { };

		const metaFromColor = (): LoadAtlasMeta | undefined => {
			if (maps.color)
				return {
					width: maps.color.width,
					height: maps.color.height,
					name: this.#fallbackName ?? 'untitled',
				};
		};

		const meta = this.#context ?? atlas.meta ?? metaFromColor();
		if (!meta) return;

		return {
			name: meta.name,
			width: meta.width,
			height: meta.height,
			rects: atlas.rects,
			maps: maps,
		}
	}

	/** Loads the given file into this context, returning success state. */
	async loadFile(file: File, type: string, filter: UploadType): Promise<boolean> {
		let result: LoadResult | undefined;

		switch (type) {
			case 'rect':
			case 'txt':
				result = await TextFormat.load(file, filter);
				break;

			case 'hot':
				result = await BinFormat.load(file, filter);
				break;

			case 'vtf':
				result = await VtfFormat.load(file, filter);
				break;

			case 'obj':
				if (this.#context) {
					result = await ObjFormat.load(file, filter, this.#context);
				} else {
					console.warn(
						'Cannot load OBJ without an active document context!',
					);
				}
				break;

			case 'png':
			case 'webp':
			case 'jpg':
			case 'jpeg':
			case 'jxl':
			case 'avif':
			case 'gif':
			case 'svg':
				result = await WebFormat.load(file, filter);
				break;

			default:
				console.warn(`Unrecognized file format: "${type}"`);
		}

		if (!result) return false;

		this.#fallbackName ??= getFileName(file.name);
		this.appendResult(result);

		return true;
	}

	async loadFiles(files: FileList, filter: UploadType = UploadType.kAll): Promise<boolean> {
		let no_warn = true;
		let all_files = true;

		const kTypeWeights: Record<string, number> = {
			vtf: 1,
			obj: 2,
		};

		const entries = Array.from(files)
			.map((file) => {
				return { file, type: getFileExt(file.name).toLowerCase() };
			})
			.sort((a, b) => {
				const w1 = kTypeWeights[a.type] ?? 0;
				const w2 = kTypeWeights[b.type] ?? 0;
				return w1 - w2;
			});

		for (const entry of entries) {
			if (this.#result.maps && this.#result.atlas) {
				all_files = false;
				break;
			}
			no_warn &&= await this.loadFile(entry.file, entry.type, filter);
		}

		if (!all_files) {
			console.warn(
				'One or more uploaded files were skipped. All parameters are filled!',
			);
		}

		return no_warn && all_files;
	}

	async loadUrl(url: string) {
		const res = await fetch(url);
		if (!res.ok) {
			console.error(res.status, res.statusText);
			return;
		}

		const file = new File([await res.blob()], getFileName(url));
		await this.loadFile(file, getFileExt(file.name), UploadType.kAll);
	}

	// #region Saving

	protected generateVtf(
		image: VImageData,
		options: SaveOptions['vtf']['create'],
	) {
		let format: VFormats;
		let hasAlpha = false;
		const maxV = getPixelArrayMax(image.data);

		for (let i = 3; i < image.data.length; i += 4) {
			if (image.data[i] >= maxV) continue;
			hasAlpha = true;
			break;
		}

		if (options.lossy) {
			format = hasAlpha ? VFormats.DXT5 : VFormats.DXT1;
		} else {
			format = hasAlpha ? VFormats.RGBA8888 : VFormats.RGB888;
		}

		const data = new VCollection(image.width, image.height);
		data.resize();
		data.setImage(image);

		const vtf = new Vtf(data, { format });

		if (options.mipmaps) {
			data.resize({ mips: -1 });
			data.generateMips(VFilters.CatRom, true);

			vtf.computeReflectivity();
			vtf.computeThumb();
		}

		if (options.strata) {
			vtf.version = 6;
			vtf.compression_level = -1;
		}

		return vtf;
	}
}
