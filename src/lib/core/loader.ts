import type { EditorState } from './context.svelte.js';
import { VImageData, Vtf } from 'vtf-js';
import { RectFile } from './file.js';
import { VHeaderTags } from 'vtf-js/resources';

export class EditorInitializer {
	constructor(
		public context: EditorState
	) {}

	async loadUrl(url: string) {
		const res = await fetch(url);
		if (!res.ok) return console.error(res.status, res.statusText);
		const file = new File([await res.blob()], url);
		return await this.loadFile(file);
	}

	async loadFile(file: File) {
		if (file.name.endsWith('.vtf'))
			await this.loadVtf(file);
		else
			await this.loadBrowser(file);
	}

	async loadBrowser(file: File) {
		const img = new Image();
		img.src = URL.createObjectURL(file);

		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;
		
		await img.decode();

		canvas.width = img.width;
		canvas.height = img.height;
		ctx.drawImage(img, 0, 0);

		const data = ctx.getImageData(0, 0, img.width, img.height);
		URL.revokeObjectURL(img.src);

		const image = new VImageData(
			new Uint8Array(data.data.buffer, data.data.byteOffset, data.data.byteLength),
			data.width,
			data.height
		);

		canvas.remove();
		img.remove();
		
		this.context.image = image;
		this.context.setFile(new RectFile(1));
	}

	async loadVtf(file: File) {
		const vtf = await Vtf.decode(await file.arrayBuffer(), { onDemand: true, noClone: true });
		const image = vtf.body.getRawImage(0, 0, 0, 0);

		let rectFile: RectFile;
		const hot = await vtf.getResource(VHeaderTags.TAG_HOTSPOT);
		
		if (hot) {
			rectFile = RectFile.fromResource(hot);
		} else {
			rectFile = new RectFile(1, []);
		}
		
		this.context.image = image;
		this.context.setFile(rectFile);
	}
}
