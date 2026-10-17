import type { Camera, Scene, WebGLRenderer } from 'three';
import { Disposable } from '../disposable.js';

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
		this.#resizeEndTimeout = setTimeout(() => {
			this.#onResizeEnd();
		}, 100);
	}

	#onResizeEnd() {
		this.#resizeEndTimeout = undefined;
		const parentEl = this.canvas.parentElement as HTMLDivElement;
		this.renderer.setSize(
			parentEl.clientWidth * devicePixelRatio,
			parentEl.clientHeight * devicePixelRatio,
			false,
		);
		this.needsCameraUpdate = true;
	}

	abstract updateCamera(): void;

	#started = false;

	setup() {
		if (this.#started) throw Error('Viewport setup() run multiple times!');

		this.#started = true;
		this.#onResizeEnd();

		const observer = new ResizeObserver(this.#onResize.bind(this));
		observer.observe(this.renderer.domElement);

		// Add listeners for deconstruction
		this.disposables.push(() => {
			observer.disconnect();
			this.renderer.dispose();
		});

		// Begin render loop
		this.render();
	}

	render() {
		if (this.disposed) return;

		if (this.needsCameraUpdate) {
			this.needsCameraUpdate = false;
			this.updateCamera();
		}

		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(() => {
			this.render();
		});
	}
}
