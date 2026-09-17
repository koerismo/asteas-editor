import {
	ShaderMaterial,
	Matrix4,
	Vector2,
	PlaneGeometry,
	DoubleSide,
	Mesh,
	type Scene,
	type Camera,
	type BufferGeometry,
	type Material,
	type Group,
	type Vector2Like,
	type WebGLRenderer
} from 'three';
import GridVert from './grid.vert?raw';
import GridFrag from './grid.frag?raw';


const gridMaterial = new ShaderMaterial({
	uniforms: {
		uInvProjectionMatrix: { value: new Matrix4() },
		uPixelSize: { value: new Vector2(1.0, 1.0) },
		uGridPower: { value: 1.0 },
		uMousePos: { value: new Vector2() },
		opacity: { value: 0.3 },
	},
	vertexShader: GridVert,
	fragmentShader: GridFrag,
	side: DoubleSide,
	transparent: true,
});

export class GridObject extends Mesh<
	PlaneGeometry,
	ShaderMaterial
> {
	gridPower = 0.0;

	constructor() {
		super(
			new PlaneGeometry(2, 2),
			gridMaterial
		);

		this.renderOrder = 99;
		this.frustumCulled = false;
	}

	onBeforeRender(
		renderer: WebGLRenderer,
		scene: Scene,
		camera: Camera,
		geometry: BufferGeometry,
		material: Material,
		group: Group,
	): void {
		this.material.uniforms.uInvProjectionMatrix.value = camera.projectionMatrixInverse;
		renderer.getSize(
			this.material.uniforms.uPixelSize.value
		);
		this.material.uniforms.uPixelSize.value.x /= devicePixelRatio;
		this.material.uniforms.uPixelSize.value.y /= devicePixelRatio;

	}
	
	setGridPower(v: number) {
		this.gridPower = v;
		this.material.uniforms.uGridPower.value = v;
	}

	setMousePos(v: Vector2Like) {
		this.material.uniforms.uMousePos.value.copy(v);
	}

	getIncrement() {
		return 2 ** Math.round(this.gridPower - 1.2);
	}
}
