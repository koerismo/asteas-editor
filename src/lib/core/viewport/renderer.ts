import type { Camera, Scene, WebGLRenderer } from 'three';
import { Disposable } from './disposable.js';
// import { MouseComponent } from './mouse.js';

export abstract class Viewport<T extends Camera> extends Disposable {
	needsCameraUpdate = true;

	constructor(
		public canvas: HTMLCanvasElement,
		public renderer: WebGLRenderer,
		public camera: T,
		public scene: Scene,
	) {
		super();
	}

	#resizeEndTimeout: number | undefined;

	#onResize() {
		clearTimeout(this.#resizeEndTimeout);
		this.needsCameraUpdate = true;
		this.#resizeEndTimeout = setTimeout(() => this.#onResizeEnd(), 100);
	}

	#onResizeEnd() {
		this.#resizeEndTimeout = undefined;
		const parentEl = this.canvas.parentElement as HTMLDivElement;
		this.renderer.setSize(
			parentEl.clientWidth * devicePixelRatio,
			parentEl.clientHeight * devicePixelRatio,
			false
		);
		this.needsCameraUpdate = true;
	}

	abstract updateCamera(): void;

	#started = false;

	start() {
		if (this.#started)
			throw 'Viewport start() run multiple times!';
		
		this.#started = true;
		this.#onResizeEnd();

		const observer = new ResizeObserver(this.#onResize.bind(this));
		observer.observe(this.renderer.domElement);

		// Begin render loop.
		this.render();
		this.disposables.push(() => observer.disconnect());
	}

	render() {
		if (this.disposed) return;
		
		if (this.needsCameraUpdate) {
			this.needsCameraUpdate = false;
			this.updateCamera();
		}

		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(() => this.render());
    }
}
