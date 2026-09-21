import * as Three from 'three';
import type { VImageEither } from 'vtf-js';
import { clamp } from 'three/src/math/MathUtils.js';

// General utility
import { RectEntry } from '$lib/core/file.js';
import { AABB, type Vec2Like } from '$lib/core/aabb.js';
import { type EditorState } from '$lib/core/context.svelte.js';

// Viewport-specific
import { RectMode, SelectionRect, VisualRect } from './selection_rect.js';
import { Button, MouseComponent } from '../mouse.js';

import { GridObject } from './grid.js';
import { VTextureLoader } from '../vtex_loader.js';
import { Viewport } from '../renderer.js';

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

export class EditorViewport extends Viewport<Three.OrthographicCamera> {
	mouse: MouseComponent;
	mouseWorldPos = new Three.Vector2();
	grid: GridObject = new GridObject();

	state: EditorState;
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

	constructor(
			canvas: HTMLCanvasElement,
			state: EditorState
		) {
		super(
			canvas,
			new Three.WebGLRenderer({ canvas, antialias: true, depth: false }),
			new Three.OrthographicCamera(),
			new Three.Scene(),
		);

		this.mouse = new MouseComponent(this, canvas);
		this.state = state;

		this.camera = new Three.OrthographicCamera();
		this.camera.position.z = 64;
		this.camera.near = 1;
		this.scene.background = new Three.Color(0x111111);

		this.init();

		this.selectionRect = new SelectionRect(new AABB());
		this.selectionRect.setMode(RectMode.Handles);
		this.scene.add(this.selectionRect);

		this.start();

		// Begin render loop.
		
		this.disposables.push(
			$effect.root(() => {
				$effect(() => {
					// console.log('Building rects...');
					this.rebuildRects(this.state.rects ?? []);
				});
				$effect(() => {
					// console.log('Setting selection...')
					this.setSelection(this.state.selection);
				});
				$effect(() => {
					this.setImage(this.state.image);
				});
			})
		);
	}

	init() {
		this.scene.add(this.imagePlane);
		this.scene.add(this.grid);
		
		this.imagePlane.position.z = -10;
		this.setImage();
	}

	updateCamera() {
		const ratio = this.canvas.clientWidth / this.canvas.clientHeight;
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

	centerCamera() {
		this.camera.position.x = this.image ? this.image.width / 2 : 0;
		this.camera.position.y = this.image ? this.image.height / 2 : 0;
		this.zoom = 1.5 / (this.image?.width ?? 512);
	}

	onPan(x: number, y: number) {
		this.camera.position.x -= x * this.pixelSize * devicePixelRatio;
		this.camera.position.y -= y * this.pixelSize * devicePixelRatio;
	}

	onZoom(deltaY: number): void {
		const oldZoom = this.zoom;
		this.zoom = clamp(
			Math.pow(Math.E, Math.log(this.zoom) - deltaY * 0.0018),
			1 / 8192,
			1 / 16,
		);

		const farMovement = 1 / oldZoom - 1 / this.zoom;
		const mX = this.mouse.pos_nrm.x * 2 - 1;
		const mY = this.mouse.pos_nrm.y * 2 - 1;

		this.camera.position.x += mX * farMovement * this.canvas.width / this.canvas.height;
		this.camera.position.y += mY * farMovement;
		this.needsCameraUpdate = true;
	}

	updateVisual(offsetX: number, offsetY: number, corner: number) {
		const gridSnap = 1;
		const gridSnapUser = this.grid.getIncrement();

		if (corner === -1) {
			const x = snap((offsetX - this.mouse.pos_down.x) * this.pixelSize * 2, gridSnapUser);
			const y = snap((offsetY - this.mouse.pos_down.y) * this.pixelSize * 2, gridSnapUser);
			this.selectionRect.visualSetTranslation(x, y);
			this.selectionRect.updateMesh();

			for (let i=0; i<this.selected.length; i++) {
				const rect = this.visualRects[this.selected[i]];
				rect.visualSetTranslation(x, y);
				rect.updateMesh();
			}
		}
		else {
			const x = snap(this.mouseWorldPos.x, gridSnapUser);
			const y = snap(this.mouseWorldPos.y, gridSnapUser);
			const v: Vec2Like = { x, y };
			this.selectionRect.visualSetCorner(corner, v);
			this.selectionRect.updateMesh();
			
			const ab1 = this.selectionRect.rect;
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
		this.state.$setRectBounds(rectBounds);
		this.state.$commitActions();
	}

	onMouseMove(event: MouseEvent): void {
		this.screenToWorld(this.mouse.pos_nrm, this.mouseWorldPos);
		this.grid.setMousePos(this.mouseWorldPos);

		const withinSelectionBox = this.hasSelection() && this.mouseSelectedWithin;
		const selectionBoxCorner = this.mouseSelectedCorner;

		// Begin a new action on mouse click-drag
		action: if (
			this.mouse.button === Button.Left &&
			this.mouse.dragged &&
			this.currentAction === UserAction.None
		) {
			this.state.$commitActions();

			// Resizing
			if (selectionBoxCorner !== -1) {
				this.currentAction = UserAction.Rescaling;
			}

			// Translating
			else if (withinSelectionBox) {
				if (event.shiftKey) {
					this.currentAction = UserAction.CopyTranslating;
					this.state.$selectionClear();
					const inds = this.state.$rectsClone(this.selected);
					this.state.$selectionAdd(inds);
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
				this.selectionRect.rect.set(
					this.mouseWorldPos.x,
					this.mouseWorldPos.y,
					this.mouseWorldPos.x,
					this.mouseWorldPos.y,
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
				this.selectionRect.visualExpandToPoint(this.mouseWorldPos);
				this.selectionRect.updateMesh();
				break;
		}

		let cursor = '';

		if (!this.currentAction && this.hasSelection()) {
			switch (this.selectionRect.getPointCorner(this.mouseWorldPos)) {
				case 0: { cursor = 'nw-resize'; break }
				case 1: { cursor = 'ne-resize'; break }
				case 2: { cursor = 'sw-resize'; break }
				case 3: { cursor = 'se-resize'; break }
			}
	
			if (!cursor) {
				if (this.selectionRect.rect.containsPoint(this.mouseWorldPos)) {
					cursor = 'move';
				}
			}
		}

		this.setCursor(cursor);
	}

	onMouseDown(event: MouseEvent): void {
		if (this.mouse.button !== Button.Left) return;

		if (this.hasSelection()) {
			this.mouseSelectedWithin = this.selectionRect.rect.containsPoint(this.mouseWorldPos);
			this.mouseSelectedCorner = this.selectionRect.getPointCorner(this.mouseWorldPos);
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
				if (this.selectionRect.visual_aabb.overlapsRect(rect.rect)) {
					selection.add(i);
				}
			}

			if (event.shiftKey) {
				this.state.$selectionAdd(selection)
			} else {
				this.state.$setSelection(selection);
			}

			this.selectionRect.setMode(RectMode.Handles);
		}

		if (!this.currentAction) {
			if (this.mouseSelectedCorner === -1) {
				let selectIdx = -1;
				for (let i=0; i<this.visualRects.length; i++) {
					const rect = this.visualRects[i];
					if (!rect.rect.containsPoint(this.mouseWorldPos)) continue;
					selectIdx = i;
					break;
				}
				
				if (selectIdx !== -1) {
					if (event.shiftKey) {
						this.state.$selectionToggle(selectIdx);
					} else {
						this.state.$setSelection([selectIdx]);
					}
				} else if (!event.shiftKey) {
					this.state.$selectionClear();
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
			} else {
				this.visualRects[i].setRect(rects[i]);
			}
		}

		this.rebuildSelectionRect();
	}

	rebuildSelectionRect() {
		this.selectionRect.visible = false;
		this.selectionRect.rect.set(Infinity, Infinity, -Infinity, -Infinity);
		
		if (this.hasSelection()) {
			for (let i=0; i<this.selected.length; i++) {
				const rect = this.visualRects[this.selected[i]];
				if (rect)
					this.selectionRect.rect.expandToRect(rect.rect);
			}

			if (this.selectionRect.rect.isValid()) {
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
			if (!rect.rect.containsPoint(point as Three.Vector2)) continue;
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

	async setImage(image?: VImageEither) {
		if (!image) return this.setTexture();
		const v = await new VTextureLoader().parseImage(image);
		this.setTexture(v);
		this.centerCamera();
	}

	setTexture(v?: Three.Texture) {
		if (!v) {
			this.image = undefined;
			this.imagePlane.material.map = null;
			this.imagePlane.visible = false;
			return;
		}
		else {
			this.imagePlane.visible = true;
		}

		this.image = v;
		this.imagePlane.material.map = v;
		this.imagePlane.material.needsUpdate = true;

		this.imagePlane.scale.x = v.width;
		this.imagePlane.scale.y = v.height;
	}
}
