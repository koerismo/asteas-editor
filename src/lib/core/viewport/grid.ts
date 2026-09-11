import * as Three from 'three';
import GridVert from './grid.vert?raw';
import GridFrag from './grid.frag?raw';


const gridMaterial = new Three.ShaderMaterial({
	uniforms: {
		uInvProjectionMatrix: { value: new Three.Matrix4() },
		uPixelSize: { value: new Three.Vector2(1.0, 1.0) },
		uGridPower: { value: 1.0 },
		uGridColor: { value: new Three.Color(0xaaaaaa) },
		uMousePos: { value: new Three.Vector2() },
	},
	vertexShader: GridVert,
	fragmentShader: GridFrag,
	side: Three.DoubleSide,
	transparent: true
});

export class GridObject extends Three.Mesh<
	Three.PlaneGeometry,
	Three.ShaderMaterial
> {
	constructor() {
		super(
			new Three.PlaneGeometry(2, 2),
			gridMaterial
		);

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
		// this.material.uniforms.vInvViewMatrix.value.copy(camera.modelViewMatrix).invert();
		this.material.uniforms.uInvProjectionMatrix.value = camera.projectionMatrixInverse;
		this.material.uniforms.uGridPower.value = Math.log2(camera.top) - 4;
		renderer.getSize(this.material.uniforms.uPixelSize.value);
	}

	setMousePos(v: Three.Vector2Like) {
		this.material.uniforms.uMousePos.value.copy(v);
	}
}
