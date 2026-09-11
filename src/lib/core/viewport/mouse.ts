import type { Vector2Like } from 'three';
import Binder, { bound } from '../binder.js';
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

export abstract class MouseBound extends Disposable {
	_mouseWithin = false;
	_mouseDragged = false;
	_mouseButton: number = 0;
	_mousePos = { x: 0, y: 0 };
	_mousePosNorm = { x: 0, y: 0 };
	_mouseDownPos = { x: 0, y: 0 };

	constructor(element: HTMLElement) {
		super();
		this.disposables.push(Binder(element)
			.add('mousedown', event => {
				this._mouseButton = event.buttons;
				this._mouseDragged = false;
				this._mouseDownPos.x = event.offsetX;
				this._mouseDownPos.y = event.offsetY;
				this.onMouseDown(event);
			})
			.add('mouseup', event => {
				this._mouseButton = 0;
				this.onMouseUp(event);
			})
			.add('mousemove', event => {
				this._mouseWithin = true;
				this._mousePos.x = event.offsetX;
				this._mousePos.y = event.offsetY;
				this._mousePosNorm.x = event.offsetX / element.offsetWidth;
				this._mousePosNorm.y = event.offsetY / element.offsetHeight;
				this.onMouseMove(event);

				if (this._mouseButton === Button.Middle) {
					this.onPan(event.movementX, event.movementY);
				} else if (this._mouseButton === Button.Left) {
					this._mouseDragged = true;
					this.onDrag(event.movementX, event.movementY);
				}

			})
			.add('contextmenu', event => {
				event.preventDefault();
			})
			.add('wheel', event => {
				if (this._mouseButton === Button.None && event.shiftKey) {
					this.onPan(-event.deltaX, -event.deltaY);
				} else {
					this.onZoom(event.deltaY);
				}

				this.onWheel(event);
			})
		);
	}

	onWheel(event: WheelEvent): void {}
	onMouseMove(event: MouseEvent): void {}
	onMouseDown(event: MouseEvent): void {}
	onMouseUp(event: MouseEvent): void {}

	onZoom(delta: number): void {}
	onDrag(deltaX: number, deltaY: number): void {}
	onPan(deltaX: number, deltaY: number): void {}
}
