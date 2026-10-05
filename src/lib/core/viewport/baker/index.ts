import * as Three from 'three';
import VertShader from './shader.vert?raw';
import FragShader from './shader.frag?raw';

import type { RectLike } from '$lib/core/aabb.js';

const rectGeometry = new Three.PlaneGeometry(1, 1);
rectGeometry.translate(0.5, 0.5, 0);

const bakeMaterial = new Three.ShaderMaterial({
	vertexShader: VertShader,
	fragmentShader: FragShader,
	transparent: true,
	blending: Three.NoBlending,
	uniforms: {
		uBevel: { value: 0.0 },
		uRadius: { value: 0.0 },
	},
	defines: { 'BAKE_MODE': 1 }
});

export const enum BakeMode {
	None,
	Height,
	Normal,
	Combined,
}

export interface BakerOptions {
	mode: BakeMode;
	radius?: number;
	bevel?: number;
}

export class Baker {
	public canvas: OffscreenCanvas | HTMLCanvasElement;

	protected options: BakerOptions = { mode: BakeMode.None };
	protected renderer: Three.WebGLRenderer;
	protected scene: Three.Scene;
	protected camera: Three.OrthographicCamera;
	protected mesh: Three.InstancedMesh<Three.BufferGeometry, Three.ShaderMaterial>;

	constructor(canvas?: OffscreenCanvas | HTMLCanvasElement) {
		this.canvas = canvas ?? new OffscreenCanvas(0, 0);
		this.scene = new Three.Scene();

		this.mesh = new Three.InstancedMesh(rectGeometry, bakeMaterial, 256);
		this.scene.add(this.mesh);

		this.camera = new Three.OrthographicCamera(0, 1, 0, 1);
		this.camera.position.set(0, 0, -1);
		this.renderer = new Three.WebGLRenderer({
			canvas: this.canvas,
			alpha: true,
			antialias: false,
			depth: false,
		});
	}

	render() {
		if (
			this.canvas.width &&
			this.canvas.height &&
			this.options.mode !== BakeMode.None
		)
			this.renderer.render(this.scene, this.camera);
	}

	#updateOptions() {
		this.mesh.material.uniforms.uRadius.value = this.options.radius ?? 0;
		this.mesh.material.uniforms.uBevel.value = this.options.bevel ?? 0;
	}

	setOptions(options: BakerOptions) {
		this.options.mode = options.mode;
		this.options.radius = options.radius;
		this.options.bevel = options.bevel;
		this.#updateOptions();
	}

	setSize(width: number, height: number, scale: number) {
		this.canvas.width = width;
		this.canvas.height = height;
		this.camera.right = width;
		this.camera.bottom = height;
	}

	setRects(rects: RectLike[]) {
		const mat4 = new Three.Matrix4();
		const vec3 = new Three.Vector3();

		for (let i = 0; i < rects.length; i++) {
			const r = rects[i];
			mat4.makeScale(r.max_x - r.min_x, r.max_y - r.min_y, 1);
			mat4.setPosition(vec3.set(r.min_x, r.min_y, 0));
			this.mesh.setMatrixAt(i, mat4);
		}
	}
}
