import { VImageData, Vtf, DataBuffer, type VImageEither, VCollection, VFormats, VFilters } from 'vtf-js';
import { VHeader, VHeaderTags, VHotspotResource } from 'vtf-js/resources';
import { getPixelArrayMax } from 'vtf-js/dist/core/image.js';
import 'vtf-js/addons/squish';

import type { EditorState } from './context.svelte.js';
import { HotspotTextFormat } from './text_format.js';
import { RectFile } from './file.js';
import { downloadZip } from 'client-zip';

/**
 * `abc.def` -> `def`
 * 
 * `abc` -> `abc`
 */
function getFileExt(s: string): string {
	return s.slice(s.lastIndexOf('.') + 1);
}

function getFileName(s: string): string {
	return s.slice(s.lastIndexOf('/') + 1);
}

function setFileExt(s: string, to: string): string {
	const dot = s.lastIndexOf('.');
	return dot === -1
		? s + to
		: s.slice(0, dot) + to;
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
}

export class EditorIO {
	constructor(
		private context: EditorState
	) {}

	async loadFiles(files: FileList, fromHello: boolean = false) {
		let textFile: File | undefined;
		let resFile: File | undefined;
		let imageFile: File | undefined;

		for (let i=0; i<files.length; i++) {
			const file = files[i];
			const ext = getFileExt(file.name);

			if (ext === 'hot' && !resFile) {
				resFile = file;
			} else if ((ext === 'rect' || ext === 'txt') && !textFile) {
				textFile = file;
			} else if (!imageFile) {
				imageFile = file;
			} else {
				break;
			}
		}

		let rects!: RectFile | undefined;
		let filename!: string;

		if (imageFile) {
			const loaded = await this.loadImage(imageFile);
			rects = loaded.rects;
			filename = imageFile.name;
	
			// Init image
			if (loaded.image) {
				this.context.setImage(
					loaded.image,
					loaded.vtf
				);
			}
		}

		// Load from .hot (binary format)
		if (resFile) {
			const buffer = await resFile.arrayBuffer();
			const view = new DataBuffer(buffer);
			const resHeader = new VHeader(VHeaderTags.TAG_HOTSPOT, 0x0, 0);
			const res = VHotspotResource.decode(resHeader, view, null!);
			rects ??= RectFile.fromResource(res);
			filename ??= resFile.name;
		}

		// Load from .rect (text format)
		else if (textFile) {
			const text = await textFile.text();
			const res = HotspotTextFormat.decode(text);
			rects ??= RectFile.fromResource(res);
			filename ??= textFile.name;
		}

		if (rects)
			this.context.setRectFile(filename, rects);
		else if (fromHello)
			this.context.setRectFile(filename, new RectFile(1));
	}

	async loadExample(url: string) {
		const res = await fetch(url);
		if (!res.ok) return console.error(res.status, res.statusText);
		const file = new File([await res.blob()], getFileName(url));
		
		const loaded = await this.loadImage(file);
		this.context.image = loaded.image;
		this.context.vtf = loaded.vtf;
		this.context.filename = file.name;
		this.context.setRectFile(file.name, loaded.rects ?? new RectFile(1));
	}

	// #region Image loading

	protected async loadImage(file: File): Promise<{ image: VImageEither; rects?: RectFile; vtf?: Vtf }> {
		if (file.name.endsWith('.vtf'))
			return await this.loadImageVtf(file);
		else
			return await this.loadImageBrowser(file);
	}

	protected async loadImageBrowser(file: File) {
		const img = new Image();
		img.src = URL.createObjectURL(file);

		await img.decode();
		const canvas = new OffscreenCanvas(img.width, img.height);
		const ctx = canvas.getContext('2d')!;
	
		ctx.drawImage(img, 0, 0);
		const data = ctx.getImageData(0, 0, img.width, img.height);
		URL.revokeObjectURL(img.src);

		const image = new VImageData(
			new Uint8Array(data.data.buffer, data.data.byteOffset, data.data.byteLength),
			data.width,
			data.height
		);

		img.remove();
		return { image };
	}

	protected async loadImageVtf(file: File) {
		const vtf = await Vtf.decode(await file.arrayBuffer(), { onDemand: true, noClone: true });
		const image = vtf.body.getRawImage(0, 0, 0, 0);

		const hot = await vtf.getResource(VHeaderTags.TAG_HOTSPOT);
		
		const rects = hot
			? RectFile.fromResource(hot)
			: undefined;

		this.context.image = image;
		return { image, rects, vtf };
	}

	// #region Saving

	protected generateVtf(image: VImageData, options: SaveOptions['vtf']['create']) {
		let format: VFormats;
		let hasAlpha = false;
		const maxV = getPixelArrayMax(image.data);

		for (let i=3; i<image.data.length; i+=4) {
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

	protected async download(files: File[]) {
		const a = document.createElement('a');
	
		if (files.length > 1) {
			const zip = await downloadZip(files).blob();
			a.href = URL.createObjectURL(zip);
			a.download = setFileExt(this.context.filename, '.zip');
		} else {
			a.href = URL.createObjectURL(files[0]);
			a.download = files[0].name;
		}

		a.click();

		URL.revokeObjectURL(a.href);
		a.remove();
	}

	async save(options: SaveOptions) {
		if (!this.context) throw 'no context!';
		if (!this.context.image) throw 'no image!';
		if (!this.context.filename) throw 'no filename!';

		if (!this.context.vtf) {
			const image = this.context.image;
			if (image.isEncoded) throw 'wtf!';

			const vtf = this.generateVtf(image, options.vtf.create);
			this.context.vtf = vtf;
		}

		const vtf = this.context.vtf;
		const res = new VHotspotResource(
			0,
			1,
			0,
			this.context.rects.map(v => v.toHotspotRect())
		);

		const resIdx = this.context.vtf.meta.findIndex(v => v.tag === VHeaderTags.TAG_HOTSPOT);
		if (resIdx === -1) vtf.meta.push(res);
		else vtf.meta[resIdx] = res;

		const output: File[] = [];
		const filename = setFileExt(this.context.filename, '');

		if (options.vtf.on) {
			const vtfBuffer = await vtf.encode();
			output.push(new File([vtfBuffer], filename + '.vtf'));
		}

		if (options.hot.on) {
			const resBuffer = res.encode(null!);
			output.push(new File([resBuffer], filename + '.hot'));
		}

		if (options.rect.on) {
			const rectText = HotspotTextFormat.encode(res);
			output.push(new File([rectText], filename + '.rect'));
		}

		this.download(output);
	}
}
