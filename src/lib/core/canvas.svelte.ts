import type { VImageData } from 'vtf-js';
import * as Three from 'three';

// General utility
import type { RectEntry, RectFile } from './file.svelte.js';
import { bound } from './binder.js';

// Viewport-specific
import { clamp } from 'three/src/math/MathUtils.js';
import { RectMode, SelectionRect } from './viewport/rect.js';
import { Button, MouseBound } from './viewport/mouse.js';
import { getEditorCtx, type EditorState } from './context.svelte.js';

import { GridObject } from './viewport/grid.js';

const commonQuad = new Three.PlaneGeometry();
commonQuad.translate(0.5, 0.5, 0);

export class CanvasRenderer extends MouseBound {
	_mousePosWorld = new Three.Vector2();

	grid: GridObject = new GridObject();

	state: EditorState;
	alive: boolean = false;

	renderer: Three.WebGLRenderer;
	camera: Three.OrthographicCamera;
	scene = new Three.Scene();

	rectBoxes: SelectionRect[] = [];

	needsCameraUpdate: boolean = true;
	pixelSize: number = 1.0;
	zoom: number = 1.0;

	heldRectId: number = -1;
	heldRectCorner: number = -1;

	constructor(public canvas: HTMLCanvasElement) {
		super(canvas);

		this.state = getEditorCtx();

		this.renderer = new Three.WebGLRenderer({ canvas, antialias: true });
		this.camera = new Three.OrthographicCamera();
		this.camera.position.z = 1;

		this.alive = true;
		this.scene.background = new Three.Color(0x111111);
		this.scene.add(this.grid);

		this.init();
		this.resize();
		this.render();

		const observer = new ResizeObserver(this.resize.bind(this));
		observer.observe(this.canvas);
		
		this.disposables.push(() => observer.disconnect());
		this.disposables.push(
			$effect.root(() => {
				$effect(() => {
					console.log('Building rects...');
					this.rebuildRects(this.state.file?.rects ?? []);
				});
				$effect(() => {
					this.setActiveRect(this.state.active);
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
		this.updateCamera();
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

	onPan(x: number, y: number) {
		this.camera.position.x -= x * this.pixelSize * devicePixelRatio;
		this.camera.position.y += y * this.pixelSize * devicePixelRatio;
	}

	onZoom(deltaY: number): void {
		const oldZoom = this.zoom;
		this.zoom = clamp(
			Math.pow(Math.E, Math.log(this.zoom) - deltaY * 0.001),
			1 / 4096,
			1 / 32,
		);

		const farMovement = 1 / oldZoom - 1 / this.zoom;
		const mX = this._mousePosNorm.x * 2 - 1;
		const mY = this._mousePosNorm.y * 2 - 1;

		this.camera.position.x += mX * farMovement * this.canvas.width / this.canvas.height;
		this.camera.position.y -= mY * farMovement;
		this.needsCameraUpdate = true;
	}

	onMouseMove(event: MouseEvent): void {
		this.screenToWorld(this._mousePosNorm, this._mousePosWorld);
		this.grid.setMousePos(this._mousePosWorld);

		if (this._mouseButton === Button.Left && this.heldRectId !== -1) {
			if (this.heldRectCorner === -1) {
				this.rectBoxes[this.heldRectId]
					.visualSetTranslation(
						Math.round((event.offsetX - this._mouseDownPos.x) * this.pixelSize * 2),
						Math.round((event.offsetY - this._mouseDownPos.y) * this.pixelSize * -2),
					);
			} else {
				this.rectBoxes[this.heldRectId]
					.visualSetCorner(this.heldRectCorner, {
						x: Math.round(this._mousePosWorld.x),
						y: Math.round(this._mousePosWorld.y),
					});
			}
			return;
		}

		let cursor = '';
		switch (this.getCornerAtPoint(this._mousePosWorld)) {
			case 0: { cursor = 'sw-resize'; break }
			case 1: { cursor = 'se-resize'; break }
			case 2: { cursor = 'nw-resize'; break }
			case 3: { cursor = 'ne-resize'; break }
		}

		this.setCursor(cursor);
	}

	onMouseDown(event: MouseEvent): void {
		if (this._mouseButton !== Button.Left) return;

		if (this.heldRectId !== -1) {
			this.heldRectCorner = this.getCornerAtPoint(this._mousePosWorld);
			console.log('New corner selection', this.heldRectCorner);
		}

		if (this.heldRectCorner === -1) {
			this.heldRectId = this.getRectAtPoint(this._mousePosWorld);
			this.state.active = this.heldRectId;
			console.log('New rect selection:', this.heldRectId);
		}

		this.updateRectModes();
	}

	onMouseUp(event: MouseEvent): void {
		if (this.heldRectId !== -1 && this._mouseDragged) {
			const box = this.rectBoxes[this.heldRectId];
			this.state.file.setRectBounds(this.heldRectId, box.aabb);
			this.rectBoxes[this.heldRectId].visualSync();
		}
		this.heldRectCorner = -1;
	}

	setCursor(cursor?: string) {
		this.canvas.style.cursor = cursor ?? 'initial';
	}

	rebuildRects(rects: RectEntry[]) {
		const oldLength = this.rectBoxes.length;

		if (oldLength > rects.length) {
			if (this.heldRectId >= rects.length) {
				this.heldRectId = -1;
				this.heldRectCorner = -1;
			}

			for (let i = rects.length; i < oldLength; i++) {
				this.rectBoxes[i].removeFromParent();
			}
		}

		this.rectBoxes.length = rects.length;

		for (let i = 0; i < rects.length; i++) {
			if (i >= oldLength) {
				this.rectBoxes[i] = new SelectionRect(rects[i], this.pixelSize);
				this.scene.add(this.rectBoxes[i]);
			}

			this.rectBoxes[i].setRect(rects[i]);
		}
	}

	worldToScreen(i: Three.Vector2Like, out: { x: number; y: number; }) {
		const m = this.camera.projectionMatrix.elements;
		const v = this.camera.matrixWorldInverse.elements;
		out.x = m[0] * i.x + m[4] * i.y + m[12] + v[12];
		out.y = m[1] * i.x + m[5] * i.y + m[13] + v[13];
		out.x = out.x * 0.5 + 0.5;
		out.y = out.y * -0.5 - 0.5;
	}

	screenToWorld(i: Three.Vector2Like, out: { x: number; y: number; }) {
		const m = this.camera.projectionMatrixInverse.elements;
		const v = this.camera.matrixWorld.elements;
		const x = i.x * 2 - 1;
		const y = i.y * -2 + 1;
		out.x = m[0] * x + m[4] * y + m[12] + v[12];
		out.y = m[1] * x + m[5] * y + m[13] + v[13];
	}

	getRectAtPoint(point: Three.Vector2Like) {
		for (let i=0; i<this.rectBoxes.length; i++) {
			const rect = this.rectBoxes[i];
			if (!rect.aabb.containsPoint(point as Three.Vector2)) continue;
			return i;
		}
		return -1;
	}

	getCornerAtPoint(point: Three.Vector2Like) {
		if (this.heldRectId === -1) return -1;
		return this.rectBoxes[this.heldRectId].getPointCorner(point);
	}

	setActiveRect(index: number) {
		this.heldRectId = index;
		this.updateRectModes();
	}

	updateRectModes() {
		for (let i = 0; i < this.rectBoxes.length; i++) {
			const r = this.rectBoxes[i];
			if (this.heldRectId === i) {
				r.setMode(RectMode.Active);
			} else {
				r.setMode(RectMode.None);
			}
		}
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
