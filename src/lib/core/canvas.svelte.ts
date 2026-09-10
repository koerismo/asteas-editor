import type { VImageData } from 'vtf-js';
import * as Three from 'three';

// General utility
import type { RectEntry, RectFile } from './file.svelte.js';
import { bound } from './binder.js';

// Viewport-specific
import { clamp } from 'three/src/math/MathUtils.js';
import { RectMode, SelectionRect } from './viewport/rect.js';
import { MouseBound } from './viewport/mouse.js';

const commonQuad = new Three.PlaneGeometry();
commonQuad.translate(0.5, 0.5, 0);

export class CanvasRenderer extends MouseBound {
	alive: boolean = false;

	renderer: Three.WebGLRenderer;
	camera: Three.OrthographicCamera;
	scene = new Three.Scene();

    file: RectFile | undefined = $state.raw();
	rectBoxes: SelectionRect[] = [];

	needsCameraUpdate: boolean = true;
	pixelSize: number = 1.0;
	zoom: number = 1.0;

	constructor(public canvas: HTMLCanvasElement) {
		super(canvas);

		this.renderer = new Three.WebGLRenderer({ canvas, antialias: true });
		this.camera = new Three.OrthographicCamera();
		this.camera.position.z = 1;

		this.alive = true;
		this.scene.background = new Three.Color(0x111111);

		this.init();
		this.resize();
		this.render();

		this.disposables.push(bound(window, 'resize', this.resize.bind(this)));
		this.disposables.push(
			$effect.root(() => {
				$effect(() => {
					console.log('updating...');
					this.updateRects(this.file?.rects ?? []);
					// console.log('Rect count is', this.file?.rects.length);
				});
			})
		);
	}

	init() {
		// const quadMaterial = new Three.MeshBasicMaterial({ wireframe: true, color: '#fff' });
		// const quadSingle = new Three.Mesh(commonQuad, quadMaterial);
		// this.scene.add(quadSingle);
	}

	resize() {
		const parentEl = this.canvas.parentElement as HTMLDivElement;
		this.renderer.setSize(
			parentEl.clientWidth * devicePixelRatio,
			parentEl.clientHeight * devicePixelRatio,
			false
		);
	}

	updateCamera() {
		const ratio = this.canvas.width / this.canvas.height;
		const area = 1 / this.zoom;

		this.camera.top = area;
		this.camera.bottom = -area;
		this.camera.left = -ratio * area;
		this.camera.right = ratio * area;

		for (let i = 0; i < this.rectBoxes.length; i++) {
			this.rectBoxes[i].setPixelSize(this.pixelSize);
		}

		this.pixelSize = area / this.canvas.height * devicePixelRatio;
		this.camera.updateProjectionMatrix();
	}

	onMouseWheel(event: WheelEvent): void {
		const oldZoom = this.zoom;
		this.zoom = clamp(
			Math.pow(Math.E, Math.log(this.zoom) - event.deltaY * 0.001),
			1 / 2048,
			1 / 32,
		);

		// TODO: This is wrong and does not work
		const farMovement = 1 / oldZoom - 1 / this.zoom;

		const mX = event.offsetX / this.canvas.offsetWidth * 2 - 1;
		const mY = event.offsetY / this.canvas.offsetHeight * 2 - 1;

		this.camera.position.x += mX * farMovement;
		this.camera.position.y -= mY * farMovement;
		this.needsCameraUpdate = true;
	}

	_mouseHeld = false;

	onMouseMove(event: MouseEvent): void {
		if (!this._mouseHeld) return;
		this.camera.position.x -= event.movementX * this.pixelSize * devicePixelRatio;
		this.camera.position.y += event.movementY * this.pixelSize * devicePixelRatio;
	}

	onMouseDown(event: MouseEvent): void {
		this._mouseHeld = event.buttons === 1;
	}

	onMouseUp(event: MouseEvent): void {
		this._mouseHeld = false;
	}

	updateRects(rects: RectEntry[]) {
		const oldLength = this.rectBoxes.length;

		if (oldLength > rects.length) {
			for (let i = rects.length; i < oldLength; i++) {
				this.rectBoxes[i].removeFromParent();
			}
		}

		this.rectBoxes.length = rects.length;

		for (let i = 0; i < rects.length; i++) {
			if (i >= oldLength) {
				this.rectBoxes[i] = new SelectionRect(
					new Three.Box2(new Three.Vector2(), new Three.Vector2())
				);
				this.scene.add(this.rectBoxes[i]);
			}

			const rect = rects[i];
			this.rectBoxes[0].setMode(2);
			this.rectBoxes[i].setBounds(rect.min_x, rect.min_y, rect.max_x, rect.max_y);
		}
	}

	setFile(file: RectFile) {
		console.log('Setting file...', file != null);
		this.file = file;
	}

	setImage(image: VImageData) {

	}

	dispose() {
		console.log('Cleaning up...')
		this.alive = false;
		super.dispose();
	}

    render() {
		if (!this.alive) return;
		
		if (this.needsCameraUpdate) {
			this.needsCameraUpdate = false;
			this.updateCamera();
		}

		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(() => this.render());
    }
}
