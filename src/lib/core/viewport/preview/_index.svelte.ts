import * as Three from 'three';

import type { EditorState } from '$lib/core/context.svelte.js';
import type { RectEntry } from '$lib/core/file.js';

import { Viewport } from '../viewport_shared.js';
import { ModelHotspotter } from './mesh.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Cube1 from '$lib/assets/meshes/cube2.glb?url';
import { on } from 'svelte/events';
import { Button } from '../mouse.js';

export class PreviewViewport extends Viewport<Three.PerspectiveCamera> {
	zoom: number = 1.0;
	hotspotter?: ModelHotspotter;
	mesh?: Three.Mesh;
	texture?: Three.Texture;
	orbit: Three.Object3D;

	constructor(
			public canvas: HTMLCanvasElement,
			public state: EditorState,
		) {
		super(
			canvas,
			new Three.WebGLRenderer({ antialias: true, canvas }),
			new Three.PerspectiveCamera(40),
			new Three.Scene(),
		);

		this.orbit = new Three.Object3D();
		this.scene.add(this.orbit);
		this.orbit.add(this.camera);

		this.camera.position.set(0, 0, 5);
		this.orbit.rotation.order = 'YXZ';

		const lightDirectional = new Three.DirectionalLight(0xffffff, 2.0);
		lightDirectional.position.set(-3, 1, 1);
		this.orbit.add(lightDirectional);

		const lightDirectional2 = new Three.DirectionalLight(0xffffff, 1.0);
		lightDirectional2.position.set(3, -1, -2);
		this.orbit.add(lightDirectional2);

		const lightAmbient = new Three.AmbientLight(0xffffff, 0.8);
		this.scene.add(lightAmbient);

		this.scene.background = new Three.Color(0x111111);
		this.disposables.push(
			$effect.root(() => {
				$effect(() => {
					this.hotspotter?.setScale(state.viewport.meshScale3d);
					this.refit(state.document?.rects ?? []);
				});
				$effect(() => {
					this.updateMaps();
				});
			})
		);

		this.disposables.push(on(this.canvas, 'mousemove', this.onMouseMove.bind(this)));
		this.disposables.push(on(this.canvas, 'wheel', this.onWheel.bind(this)));

		// Begin render loop!
		this.setup();
	}

	onMouseMove(event: MouseEvent) {
		if (event.buttons !== Button.Left) return;
		this.orbit.rotation.x -= event.movementY * 0.01;
		this.orbit.rotation.y -= event.movementX * 0.01;
	}
	
	onWheel(event: WheelEvent) {
		this.camera.position.z += event.deltaY * 0.01;
	}
	
	updateCamera() {
		this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
		this.camera.updateProjectionMatrix();
	}

	// async setImage(image?: VImageEither) {
	// 	if (!image) return this.setTexture();
	// 	const v = await new VTextureLoader().parseImage(image);
	// 	this.setTexture(v);
	// }

	updateMaps() {
		const maps = this.state.viewport.maps;
		this.texture = maps.color;
		const normal = maps.normal;

		if (!this.mesh) return;
		const material = this.mesh.material as Three.MeshStandardMaterial;
		
		// TODO: This is miserable
		material.map = this.texture?.clone() ?? null;
		if (material.map) {
			material.map.magFilter = Three.LinearFilter;
		}

		// TODO: stop cloning this fucking image???
		material.normalMap = normal?.clone() ?? null;

		if (material.normalMap)
			material.normalMap.flipY = true;

		material.normalScale.set(1, 1);
		material.needsUpdate = true;
	}

	refit(rects: RectEntry[]) {
		if (!this.hotspotter || !this.mesh || !this.texture) return;
		this.hotspotter.setRects(rects);
		this.hotspotter.setSize(this.texture.width, this.texture.height)
		this.hotspotter.fit(
			this.mesh.geometry.getAttribute('uv')
		);
	}

	setup() {
		const loader = new GLTFLoader();
		loader.load(Cube1, group => {
			if (this.disposed) return;

			this.mesh = group.scene.children[0] as Three.Mesh;
			const material = this.mesh.material as Three.MeshStandardMaterial;
			
			if (material.isMeshStandardMaterial) {
				if (material.aoMap) {
					material.aoMap.colorSpace = Three.SRGBColorSpace;
					material.aoMapIntensity = 1.2;
				}
			}
	
			this.hotspotter = new ModelHotspotter(this.mesh.geometry);
			this.scene.add(this.mesh);
			this.updateMaps();
	
		});
	}
}