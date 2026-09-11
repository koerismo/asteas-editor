import * as Three from 'three';
import { AABB, RectEntry } from '../file.svelte.js';

const handleUrl = './viewport/handle.png';
const handleGeometry = new Three.PlaneGeometry(1, 1);
const handleMaterial = new Three.MeshBasicMaterial({
	map: await (new Three.TextureLoader().loadAsync(handleUrl)),
	side: Three.DoubleSide,
	// transparent: true,
	alphaTest: 0.5,
});

const rectGeometry = new Three.PlaneGeometry(1, 1);
rectGeometry.translate(0.5, 0.5, 0);

const borderMaterial = new Three.MeshBasicMaterial({
	color: 0x615FFF,
	side: Three.DoubleSide,
});

const centerMaterial = new Three.MeshBasicMaterial({
	color: 0x615FFF,
	opacity: 0.1,
	transparent: true,
});

const centerActiveMaterial = new Three.MeshBasicMaterial({
	color: 0x615FFF,
	opacity: 0.3,
	transparent: true,
});

const HANDLE_SIZE = 32;
const V_XNEG = new Three.Vector3(-1, 1, 1);
const V_YNEG = new Three.Vector3(1, -1, 1);

export type RectMode = typeof RectMode[keyof typeof RectMode];
export const RectMode = {
	Invalid: -1,
	None: 0,
	Active: 1,
	Dragging: 2,
} as const;

export class SelectionRect extends Three.Object3D {
	mode: RectMode = RectMode.Invalid;
	rect: RectEntry;
	aabb: AABB = new AABB();

	protected pixelSize: number;
	protected handleMeshes = new Three.InstancedMesh(handleGeometry, handleMaterial, 4);
	protected borderMeshes = new Three.InstancedMesh(rectGeometry, borderMaterial, 4);
	protected centerMesh = new Three.Mesh(rectGeometry, centerMaterial);

	constructor(rect: RectEntry, pixelSize: number) {
		super();
		// this.frustumCulled = false;
		this.handleMeshes.frustumCulled = false;
		this.borderMeshes.frustumCulled = false;
		this.pixelSize = pixelSize;

		this.rect = rect;
		this.aabb.copy(rect);

		this.add(this.handleMeshes);
		this.add(this.borderMeshes);
		this.add(this.centerMesh);
		this.setMode(RectMode.None);
	}

	setRect(rect: RectEntry) {
		this.rect = rect;
		this.aabb.set(rect.min_x, rect.min_y, rect.max_x, rect.max_y);
		this.updateMesh();
	}

	setMode(mode: RectMode) {
		if (this.mode === mode) return;
		this.handleMeshes.visible = (mode !== RectMode.None);
		this.borderMeshes.visible = (mode !== RectMode.Dragging);
		this.centerMesh.material = mode === RectMode.None ? centerMaterial : centerActiveMaterial;
		this.updateMesh();
	}
	
	updateMesh() {
		if (!this.visible) return;
		if (this.handleMeshes.visible) this._setupHandles();
		if (this.borderMeshes.visible) this._setupEdges();
		this._setupCenter();
	}
	
	visualSetTranslation(x: number, y: number) {
		this.aabb.copy(this.rect);
		this.aabb.translate(x, y);
		this.updateMesh();
	}

	visualSetCorner(corner: number, pos: Three.Vector2Like) {
		corner & 1
			? this.aabb.max_x = pos.x
			: this.aabb.min_x = pos.x;
		corner & 2
			? this.aabb.max_y = pos.y
			: this.aabb.min_y = pos.y;
		this.updateMesh();
	}

	visualSync() {
		this.aabb.copy(this.rect);
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

	_setupHandles() {
		const mat4 = this._resizeMesh_mat4;
		const { min_x, min_y, max_x, max_y } = this.aabb;

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

	_setupEdges() {
		const mat4 = this._resizeMesh_mat4;
		const ab = this.aabb;
		const w = this.aabb.width;
		const h = this.aabb.height;

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
		this.centerMesh.position.x = this.aabb.min_x;
		this.centerMesh.position.y = this.aabb.min_y;
		this.centerMesh.scale.x = this.aabb.width;
		this.centerMesh.scale.y = this.aabb.height;
	}
}
