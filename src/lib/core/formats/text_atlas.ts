import { parse, KeyV, KeyVRoot, KeyVSet, DumpQuotationType } from 'fast-vdf';
import { HotspotRect, HotSpotRectFlags } from 'vtf-js/resources';
import { UploadType, type LoadResult } from '../file_uploader.js';
import type { AtlasFile } from '../context.svelte.js';
import type { RectLike } from '../aabb.js';
import { getProduct } from '../version.js';

export async function load(file: Blob, filter: UploadType): Promise<LoadResult> {
	if (!(filter & UploadType.kAtlas)) return {};

	const text = await file.text();
	const rects = decode(text);

	return {
		atlas: { rects },
	}
}

export function save(src: AtlasFile): File {
	const text = encode(src.rects);
	return new File([text], src.name + '.rect');
}

export function decode(text: string): HotspotRect[] {
	const root = parse(text);
	const main = root.dir('rectangles');
	const rects: HotspotRect[] = [];

	for (const child of main.all()) {
		if (child instanceof KeyV) continue;
		if (child.key.toLowerCase() !== 'rectangle') continue;
		
		const mins = child.pair('min').vector(undefined, '', '');
		if (!mins || mins.length !== 2) throw Error('Invalid value for "min"!');
		const maxs = child.pair('max').vector(undefined, '', '');
		if (!maxs || maxs.length !== 2) throw Error('Invalid value for "max"!');

		let flags = 0x0;
		if (child.pair('rotate', null)?.bool())
			flags = HotSpotRectFlags.AllowRotation;
		if (child.pair('reflect', null)?.bool())
			flags |= HotSpotRectFlags.AllowReflection;
		if (child.pair('alt', null)?.bool())
			flags |= HotSpotRectFlags.AltGroup;
		
		const tile = child.value('tile', '');
		if (tile === 'xy' || tile === 'x')
			flags |= HotSpotRectFlags.TileX;
		if (tile === 'xy' || tile === 'y')
			flags |= HotSpotRectFlags.TileY;

		rects.push(new HotspotRect(
			flags, mins[0], mins[1], maxs[0], maxs[1]
		));
	}

	return rects;
}

export function encode(rects: RectLike[]): string {
	const root = new KeyVRoot();
	const dir = new KeyVSet('Rectangles');
	root.add(dir);

	for (let i=0; i<rects.length; i++) {
		const rect = rects[i];
		const min = rect.min_x + ' ' + rect.min_y;
		const max = rect.max_x + ' ' + rect.max_y;

		const can_tile_x = rect.flags & HotSpotRectFlags.TileX;
		const can_tile_y = rect.flags & HotSpotRectFlags.TileY;
		const tile = (can_tile_x ? 'x' : '') + (can_tile_y ? 'y' : '');

		const tr = new KeyVSet('rectangle');
		const add = (k: string, v: string) => tr.add(new KeyV(k, v));

		add('min', min);
		add('max', max);

		if (rect.flags & HotSpotRectFlags.AllowRotation)
			add('rotate', '1');
		if (rect.flags & HotSpotRectFlags.AllowReflection)
			add('reflect', '1');
		if (rect.flags & HotSpotRectFlags.AltGroup)
			add('alt', '1');
		if (tile)
			add('tile', tile);

		dir.add(tr);
	}

	return `// ${getProduct()}\n` + root.dump({
		quote: DumpQuotationType.Auto
	});
}
