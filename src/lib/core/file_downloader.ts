import type Vtf from 'vtf-js';
// import 'vtf-js/addons/squish';

import { setFileExt } from './file_uploader.js';
import { downloadZip } from 'client-zip';
import type { AtlasFile } from './context.svelte.js';

import * as TextFormat from './formats/text_atlas.js';
import * as BinFormat from './formats/binary_atlas.js';
import * as ObjFormat from './formats/obj_atlas.js';
import * as VtfFormat from './formats/vtf_atlas_texture.js';

export interface DownloadOptions {
	vtf: { on: boolean; source?: Vtf };
	hot: { on: boolean; };
	rect: { on: boolean; };
	obj: { on: boolean; };
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


export class AtlasDownloadHandler {
	constructor(
		public file: AtlasFile,
	) {}

	async toCollection(options: DownloadOptions): Promise<File[]> {
		const files: File[] = [];

		if (options.hot.on)
			files.push(this.toBinary());

		if (options.rect.on)
			files.push(this.toText());

		if (options.obj.on)
			files.push(this.toObj());

		if (options.vtf.on) {
			if (!options.vtf.source) throw Error('Vtf embedder must be modifying an existing file!');
			files.push(await this.embedToVtf(options.vtf.source));
		}

		return files;
	}

	toBinary(): File {
		return BinFormat.save(this.file);
	}

	toText(): File {
		return TextFormat.save(this.file);
	}

	toObj(): File {
		return ObjFormat.save(this.file);
	}

	async embedToVtf(vtf: Vtf): Promise<File> {
		VtfFormat.embed(this.file, vtf);
		const buffer = await vtf.encode();
		return new File([buffer], this.file.name + '.vtf');
	}
}

/* 
function generateVtf(
	image: VImageData,
	options: DownloadOptions['vtf']['create'],
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
 */
