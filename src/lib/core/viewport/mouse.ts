import type { Vector2Like } from 'three';
import Binder, { bound } from '../binder.js';
import { Disposable } from './disposable.js';

export abstract class MouseBound extends Disposable {
	_mouseWithin = false;
	_mouseButton: number = 0;
	_mousePos = { x: 0, y: 0 };
	_mousePosNorm = { x: 0, y: 0 };

	constructor(element: HTMLElement) {
		super();
		this.disposables.push(Binder(element)
			.add('mousedown', event => {
				this._mouseButton = event.buttons;
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
			})
			.add('wheel', this.onMouseWheel.bind(this)));
	}

	onMouseWheel(event: WheelEvent): void {};
	onMouseMove(event: MouseEvent): void {};
	onMouseDown(event: MouseEvent): void {};
	onMouseUp(event: MouseEvent): void {};
}
