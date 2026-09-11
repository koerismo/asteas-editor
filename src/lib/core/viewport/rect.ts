import * as Three from 'three';

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
	None: 0,
	Active: 1,
	Dragging: 2,
} as const;

export class SelectionRect extends Three.Object3D {
	bounds!: Three.Box2;
	mode!: RectMode;

	protected pixelSize: number = 0.0;
	protected handleMeshes = new Three.InstancedMesh(handleGeometry, handleMaterial, 4);
	protected borderMeshes = new Three.InstancedMesh(rectGeometry, borderMaterial, 4);
	protected centerMesh = new Three.Mesh(rectGeometry, centerMaterial);

	constructor(bounds: Three.Box2) {
		super();
		this.frustumCulled = false;

		this.add(this.handleMeshes);
		this.add(this.borderMeshes);
		this.add(this.centerMesh);

		this.bounds = bounds;
		this.updateMesh();
		this.setMode(RectMode.None);
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

	setBoundsRaw(bounds: Three.Box2) {
		this.bounds = bounds;
		this.updateMesh();
	}

	setBounds(x1: number, y1: number, x2: number, y2: number) {
		this.bounds.min.set(x1, y1);
		this.bounds.max.set(x2, y2);
		this.updateMesh();
	}

	translate(delta: Three.Vector2Like) {
		this.bounds.translate(delta as Three.Vector2);
		this.updateMesh();
	}

	setCorner(corner: number, pos: Three.Vector2Like) {
		const vx = corner & 1 ? this.bounds.max : this.bounds.min;
		const vy = corner & 2 ? this.bounds.max : this.bounds.min;
		vx.x = pos.x;
		vy.y = pos.y;
		this.updateMesh();
	}

	// getRectDistance(pt: Three.Vector2Like, corner: number) {
	// 	const cx = corner & 1 ? this.bounds.max.x : this.bounds.min.x;
	// 	const cy = corner & 2 ? this.bounds.max.y : this.bounds.min.y;
	// 	const r = this.pixelSize * HANDLE_SIZE * 0.5;
	// 	return Math.max(Math.abs(pt.x - cx), Math.abs(pt.y - cy));
	// }

	getPointCorner(pt: Three.Vector2Like): number {
		const bottom = pt.y > (this.bounds.max.y + this.bounds.min.y) * 0.5;
		const right = pt.x > (this.bounds.max.x + this.bounds.min.x) * 0.5;
		
		const cx = right ? this.bounds.max.x : this.bounds.min.x;
		const cy = bottom ? this.bounds.max.y : this.bounds.min.y;
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
		const min = this.bounds.min;
		const max = this.bounds.max;

		const S = HANDLE_SIZE * this.pixelSize;

		mat4.makeTranslation(min.x, min.y, 0);
		mat4.scale(V_YNEG);
		mat4.elements[0] *= S;
		mat4.elements[5] *= S;
		this.handleMeshes.setMatrixAt(0, mat4);
		
		mat4.scale(V_XNEG);
		mat4.setPosition(max.x, min.y, 0);
		this.handleMeshes.setMatrixAt(1, mat4);
		
		mat4.scale(V_YNEG);
		mat4.scale(V_XNEG);
		mat4.setPosition(min.x, max.y, 0);
		this.handleMeshes.setMatrixAt(2, mat4);
		
		mat4.scale(V_XNEG);
		mat4.setPosition(max.x, max.y, 0);
		this.handleMeshes.setMatrixAt(3, mat4);

		this.handleMeshes.instanceMatrix.needsUpdate = true;
	}

	_setupEdges() {
		const mat4 = this._resizeMesh_mat4;
		const min = this.bounds.min;
		const max = this.bounds.max;

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

		withBounds(min.x - S1, min.y, max.x - min.x + S2, -S1);
		this.borderMeshes.setMatrixAt(0, mat4);
		
		withBounds(min.x - S1, max.y, max.x - min.x + S2, S1);
		this.borderMeshes.setMatrixAt(1, mat4);
		
		withBounds(min.x, min.y, -S1, max.y - min.y);
		this.borderMeshes.setMatrixAt(2, mat4);
		
		withBounds(max.x, min.y, S1, max.y - min.y);
		this.borderMeshes.setMatrixAt(3, mat4);

		this.borderMeshes.instanceMatrix.needsUpdate = true;
	}

	_setupCenter_vec2 = new Three.Vector2();

	_setupCenter() {
		this.centerMesh.position.x = this.bounds.min.x;
		this.centerMesh.position.y = this.bounds.min.y;
		this.bounds.getSize(this._setupCenter_vec2);
		this.centerMesh.scale.x = this._setupCenter_vec2.x;
		this.centerMesh.scale.y = this._setupCenter_vec2.y;
	}
}
