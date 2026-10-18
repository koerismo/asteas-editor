import * as Three from 'three';

import type { EditorState, ViewportMaps } from '$lib/core/context.svelte.js';
import type { RectEntry } from '$lib/core/file.js';

import { Viewport } from '../viewport_shared.js';
import { ModelHotspotter } from './mesh.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import Cube1 from '$lib/assets/meshes/cube2.glb?url';
import { on } from 'svelte/events';
import { Button } from '../mouse.js';

import { makeSubscriber } from '$lib/core/history/reactive.js';

export class PreviewViewport extends Viewport<Three.PerspectiveCamera> {
	zoom: number = 1.0;
	orbit: Three.Object3D;
	mesh?: Three.Mesh = $state.raw();

	#refitSubscriber = makeSubscriber();

	hotspotter?: ModelHotspotter;
	size?: Three.Vector2Tuple;

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
					// console.log('Scale:', state.viewport.meshScale3d);
					const scale = state.viewport.meshScale3d;
					this.hotspotter?.setScale(scale);
					this.#refitSubscriber.update();
				});

				$effect(() => {
					if (!state.document) return;
					console.log('Refitting...');
					this.refit(state.document.rects);
				});

				$effect(() => {
					if (!state.document) return;
					this.updateMaps(state.viewport.mapCache);
					this.updateSize(state.document.width, state.document.height);
				});
			}),
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

	updateSize(width: number, height: number) {
		if (this.size && this.size[0] === width && this.size[1] === height) return;

		this.size = [width, height];
		this.#refitSubscriber.update();
	}

	updateMaps(maps: ViewportMaps) {
		if (!this.mesh) return;
		const material = this.mesh.material as Three.MeshStandardMaterial;

		// TODO: Make sure this is getting freed somehow to avoid texture data memleak
		material.map = maps.color?.clone() ?? null;

		if (material.map) {
			material.map.magFilter = Three.LinearFilter;
		}

		material.normalMap = maps.normal ?? null;

		if (material.normalMap) {
			material.normalMap.magFilter = Three.LinearFilter;
		}

		material.normalScale.set(1, this.state.viewport.useDxNormals3d ? 1 : -1);
		material.needsUpdate = true;

		this.#refitSubscriber.update();
	}

	refit(rects: RectEntry[]) {
		this.#refitSubscriber.use();

		if (!this.hotspotter || !this.mesh || !this.size) return;

		this.hotspotter.setRects(rects);
		this.hotspotter.setSize(...this.size);
		this.hotspotter.fit(this.mesh.geometry.getAttribute('uv'));
	}

	setup() {
		const loader = new GLTFLoader();
		loader.load(Cube1, (group) => {
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

			this.#refitSubscriber.update();
		});

		super.setup();
	}
}
