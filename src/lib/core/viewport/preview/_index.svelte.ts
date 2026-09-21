import * as Three from 'three';
import type { VImageEither } from 'vtf-js';

import type { EditorState } from '$lib/core/context.svelte.js';
import type { RectEntry } from '$lib/core/file.js';

import { Viewport } from '../renderer.js';
import { ModelHotspotter } from './mesh.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Cube1 from '$lib/assets/meshes/cyl1.glb?url';
import { VTextureLoader } from '../vtex_loader.js';

export class PreviewViewport extends Viewport<Three.PerspectiveCamera> {
	zoom: number = 1.0;
	hotspotter?: ModelHotspotter;
	mesh?: Three.Mesh;
	texture?: Three.Texture;

	constructor(
			public canvas: HTMLCanvasElement,
			public state: EditorState
		) {
		super(
			canvas,
			new Three.WebGLRenderer({ antialias: true, canvas }),
			new Three.PerspectiveCamera(40),
			new Three.Scene(),
		);

		// this.camera.rotation.order
		this.camera.position.z = 5;
		this.camera.position.x = 3;
		this.camera.position.y = 4;
		this.camera.lookAt(0, 0, 0);

		this.scene.background = new Three.Color(0x111111);

		this.init().then(() => {
			this.start();
		});

		this.disposables.push(
			$effect.root(() => {
				$effect(() => {
					this.refit(this.state.rects ?? []);
				});
				$effect(() => {
					this.setImage(this.state.image);
				});
			})
		);
	}

	updateCamera() {
		this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
		this.camera.updateProjectionMatrix();
	}

	async setImage(image?: VImageEither) {
		if (!image) return this.setTexture();
		const v = await new VTextureLoader().parseImage(image);
		this.setTexture(v);
	}

	setTexture(v?: Three.Texture) {
		this.texture = v;
		this.updateMaterial();
	}

	updateMaterial() {
		if (!this.mesh || !this.texture) return;
		// @ts-expect-error bwehhhh
		this.mesh.material.map = this.texture;
	}

	refit(rects: RectEntry[]) {
		if (!this.hotspotter || !this.mesh || !this.texture) return;
		this.hotspotter.setRects(rects);
		this.hotspotter.setSize(this.texture.width, this.texture.height)
		this.hotspotter.fit(
			this.mesh!.geometry.getAttribute('uv2')!,
			this.mesh!.geometry.getAttribute('uv')!,
		);
	}

	async init() {
		const group = await new GLTFLoader().loadAsync(Cube1);
		// console.log(group);

		this.mesh = group.scene.children[0] as Three.Mesh;
		const mbm = this.mesh.material as Three.MeshStandardMaterial;
		mbm.aoMap!.colorSpace = Three.SRGBColorSpace;
		mbm.aoMapIntensity = 1.2;
		// this.mesh.material.aoMap = this.mesh.material.map;
		this.hotspotter = new ModelHotspotter(this.mesh.geometry);

		this.scene.add(new Three.AmbientLight(0xffffff, 3.0));
		this.scene.add(this.mesh);

		const geo = this.mesh.geometry;
		const uvSrc = geo.getAttribute('uv')!;
		geo.setAttribute('uv2', uvSrc.clone());
		this.updateMaterial();

		// this.mesh.scale.set(32, 32, 32);
		// this.mesh.material.side = Three.BackSide;
	}
}