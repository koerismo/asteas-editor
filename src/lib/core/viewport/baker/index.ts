import * as Three from 'three';
import BakeVert from './shader.vert?raw';
import BakeFrag from './shader.frag?raw';
import CopyVert from './screen.vert?raw';
import CopyFrag from './screen.frag?raw';
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
	intensity?: number;
}

const rectGeometry = new Three.PlaneGeometry(1, 1);
rectGeometry.translate(0.5, 0.5, 0);

const quadGeometry = new Three.PlaneGeometry(2, 2);

function makeBakeMaterial(mode: BakeMode) {
	return new Three.ShaderMaterial({
		vertexShader: BakeVert,
		fragmentShader: BakeFrag,
		side: Three.DoubleSide,
		// transparent: true,
		uniforms: {
			uBevel: { value: 0.0 },
			uRadius: { value: 0.0 },
			uExpo: { value: 1.0 },
			uIntensity: { value: 1.0 },
		},
		defines: {
			'BAKE_MODE': mode,
			'MODE_HEIGHT': BakeMode.Height,
			'MODE_NORMAL': BakeMode.Normal,
			'MODE_COMBINED': BakeMode.Combined,
		}
	});
}

function makeCopyMaterial(texture: Three.Texture) {
	return new Three.ShaderMaterial({
		vertexShader: CopyVert,
		fragmentShader: CopyFrag,
		// transparent: true,
		uniforms: {
			uMap: { value: texture },
		}
	});
}

const BG_HEIGHT = new Three.Color(0.0, 0.0, 0.0);
const BG_NORMAL = new Three.Color(0.5, 0.5, 1.0);

const bakeMaterialHeight = makeBakeMaterial(BakeMode.Height);
const bakeMaterialNormal = makeBakeMaterial(BakeMode.Normal);
const bakeMaterialCombined = makeBakeMaterial(BakeMode.Combined);

const kMaxRects = 128;

export class Baker {
	protected options: BakerOptions = { mode: BakeMode.None };
	
	public canvas: OffscreenCanvas | HTMLCanvasElement;
	protected renderer: Three.WebGLRenderer;
	protected mesh: Three.InstancedMesh<Three.BufferGeometry, Three.ShaderMaterial>;

	protected rtScene = new Three.Scene();
	protected copyScene = new Three.Scene();

	protected camera = new Three.OrthographicCamera();
	protected rtt = new Three.WebGLRenderTarget();

	constructor(canvas?: OffscreenCanvas | HTMLCanvasElement, mode?: BakeMode) {
		this.canvas = canvas ?? new OffscreenCanvas(0, 0);

		this.rtScene = new Three.Scene();

		this.mesh = new Three.InstancedMesh(rectGeometry, bakeMaterialCombined, kMaxRects);
		this.mesh.frustumCulled = false;

		this.rtScene.add(this.mesh);
		this.setMode(mode ?? BakeMode.None);

		this.camera = new Three.OrthographicCamera();
		this.camera.position.set(0, 0, 10);
		this.camera.near = 1.0;

		this.rtt = new Three.WebGLRenderTarget();
		const copyPlane = new Three.Mesh(quadGeometry, makeCopyMaterial(this.rtt.texture));
		this.copyScene.add(copyPlane);

		this.renderer = new Three.WebGLRenderer({
			canvas: this.canvas,
			alpha: true,
			depth: false,
		});

		this.renderer.autoClear = false;
	}

	render() {
		if (
			!this.canvas.width ||
			!this.canvas.height ||
			this.options.mode === BakeMode.None
		) return;

		this.renderer.setRenderTarget(this.rtt);
		this.renderer.clear();
		this.renderer.render(this.rtScene, this.camera);

		this.renderer.setRenderTarget(null);
		this.renderer.clear();
		this.renderer.render(this.copyScene, this.camera);
	}

	copyToTexture() {
		// TODO: Ideally we don't clone this data each time
		// is it possible to transfer it???
		const data = new Uint8Array(this.rtt.width * this.rtt.height * 4);
		this.renderer.readRenderTargetPixels(this.rtt, 0, 0, this.rtt.width, this.rtt.height, data);
		const tex = new Three.DataTexture(data, this.rtt.width, this.rtt.height);
		return tex;
	}

	#updateOptions() {
		this.mesh.material.uniforms.uRadius.value = this.options.radius ?? 0;
		this.mesh.material.uniforms.uBevel.value = this.options.bevel ?? 0;
		this.mesh.material.uniforms.uExpo.value = this.options.expo ?? 1;
		this.mesh.material.uniforms.uIntensity.value = this.options.intensity ?? this.getDefaultIntensity();
		this.mesh.material.uniformsNeedUpdate = true;
	}

	setMode(mode: BakeMode) {
		this.options.mode = mode;
		switch (mode) {
			case BakeMode.Normal:
				this.rtScene.background = BG_NORMAL;
				this.mesh.material = bakeMaterialNormal;
				break;
				case BakeMode.Height:
				this.rtScene.background = BG_HEIGHT;
				this.mesh.material = bakeMaterialHeight;
				break;
				case BakeMode.Combined:
				this.rtScene.background = null;
				this.mesh.material = bakeMaterialCombined;
				break;
		}
	}
	
	getDefaultIntensity() {
		const expo = this.options.expo ?? 1.0;
		return 1 / expo;
	}

	setOptions(options: Omit<BakerOptions, 'mode'>) {
		this.options.radius = options.radius;
		this.options.bevel = options.bevel;
		this.options.expo = options.expo;
		this.options.intensity = options.intensity;
		this.#updateOptions();
	}

	setSize(width: number, height: number, scale: number) {
		this.rtt.setSize(width, height);
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
