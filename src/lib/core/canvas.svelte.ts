import * as Three from 'three';

// General utility
import { RectEntry } from './file.svelte.js';
// import { hs } from './viewport/preview.js';

// Viewport-specific
import { clamp } from 'three/src/math/MathUtils.js';
import { RectMode, SelectionRect, VisualRect } from './viewport/selection_rect.js';
import { Button, MouseBound } from './viewport/mouse.js';
import { getEditorCtx, type EditorState } from './context.svelte.js';

import { GridObject } from './viewport/grid.js';
import { VTFLoader } from './viewport/vtexture.js';
import { AABB, type Vec2Like } from './aabb.js';

const kCommonQuad = new Three.PlaneGeometry();
kCommonQuad.translate(0.5, 0.5, 0);

function snap(v: number, inc: number) {
	return Math.round(v / inc) * inc;
}

const enum UserAction {
	None,
	Rescaling,
	Translating,
	CopyTranslating,
	Selecting,
}

export class CanvasRenderer extends MouseBound {
	_mousePosWorld = new Three.Vector2();

	grid: GridObject = new GridObject();

	state: EditorState;
	alive: boolean = false;

	renderer: Three.WebGLRenderer;
	camera: Three.OrthographicCamera;
	scene = new Three.Scene();

	selected: number[] = [];
	visualRects: VisualRect[] = [];
	selectionRect: SelectionRect;

	currentAction = UserAction.None;

	getHasCurrentAction() {
		return this.currentAction !== UserAction.None;
	}

	getActionMutatesRects() {
		return (
			this.currentAction === UserAction.Rescaling ||
			this.currentAction === UserAction.Translating ||
			this.currentAction === UserAction.CopyTranslating
		);
	}

	needsCameraUpdate: boolean = true;
	pixelSize: number = 1.0;
	zoom: number = 1 / 512;

	/** TODO: This desyncs for a short period of time when rects are added/deleted */
	hasSelection() { return this.selected.length !== 0; }
	mouseSelectedCorner: number = -1;
	mouseSelectedWithin: boolean = false;

	image: Three.Texture | undefined;
	imagePlane = new Three.Mesh(
		kCommonQuad,
		new Three.MeshBasicMaterial({
			side: Three.BackSide
		})
	);

	constructor(public canvas: HTMLCanvasElement) {
		super(canvas);

		this.state = getEditorCtx();

		this.renderer = new Three.WebGLRenderer({ canvas, antialias: true, depth: false });
		this.camera = new Three.OrthographicCamera();
		this.camera.position.z = 64;
		this.camera.near = 1;

		this.alive = true;
		this.scene.background = new Three.Color(0x111111);

		this.init();
		this.resize();

		// Relies on pixelSize, so we want to get the sizing first.
		this.selectionRect = new SelectionRect(new AABB(), this.pixelSize);
		this.selectionRect.setMode(RectMode.Handles);
		this.scene.add(this.selectionRect);
		
		const observer = new ResizeObserver(this.resize.bind(this));
		observer.observe(this.canvas);

		// Begin render loop.
		this.render();
		
		this.disposables.push(() => observer.disconnect());
		this.disposables.push(
			$effect.root(() => {
				$effect(() => {
					console.log('Building rects...');
					this.rebuildRects(this.state.rects ?? []);
				});
				$effect(() => {
					console.log('Setting selection...')
					this.setSelection(this.state.selection);
				});
			})
		);
	}

	init() {
		this.scene.add(this.imagePlane);
		this.scene.add(this.grid);

		// this.scene.add(new Three.AmbientLight(0xffffff, 1.0));
		// this.scene.add(hs.mesh);

		// hs.mesh.scale.set(32, 32, 32);
		// hs.mesh.material.side = Three.BackSide;

		this.imagePlane.position.z = -10;
		this.setImage();
	}

	resize() {
		const parentEl = this.canvas.parentElement as HTMLDivElement;
		this.renderer.setSize(
			parentEl.clientWidth * devicePixelRatio,
			parentEl.clientHeight * devicePixelRatio,
			false
		);
		this.needsCameraUpdate = true;
	}

	updateCamera() {
		const ratio = this.canvas.width / this.canvas.height;
		const area = 1 / this.zoom;

		this.camera.top = -area;
		this.camera.bottom = area;
		this.camera.left = -ratio * area;
		this.camera.right = ratio * area;
		this.grid.setGridPower(Math.max(Math.log2(area) - 4, 1));
		
		this.selectionRect.setPixelSize(this.pixelSize);
		for (let i = 0; i < this.visualRects.length; i++) {
			this.visualRects[i].setPixelSize(this.pixelSize);
		}

		this.pixelSize = area / this.canvas.height * devicePixelRatio;
		this.camera.updateProjectionMatrix();
	}

	onPan(x: number, y: number) {
		this.camera.position.x -= x * this.pixelSize * devicePixelRatio;
		this.camera.position.y -= y * this.pixelSize * devicePixelRatio;
	}

	onZoom(deltaY: number): void {
		const oldZoom = this.zoom;
		this.zoom = clamp(
			Math.pow(Math.E, Math.log(this.zoom) - deltaY * 0.001),
			1 / 8192,
			1 / 16,
		);

		const farMovement = 1 / oldZoom - 1 / this.zoom;
		const mX = this._mousePosNorm.x * 2 - 1;
		const mY = this._mousePosNorm.y * 2 - 1;

		this.camera.position.x += mX * farMovement * this.canvas.width / this.canvas.height;
		this.camera.position.y += mY * farMovement;
		this.needsCameraUpdate = true;
	}

	updateVisual(offsetX: number, offsetY: number, corner: number) {
		const gridSnap = 1;
		const gridSnapUser = this.grid.getIncrement();

		if (corner === -1) {
			const x = snap((offsetX - this._mouseDownPos.x) * this.pixelSize * 2, gridSnapUser);
			const y = snap((offsetY - this._mouseDownPos.y) * this.pixelSize * 2, gridSnapUser);
			this.selectionRect.visualSetTranslation(x, y);
			this.selectionRect.updateMesh();

			for (let i=0; i<this.selected.length; i++) {
				const rect = this.visualRects[this.selected[i]];
				rect.visualSetTranslation(x, y);
				rect.updateMesh();
			}
		}
		else {
			const x = snap(this._mousePosWorld.x, gridSnapUser);
			const y = snap(this._mousePosWorld.y, gridSnapUser);
			const v: Vec2Like = { x, y };
			this.selectionRect.visualSetCorner(corner, v);
			this.selectionRect.updateMesh();
			
			const ab1 = this.selectionRect.aabb;
			const ab2 = this.selectionRect.visual_aabb;

			const scale_x = ab2.width / ab1.width;
			const scale_y = ab2.height / ab1.height;
			const trans_x = ab2.min_x - ab1.min_x * scale_x;
			const trans_y = ab2.min_y - ab1.min_y * scale_y;

			for (let i=0; i<this.selected.length; i++) {
				const rect = this.visualRects[this.selected[i]];
				rect.visualSetScaleTranslation(scale_x, scale_y, trans_x, trans_y);
				rect.visual_aabb.snap(gridSnap);
				rect.updateMesh();
			}
		}
	}

	applyVisual() {
		const rectBounds: Record<number, AABB> = {};
		for (let i=0; i<this.selected.length; i++) {
			const rectIdx = this.selected[i];
			const rect = this.visualRects[rectIdx];
			rectBounds[rectIdx] = rect.visual_aabb;
		}
		this.state.setRectBounds(rectBounds);
		this.state.commitActions();
	}

	onMouseMove(event: MouseEvent): void {
		this.screenToWorld(this._mousePosNorm, this._mousePosWorld);
		this.grid.setMousePos(this._mousePosWorld);

		const withinSelectionBox = this.hasSelection() && this.mouseSelectedWithin;
		const selectionBoxCorner = this.mouseSelectedCorner;

		// Begin a new action on mouse click-drag
		action: if (
			this._mouseButton === Button.Left &&
			this._mouseDragged &&
			this.currentAction === UserAction.None
		) {
			this.state.commitActions();

			// Resizing
			if (selectionBoxCorner !== -1) {
				this.currentAction = UserAction.Rescaling;
			}

			// Translating
			else if (withinSelectionBox) {
				if (event.shiftKey) {
					this.currentAction = UserAction.CopyTranslating;
					this.state.selectionClear();
					const inds = this.state.rectsClone(this.selected);
					this.state.selectionAdd(inds);
					break action;
				} else {
					this.currentAction = UserAction.Translating;
					this.updateVisual(event.offsetX, event.offsetY, this.mouseSelectedCorner);
					break action;
				}
			}

			// Selecting
			else {
				this.currentAction = UserAction.Selecting;
				this.selectionRect.aabb.set(
					this._mousePosWorld.x,
					this._mousePosWorld.y,
					this._mousePosWorld.x,
					this._mousePosWorld.y,
				);

				this.selectionRect.visible = true;
				this.selectionRect.setMode(RectMode.Dragging);
				this.setCursor('select');
				break action;
			}
		}

		switch (this.currentAction) {
			case UserAction.Rescaling:
			case UserAction.Translating:
			case UserAction.CopyTranslating:
				this.updateVisual(event.offsetX, event.offsetY, this.mouseSelectedCorner);
				break;
			
			case UserAction.Selecting:
				this.selectionRect.visualExpandToPoint(this._mousePosWorld);
				this.selectionRect.updateMesh();
				break;
		}

		let cursor = '';

		if (!this.currentAction && this.hasSelection()) {
			switch (this.selectionRect.getPointCorner(this._mousePosWorld)) {
				case 0: { cursor = 'nw-resize'; break }
				case 1: { cursor = 'ne-resize'; break }
				case 2: { cursor = 'sw-resize'; break }
				case 3: { cursor = 'se-resize'; break }
			}
	
			if (!cursor) {
				if (this.selectionRect.aabb.containsPoint(this._mousePosWorld)) {
					cursor = 'move';
				}
			}
		}

		this.setCursor(cursor);
	}

	onMouseDown(event: MouseEvent): void {
		if (this._mouseButton !== Button.Left) return;

		if (this.hasSelection()) {
			this.mouseSelectedWithin = this.selectionRect.aabb.containsPoint(this._mousePosWorld);
			this.mouseSelectedCorner = this.selectionRect.getPointCorner(this._mousePosWorld);
		}

		this.updateRectModes();
	}

	onMouseUp(event: MouseEvent): void {
		if (this.getActionMutatesRects()) {
			this.applyVisual();
		}

		if (this.currentAction === UserAction.Selecting) {
			const selection = new Set<number>();
			for (let i=0; i<this.visualRects.length; i++) {
				const rect = this.visualRects[i];
				if (this.selectionRect.visual_aabb.overlapsRect(rect.aabb)) {
					selection.add(i);
				}
			}

			if (event.shiftKey) {
				this.state.selectionAdd(selection)
			} else {
				this.state.setSelection(selection);
			}

			this.selectionRect.setMode(RectMode.Handles);
		}

		if (!this.currentAction) {
			if (this.mouseSelectedCorner === -1) {
				for (let i=0; i<this.visualRects.length; i++) {
					const rect = this.visualRects[i];
					if (!rect.aabb.containsPoint(this._mousePosWorld)) continue;
					if (event.shiftKey) {
						this.state.selectionToggle(i);
					} else {
						this.state.setSelection([i]);
					}
					break;
				}
			}
		}

		this.currentAction = UserAction.None;
		this.mouseSelectedCorner = -1;
	}

	setCursor(cursor?: string) {
		this.canvas.style.cursor = cursor ?? 'initial';
	}

	setSelection(selection: ReadonlySet<number>) {
		this.selected.length = selection.size;
		
		let i = 0;
		for (const v of selection) {
			this.selected[i++] = v;
		}

		this.updateRectModes();
		this.rebuildSelectionRect();
	}

	rebuildRects(rects: Readonly<RectEntry[]>) {
		const oldLength = this.visualRects.length;

		if (oldLength > rects.length) {
			for (let i = rects.length; i < oldLength; i++) {
				this.visualRects[i].removeFromParent();
			}
		}

		this.visualRects.length = rects.length;

		for (let i = 0; i < rects.length; i++) {
			if (i >= oldLength) {
				this.visualRects[i] = new VisualRect(rects[i], this.pixelSize);
				this.scene.add(this.visualRects[i]);
			}
			this.visualRects[i].setBounds(rects[i]);
		}

		this.rebuildSelectionRect();
	}

	rebuildSelectionRect() {
		this.selectionRect.visible = false;
		this.selectionRect.aabb.set(Infinity, Infinity, -Infinity, -Infinity);
		
		if (this.hasSelection()) {
			for (let i=0; i<this.selected.length; i++) {
				const rect = this.visualRects[this.selected[i]];
				if (rect)
					this.selectionRect.aabb.expandToRect(rect.aabb);
			}

			if (this.selectionRect.aabb.isValid()) {
				this.selectionRect.visible = true;
				this.selectionRect.visualSync();
			}
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
		for (let i=0; i<this.visualRects.length; i++) {
			const rect = this.visualRects[i];
			if (!rect.aabb.containsPoint(point as Three.Vector2)) continue;
			return i;
		}
		return -1;
	}

	updateRectModes() {
		for (let i = 0; i < this.visualRects.length; i++) {
			const r = this.visualRects[i];
			if (this.selected.includes(i)) {
				r.setMode(RectMode.Selected);
			} else {
				r.setMode(RectMode.Default);
			}
		}
	}

	async setImage(url: string = 'test.vtf') {
		const v = await new VTFLoader().load(url);
		this.setTexture(v);
	}

	setTexture(v: Three.Texture) {
		this.image = v;
		this.imagePlane.material.map = v;
		this.imagePlane.material.needsUpdate = true;

		this.imagePlane.scale.x = v.width;
		this.imagePlane.scale.y = v.height;
	}

	dispose() {
		console.log('Cleaning up...')
		this.alive = false;
		super.dispose();
	}

    render() {
		if (!this.alive) return;

		// hs.mesh.rotation.y += Math.PI * 0.002;
		// hs.mesh.rotation.x += Math.PI * 0.003;
		
		if (this.needsCameraUpdate) {
			this.needsCameraUpdate = false;
			this.updateCamera();
		}

		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(() => this.render());
    }
}
