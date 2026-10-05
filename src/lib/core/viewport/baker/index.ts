import * as Three from 'three';
import VertShader from './shader.vert?raw';
import FragShader from './shader.frag?raw';
import type { RectLike } from '$lib/core/aabb.js';

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
	expo?: number;
}

const rectGeometry = new Three.PlaneGeometry(1, 1);
rectGeometry.translate(0.5, 0.5, 0);

function makeBakeMaterial(mode: BakeMode) {
	return new Three.ShaderMaterial({
		vertexShader: VertShader,
		fragmentShader: FragShader,
		side: Three.DoubleSide,
		transparent: true,
		uniforms: {
			uBevel: { value: 0.0 },
			uRadius: { value: 0.0 },
			uExpo: { value: 1.0 },
		},
		defines: {
			'BAKE_MODE': mode,
			'MODE_HEIGHT': BakeMode.Height,
			'MODE_NORMAL': BakeMode.Normal,
			'MODE_COMBINED': BakeMode.Combined,
		}
	});
	
}

const bakeMaterialHeight = makeBakeMaterial(BakeMode.Height);
const bakeMaterialNormal = makeBakeMaterial(BakeMode.Normal);
const bakeMaterialCombined = makeBakeMaterial(BakeMode.Combined);

const kMaxRects = 128;

export class Baker {
	public canvas: OffscreenCanvas | HTMLCanvasElement;

	protected options: BakerOptions = { mode: BakeMode.None };
	protected renderer: Three.WebGLRenderer;
	protected scene: Three.Scene;
	protected camera: Three.OrthographicCamera;
	protected mesh: Three.InstancedMesh<Three.BufferGeometry, Three.ShaderMaterial>;

	constructor(canvas?: OffscreenCanvas | HTMLCanvasElement, mode?: BakeMode) {
		this.canvas = canvas ?? new OffscreenCanvas(0, 0);

		this.scene = new Three.Scene();
		this.scene.background = new Three.Color(0x000000);

		this.mesh = new Three.InstancedMesh(rectGeometry, bakeMaterialCombined, kMaxRects);
		this.mesh.frustumCulled = false;

		this.scene.add(this.mesh);
		this.setMode(mode ?? BakeMode.None);

		this.camera = new Three.OrthographicCamera();
		this.camera.position.set(0, 0, 10);
		this.camera.near = 1.0;
		
		this.renderer = new Three.WebGLRenderer({
			canvas: this.canvas,
			alpha: true,
			depth: false,
		});
	}

	render() {
		if (
			!this.canvas.width ||
			!this.canvas.height ||
			this.options.mode === BakeMode.None
		) return;

		this.renderer.render(this.scene, this.camera);
	}

	#updateOptions() {
		this.mesh.material.uniforms.uRadius.value = this.options.radius ?? 0;
		this.mesh.material.uniforms.uBevel.value = this.options.bevel ?? 0;
		this.mesh.material.uniforms.uExpo.value = this.options.expo ?? 1;
		this.mesh.material.uniformsNeedUpdate = true;
	}

	setMode(mode: BakeMode) {
		this.options.mode = mode;
		switch (mode) {
			case BakeMode.Normal:
				this.mesh.material = bakeMaterialNormal;
				break;
			case BakeMode.Height:
				this.mesh.material = bakeMaterialHeight;
				break;
			case BakeMode.Combined:
				this.mesh.material = bakeMaterialCombined;
				break;
		}
	}

	setOptions(options: Omit<BakerOptions, 'mode'>) {
		this.options.radius = options.radius;
		this.options.bevel = options.bevel;
		this.options.expo = options.expo;
		this.#updateOptions();
	}

	setSize(width: number, height: number, scale: number) {
		this.renderer.setSize(width, height, false);
		this.camera.top = 0;
		this.camera.left = 0;
		this.camera.right = width / scale;
		this.camera.bottom = height / scale;
		this.camera.updateProjectionMatrix();
	}

	setRects(rects: RectLike[]) {
		const mat4 = new Three.Matrix4().identity();
		const count = Math.min(rects.length, kMaxRects);

		const withBounds = (x: number, y: number, w: number, h: number) => {
			mat4.set(
				w, 0, 0, x,
				0, h, 0, y,
				0, 0, 1, 0,
				0, 0, 0, 1,
			);
		}

		this.mesh.count = count;
		for (let i = 0; i < count; i++) {
			const r = rects[i];
			withBounds(r.min_x, r.min_y, r.max_x - r.min_x, r.max_y - r.min_y);
			this.mesh.setMatrixAt(i, mat4);
		}

		this.mesh.instanceMatrix.needsUpdate = true;
	}
}
