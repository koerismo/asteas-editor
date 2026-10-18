import * as Three from 'three';
import BakeVert from './shader.vert?raw';
import BakeFrag from './shader.frag?raw';
import CopyVert from './screen.vert?raw';
import CopyFrag from './screen.frag?raw';
import type { RectLike } from '$lib/core/aabb.js';
import { VImageData } from 'vtf-js';

import {
	makeShaderMaterial,
	type ParamsToUniforms,
	type TypedShaderMaterial,
} from '../shader_material.js';

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
	directx?: boolean;
}

type RectUniforms = ParamsToUniforms<{
	uBevel: number;
	uRadius: number;
	uExpo: number;
	uIntensity: number;
	uInvertY: boolean;
}>;

type CopyUniforms = ParamsToUniforms<{ uMap: Three.Texture }>;

const rectGeometry = new Three.PlaneGeometry(1, 1);
rectGeometry.translate(0.5, 0.5, 0);

const quadGeometry = new Three.PlaneGeometry(2, 2);

const makeBakeMaterial = (mode: BakeMode) =>
	makeShaderMaterial<RectUniforms>({
		vertexShader: BakeVert,
		fragmentShader: BakeFrag,
		side: Three.DoubleSide,
		uniforms: {
			uBevel: { value: 0.0 },
			uRadius: { value: 0.0 },
			uExpo: { value: 1.0 },
			uIntensity: { value: 1.0 },
			uInvertY: { value: false },
		},
		defines: {
			BAKE_MODE: mode,
			MODE_HEIGHT: BakeMode.Height,
			MODE_NORMAL: BakeMode.Normal,
			MODE_COMBINED: BakeMode.Combined,
			FLIP_V: true,
		},
	});

const makeCopyMaterial = (texture: Three.Texture) =>
	makeShaderMaterial<CopyUniforms>({
		vertexShader: CopyVert,
		fragmentShader: CopyFrag,
		defines: { FLIP_V: true },
		uniforms: {
			uMap: { value: texture },
		},
	});

const BG_HEIGHT = new Three.Color(0.0, 0.0, 0.0);
const BG_NORMAL = new Three.Color(0.5, 0.5, 1.0);

const bakeMaterialHeight = makeBakeMaterial(BakeMode.Height);
const bakeMaterialNormal = makeBakeMaterial(BakeMode.Normal);
const bakeMaterialCombined = makeBakeMaterial(BakeMode.Combined);

// TODO: Determine this dynamically.
const kMaxRects = 256;

let emit_max_rects_warning = true;

export class Baker {
	protected options: BakerOptions = { mode: BakeMode.None };
	protected stale: boolean = true;

	public canvas?: OffscreenCanvas | HTMLCanvasElement;
	protected renderer: Three.WebGLRenderer;
	protected rectMesh: Three.InstancedMesh<
		Three.BufferGeometry,
		TypedShaderMaterial<RectUniforms>
	>;

	protected rtScene = new Three.Scene();
	protected copyScene = new Three.Scene();
	protected copyMesh: Three.Mesh<Three.BufferGeometry, TypedShaderMaterial<CopyUniforms>>;

	protected camera = new Three.OrthographicCamera();
	protected rtt = new Three.WebGLRenderTarget();

	constructor(canvas?: OffscreenCanvas | HTMLCanvasElement, mode?: BakeMode) {
		this.canvas = canvas;

		this.rtScene = new Three.Scene();

		this.rectMesh = new Three.InstancedMesh(rectGeometry, bakeMaterialCombined, kMaxRects);
		this.rectMesh.frustumCulled = false;

		this.rtScene.add(this.rectMesh);
		this.setMode(mode ?? BakeMode.None);

		this.camera = new Three.OrthographicCamera();
		this.camera.position.set(0, 0, 10);
		this.camera.near = 1.0;

		this.rtt = new Three.WebGLRenderTarget();
		this.copyMesh = new Three.Mesh(quadGeometry, makeCopyMaterial(this.rtt.texture));
		this.copyScene.add(this.copyMesh);

		this.renderer = new Three.WebGLRenderer({
			canvas: this.canvas,
			alpha: true,
			depth: false,
			preserveDrawingBuffer: true,
		});

		this.renderer.autoClear = false;
	}

	render() {
		if (!this.rtt.width || !this.rtt.height || this.options.mode === BakeMode.None) return;

		this.renderer.setRenderTarget(this.rtt);
		this.renderer.setViewport(0, 0, this.rtt.width, this.rtt.height);
		this.renderer.clear();
		this.renderer.render(this.rtScene, this.camera);

		if (this.canvas && this.canvas.width && this.canvas.height) {
			this.renderer.setRenderTarget(null);
			this.renderer.setViewport(0, 0, this.canvas.width, this.canvas.height);
			this.renderer.render(this.copyScene, this.camera);
		}

		this.stale = false;
	}

	getStale() {
		return this.stale;
	}

	getData() {
		const data = new Uint8Array(this.rtt.width * this.rtt.height * 4);
		this.renderer.readRenderTargetPixels(this.rtt, 0, 0, this.rtt.width, this.rtt.height, data);
		return new VImageData(data, this.rtt.width, this.rtt.height);
	}

	async toBlob(type: 'image/png' = 'image/png'): Promise<Blob> {
		const canvas = this.canvas;
		if (!canvas) throw Error('Baker requires an attached canvas to generate a Blob!');

		if (canvas instanceof OffscreenCanvas)
			return await canvas.convertToBlob({ type, quality: 100 });

		return new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) => {
					if (blob) resolve(blob);
					else reject(Error('Failed to convert canvas to Blob!'));
				},
				type,
				100,
			);
		});
	}

	#updateOptions() {
		// Update rect mesh
		const uniforms = this.rectMesh.material.uniforms;
		uniforms.uRadius.value = this.options.radius ?? 0;
		uniforms.uBevel.value = this.options.bevel ?? 0;
		uniforms.uExpo.value = this.options.expo ?? 1;
		uniforms.uIntensity.value = this.options.intensity ?? this.#getDefaultIntensity();
		uniforms.uInvertY.value = this.options.directx ?? false;

		// Update copy-to-canvas mesh
		this.copyMesh.material.uniformsNeedUpdate = true;
	}

	setMode(mode: BakeMode) {
		this.options.mode = mode;
		this.stale = true;

		switch (mode) {
			case BakeMode.Normal:
				this.rtScene.background = BG_NORMAL;
				this.rectMesh.material = bakeMaterialNormal;
				break;
			case BakeMode.Height:
				this.rtScene.background = BG_HEIGHT;
				this.rectMesh.material = bakeMaterialHeight;
				break;
			case BakeMode.Combined:
				this.rtScene.background = null;
				this.rectMesh.material = bakeMaterialCombined;
				break;
		}
	}

	#getDefaultIntensity() {
		const expo = this.options.expo ?? 1.0;
		return 1 / expo;
	}

	setOptions(options: Omit<BakerOptions, 'mode'> & { mode?: BakeMode }) {
		this.options = Object.assign({ mode: this.options.mode }, options);
		this.stale = true;
		this.#updateOptions();
	}

	setSize(width: number, height: number, renderScale: number = 1) {
		const rtWidth = Math.round(width * renderScale);
		const rtHeight = Math.round(height * renderScale);

		if (this.canvas) {
			this.canvas.width = rtWidth;
			this.canvas.height = rtHeight;
		}

		if (
			rtWidth === this.rtt.width &&
			rtHeight === this.rtt.height &&
			width === this.camera.right &&
			height === this.camera.top
		)
			return;

		this.rtt.setSize(rtWidth, rtHeight);
		this.camera.bottom = 0;
		this.camera.left = 0;
		this.camera.right = width;
		this.camera.top = height;

		this.camera.updateProjectionMatrix();
		this.stale = true;
	}

	setRects(rects: RectLike[]) {
		const mat4 = new Three.Matrix4().identity();
		const count = Math.min(rects.length, kMaxRects);

		if (rects.length > kMaxRects && emit_max_rects_warning) {
			emit_max_rects_warning = false;
			console.warn(`Exceeded ${kMaxRects} rects. Some will not be rendered in map bakes!`);
		}

		const withBounds = (x: number, y: number, w: number, h: number) => {
			// prettier-ignore
			mat4.set(
				w, 0, 0, x,
				0, h, 0, y,
				0, 0, 1, 0,
				0, 0, 0, 1,
			);
		};

		this.rectMesh.count = count;
		for (let i = 0; i < count; i++) {
			const r = rects[i];
			withBounds(r.min_x, r.min_y, r.max_x - r.min_x, r.max_y - r.min_y);
			this.rectMesh.setMatrixAt(i, mat4);
		}

		this.rectMesh.instanceMatrix.needsUpdate = true;
		this.stale = true;
	}
}
