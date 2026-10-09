import * as Three from 'three';
import GridVert from './grid.vert?raw';
import GridFrag from './grid.frag?raw';
import { makeShaderMaterial, type ParamsToUniforms } from '../shader_material.js';

type GridShaderParams = ParamsToUniforms<{
	uInvProjectionMatrix: Three.Matrix4,
	uPixelSize: Three.Vector2,
	uGridPower: number,
	uMousePos: Three.Vector2,
	opacity: number,
}>;

const gridMaterial = makeShaderMaterial<GridShaderParams>({
	uniforms: {
		uInvProjectionMatrix: { value: new Three.Matrix4() },
		uPixelSize: { value: new Three.Vector2(1.0, 1.0) },
		uGridPower: { value: 1.0 },
		uMousePos: { value: new Three.Vector2() },
		opacity: { value: 0.3 },
	},
	vertexShader: GridVert,
	fragmentShader: GridFrag,
	side: Three.DoubleSide,
	transparent: true,
});

export class GridObject extends Three.Mesh<
	Three.PlaneGeometry,
	typeof gridMaterial
> {
	gridPower = 0.0;

	constructor() {
		super(
			new Three.PlaneGeometry(2, 2),
			gridMaterial
		);

		this.renderOrder = 99;
		this.frustumCulled = false;
	}

	onBeforeRender(
		renderer: Three.WebGLRenderer,
		scene: Three.Scene,
		camera: Three.Camera,
		geometry: Three.BufferGeometry,
		material: Three.Material,
		group: Three.Group,
	): void {
		this.material.uniforms.uInvProjectionMatrix.value = camera.projectionMatrixInverse;
		const pixelSize = this.material.uniforms.uPixelSize.value;
		renderer.getSize(pixelSize);
		pixelSize.x /= devicePixelRatio;
		pixelSize.y /= devicePixelRatio;

	}
	
	setGridPower(v: number) {
		this.gridPower = v;
		this.material.uniforms.uGridPower.value = v;
	}

	setMousePos(v: Three.Vector2Like) {
		this.material.uniforms.uMousePos.value.copy(v);
	}

	getIncrement() {
		return 2 ** Math.round(this.gridPower - 1.2);
	}
}
