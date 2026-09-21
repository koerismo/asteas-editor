import Binder from '../binder.js';
import { Disposable } from './disposable.js';

export const Button = {
	None: 0x0,
	Left: 0x1,
	Right: 0x2,
	Middle: 0x4,
} as const;

// Zoom: (Scroll)
// Pan: (Scroll + Shift) OR (Mouse + MMB)
// Drag: (Mouse + LMB)

const kDragThresh2 = (1.0 * devicePixelRatio) ** 2;

interface MouseComponentHost {
	onWheel(event: WheelEvent): void;
	onMouseMove(event: MouseEvent): void;
	onMouseDown(event: MouseEvent): void;
	onMouseUp(event: MouseEvent): void;

	onZoom(delta: number): void;
	onDrag(deltaX: number, deltaY: number): void;
	onPan(deltaX: number, deltaY: number): void;
}

export class MouseComponent extends Disposable {
	public mouse_within = false;
	public dragged = false;
	public button: number = 0;
	public mouse_pos = { x: 0, y: 0 };
	public pos_nrm = { x: 0, y: 0 };
	public pos_down = { x: 0, y: 0 };

	constructor(
		public host: Partial<MouseComponentHost>,
		element: HTMLElement
	) {
		super();
		this.disposables.push(Binder(element)
			.add('mousedown', event => {
				this.button = event.buttons;
				this.dragged = false;
				this.pos_down.x = event.offsetX;
				this.pos_down.y = event.offsetY;
				this.host.onMouseDown?.(event);
			})
			.add('mouseup', event => {
				this.button = 0;
				this.host.onMouseUp?.(event);
			})
			.add('mousemove', event => {
				this.mouse_within = true;
				this.mouse_pos.x = event.offsetX;
				this.mouse_pos.y = event.offsetY;
				this.pos_nrm.x = event.offsetX / element.offsetWidth;
				this.pos_nrm.y = event.offsetY / element.offsetHeight;
				
				if (!this.dragged && this.getMouseDragDistance2() > kDragThresh2) {
					this.dragged = true;
				}

				this.host.onMouseMove?.(event);

				if (this.button === Button.Middle) {
					this.host.onPan?.(event.movementX, event.movementY);
				} else if (this.button === Button.Left) {
					this.host.onDrag?.(event.movementX, event.movementY);
				}

			})
			.add('contextmenu', event => {
				event.preventDefault();
			})
			.add('wheel', event => {
				if (this.button === Button.None && event.shiftKey) {
					this.host.onPan?.(-event.deltaX, -event.deltaY);
				} else {
					this.host.onZoom?.(event.deltaY);
				}

				this.host.onWheel?.(event);
			})
		);
	}

	getMouseDragDistance2() {
		const x = (this.mouse_pos.x - this.pos_down.x);
		const y = (this.mouse_pos.y - this.pos_down.y);
		return x * x + y * y;
	}
}
