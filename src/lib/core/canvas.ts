import { HotspotRect } from 'vtf-js/resources';

export const enum RectMode {
    Standard,
    Tiled,
    Trim,
}

export const enum Cardinal {
    None,
    X,
    Y,
}

type RectEntry = {
    index: number;
    rect: HotspotRect;
    trim: Cardinal;
}

export class CanvasRenderer {
	ctx: CanvasRenderingContext2D;
    rects: RectEntry[] = [];

	constructor(public canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d')!;
	}

    render() {

    }
}
