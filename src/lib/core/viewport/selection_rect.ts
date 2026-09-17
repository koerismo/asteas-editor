import * as Three from 'three';
import { AABB } from '$lib/core/aabb.js';
import { RectEntry } from '$lib/core/file.svelte.js';

const handleUrl = './viewport/handle.png';
const handleGeometry = new Three.PlaneGeometry(1, 1);
const handleMaterial = new Three.MeshBasicMaterial({
	map: await (new Three.TextureLoader().loadAsync(handleUrl)),
	side: Three.DoubleSide,
	alphaTest: 0.5,
});

const rectGeometry = new Three.PlaneGeometry(1, 1);
rectGeometry.translate(0.5, 0.5, 0);

const borderMaterial = makeMaterial(0x615FFF, 1.0);
const centerMaterial = makeMaterial(0x615FFF, 0.1);
const centerActiveMaterial = makeMaterial(0x615FFF, 0.3);
const selectionBoxMaterial = makeMaterial(0xFFFFFF, 0.2);

function makeMaterial(color: number, opacity: number) {
	return new Three.MeshBasicMaterial({ color, opacity, transparent: opacity < 1.0, side: Three.DoubleSide });
}

const HANDLE_SIZE = 32;
const V_XNEG = new Three.Vector3(-1, 1, 1);
const V_YNEG = new Three.Vector3(1, -1, 1);

export type RectMode = typeof RectMode[keyof typeof RectMode];
export const RectMode = {
	Invalid: -1,
	Default: 0,
	Selected: 1,
	Dragging: 2,
	Handles: 3,
} as const;

export class VisualRect extends Three.Object3D {
	mode: RectMode = RectMode.Invalid;

	aabb: AABB;
	visual_aabb: AABB;

	protected pixelSize: number;
	protected borderMeshes = new Three.InstancedMesh(rectGeometry, borderMaterial, 4);
	protected centerMesh = new Three.Mesh(rectGeometry, centerMaterial);

	constructor(aabb: AABB, pixelSize: number, initMode: boolean = true) {
		super();
		this.borderMeshes.frustumCulled = false;
		this.pixelSize = pixelSize;

		this.aabb = aabb;
		this.visual_aabb = new AABB().copy(aabb);

		this.borderMeshes.renderOrder = 10;
		this.centerMesh.renderOrder = 10;

		this.add(this.borderMeshes);
		this.add(this.centerMesh);

		if (initMode)
			this.setMode(RectMode.Default);
	}

	setBounds(bounds: AABB) {
		this.aabb.copy(bounds);
		this.visualSync();
		this.updateMesh();
	}

	setMode(mode: RectMode) {
		if (this.mode === mode) return;
		this.borderMeshes.visible = (mode !== RectMode.Dragging);
		this.centerMesh.material = mode === RectMode.Default ? centerMaterial : centerActiveMaterial;
		this.updateMesh();
	}
	
	updateMesh(): boolean {
		if (!this.visible) return false;
		if (this.borderMeshes.visible) this._setupEdges();
		this._setupCenter();
		return true;
	}
	
	visualSetTranslation(x: number, y: number) {
		this.visual_aabb.copy(this.aabb);
		this.visual_aabb.translate(x, y);
	}

	visualSetCorner(corner: number, pos: Three.Vector2Like) {
		corner & 1
			? this.visual_aabb.max_x = pos.x
			: this.visual_aabb.min_x = pos.x;
		corner & 2
			? this.visual_aabb.max_y = pos.y
			: this.visual_aabb.min_y = pos.y;
	}

	visualSetBounds(bounds: AABB) {
		this.visual_aabb.copy(bounds);
	}

	visualSetScaleTranslation(sx: number, sy: number, tx: number, ty: number) {
		this.visual_aabb.copy(this.aabb);
		this.visual_aabb.scale(sx, sy);
		this.visual_aabb.translate(tx, ty);
	}

	visualExpandToPoint(point: Three.Vector2Like) {
		this.visual_aabb.copy(this.aabb);
		this.visual_aabb.expandToPoint(point.x, point.y);
	}

	visualSync() {
		this.visual_aabb.copy(this.aabb);
		this.updateMesh();
	}

	getPointCorner(pt: Three.Vector2Like): number {
		const bottom = pt.y > this.aabb.center_y;
		const right = pt.x > this.aabb.center_x;
		
		const cx = right ? this.aabb.max_x : this.aabb.min_x;
		const cy = bottom ? this.aabb.max_y : this.aabb.min_y;
		const r = this.pixelSize * HANDLE_SIZE * 0.5;

		if (Math.abs(pt.x - cx) > r || Math.abs(pt.y - cy) > r) return -1;
		return (bottom ? 2 : 0) + (+right);
	}

	setPixelSize(pixelSize: number) {
		if (pixelSize === this.pixelSize) return;
		this.pixelSize = pixelSize;
		this.updateMesh();
	}

	_resizeMesh_mat4 = new Three.Matrix4();

	_setupEdges() {
		const mat4 = this._resizeMesh_mat4;
		const ab = this.visual_aabb;
		const w = this.visual_aabb.width;
		const h = this.visual_aabb.height;

		const withBounds = (x: number, y: number, w: number, h: number) => {
			mat4.set(
				w, 0, 0, x,
				0, h, 0, y,
				0, 0, 1, 0,
				0, 0, 0, 1,
			);
		}

		const S1 = this.pixelSize;
		const S2 = S1 * 2;

		withBounds(ab.min_x - S1, ab.min_y, w + S2, -S1);
		this.borderMeshes.setMatrixAt(0, mat4);
		
		withBounds(ab.min_x - S1, ab.max_y, w + S2, S1);
		this.borderMeshes.setMatrixAt(1, mat4);
		
		withBounds(ab.min_x, ab.min_y, -S1, h);
		this.borderMeshes.setMatrixAt(2, mat4);
		
		withBounds(ab.max_x, ab.min_y, S1, h);
		this.borderMeshes.setMatrixAt(3, mat4);

		this.borderMeshes.instanceMatrix.needsUpdate = true;
	}

	_setupCenter() {
		this.centerMesh.position.x = this.visual_aabb.min_x;
		this.centerMesh.position.y = this.visual_aabb.min_y;
		this.centerMesh.scale.x = this.visual_aabb.width;
		this.centerMesh.scale.y = this.visual_aabb.height;
	}
}

export class SelectionRect extends VisualRect {
	protected handleMeshes = new Three.InstancedMesh(handleGeometry, handleMaterial, 4);

	constructor(aabb: AABB, pixelSize: number) {
		super(aabb, pixelSize, false);
		this.centerMesh.material = selectionBoxMaterial;
		this.handleMeshes.frustumCulled = false;
		this.handleMeshes.renderOrder = 10;
		this.add(this.handleMeshes);
		this.setMode(RectMode.Default);
	}

	setMode(mode: RectMode) {
		if (this.mode === mode) return;
		this.borderMeshes.visible = false;
		this.centerMesh.visible = mode === RectMode.Dragging;
		this.handleMeshes.visible = (mode !== RectMode.Default && mode !== RectMode.Dragging);
		this.updateMesh();
	}

	updateMesh(): boolean {
		if (!super.updateMesh()) return false;
		this._setupHandles();
		return true;
	}

	_setupHandles() {
		const mat4 = this._resizeMesh_mat4;
		const { min_x, min_y, max_x, max_y } = this.visual_aabb;

		const S = HANDLE_SIZE * this.pixelSize;

		mat4.makeTranslation(min_x, min_y, 0);
		mat4.scale(V_YNEG);
		mat4.elements[0] *= S;
		mat4.elements[5] *= S;
		this.handleMeshes.setMatrixAt(0, mat4);

		mat4.scale(V_XNEG);
		mat4.setPosition(max_x, min_y, 0);
		this.handleMeshes.setMatrixAt(1, mat4);

		mat4.scale(V_YNEG);
		mat4.scale(V_XNEG);
		mat4.setPosition(min_x, max_y, 0);
		this.handleMeshes.setMatrixAt(2, mat4);

		mat4.scale(V_XNEG);
		mat4.setPosition(max_x, max_y, 0);
		this.handleMeshes.setMatrixAt(3, mat4);

		this.handleMeshes.instanceMatrix.needsUpdate = true;
	}
	
}
