import type { Vector2Like } from 'three';
import Binder, { bound } from '../binder.js';
import { Disposable } from './disposable.js';

export abstract class MouseBound extends Disposable {
	constructor(element: HTMLElement) {
		super();
		this.disposables.push(Binder(element)
			.add('mousedown', this.onMouseDown.bind(this))
			.add('mouseup', this.onMouseUp.bind(this))
			.add('mousemove', this.onMouseMove.bind(this))
			.add('wheel', this.onMouseWheel.bind(this)));
	}

	abstract onMouseWheel(event: WheelEvent): void;
	abstract onMouseMove(event: MouseEvent): void;
	abstract onMouseDown(event: MouseEvent): void;
	abstract onMouseUp(event: MouseEvent): void;
}