import { parse, KeyV, KeyVRoot, KeyVSet, DumpQuotationType } from 'fast-vdf';
import { HotspotRect, HotSpotRectFlags, VHotspotResource } from 'vtf-js/resources';

export class HotspotTextFormat {
	static decode(text: string): VHotspotResource {
		const root = parse(text);
		const main = root.dir('rectangles');
		const rects: HotspotRect[] = [];

		for (const child of main.all()) {
			if (child instanceof KeyV) continue;
			if (child.key.toLowerCase() !== 'rectangle') continue;
			
			const mins = child.pair('min').vector(undefined, '', '')!;
			if (mins.length !== 2) throw 'Invalid value for "min"!';
			const maxs = child.pair('max').vector(undefined, '', '')!;
			if (maxs.length !== 2) throw 'Invalid value for "max"!';
			
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

		return new VHotspotResource(0x0, 1, 0x0, []);
	}

	static encode(res: VHotspotResource): string {
		const root = new KeyVRoot();
		const rects = new KeyVSet('Rectangles');
		root.add(rects);

		for (let i=0; i<res.rects.length; i++) {
			const rect = res.rects[i];
			const min = (+rect.min_x) + ' ' + (+rect.min_y);
			const max = (+rect.max_x) + ' ' + (+rect.max_y);
			const tile = (rect.canTileX() ? 'x' : '') + (rect.canTileY() ? 'y' : '');

			const tr = new KeyVSet('rectangle');
			const add = (k: string, v: string) => tr.add(new KeyV(k, v));

			add('min', min);
			add('max', max);

			if (rect.canRotate())
				add('rotate', '1');
			if (rect.canReflect())
				add('reflect', '1');
			if (rect.isAltGroup())
				add('alt', '1');
			if (tile)
				add('tile', tile);

			rects.add(tr);
		}

		return root.dump({
			quote: DumpQuotationType.Auto
		});
	}
}
