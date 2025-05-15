/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as THREE from 'three';

// Removed iwer, DevUI, GamepadWrapper, OrbitControls for PoC simplicity
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

export async function init(setupScene = () => {}, onFrame = () => {}) {
	const container = document.createElement('div');
	document.body.appendChild(container);

	const scene = new THREE.Scene();
	// A light gray background is less stark than black for initial viewing
	scene.background = new THREE.Color(0x444444); 

	const camera = new THREE.PerspectiveCamera(
		50, // Field of View
		window.innerWidth / window.innerHeight, // Aspect Ratio
		0.1, // Near clipping plane
		100, // Far clipping plane (adjust as needed for Kùzu graph scale)
	);
	// Default camera position, user will move in VR
	camera.position.set(0, 1.6, 0.5); // Slightly in front of origin, at typical eye height

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.xr.enabled = true;
	container.appendChild(renderer.domElement);

	// Basic environment lighting
	const environment = new RoomEnvironment(renderer);
	const pmremGenerator = new THREE.PMREMGenerator(renderer);
	scene.environment = pmremGenerator.fromScene(environment).texture;
	pmremGenerator.dispose(); // Dispose of PMREMGenerator after use
	environment.dispose(); // Dispose of RoomEnvironment after use


	// Player group to move camera and controllers together
	const player = new THREE.Group();
	scene.add(player);
	player.add(camera); // Attach camera to player group

	// Basic controller setup
	const controllerModelFactory = new XRControllerModelFactory();
	const controllers = {
		left: null,
		right: null,
	};

	// Setup for controller 0 (typically left)
	const controllerGrip0 = renderer.xr.getControllerGrip(0);
	controllerGrip0.add(controllerModelFactory.createControllerModel(controllerGrip0));
	player.add(controllerGrip0);
	renderer.xr.getController(0).addEventListener('connected', (event) => {
		controllers.left = { grip: controllerGrip0, gamepad: event.data.gamepad }; 
		// We can add more specific controller setup here if needed later
	});
	renderer.xr.getController(0).addEventListener('disconnected', () => {
		controllers.left = null;
	});

	// Setup for controller 1 (typically right)
	const controllerGrip1 = renderer.xr.getControllerGrip(1);
	controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
	player.add(controllerGrip1);
	renderer.xr.getController(1).addEventListener('connected', (event) => {
		controllers.right = { grip: controllerGrip1, gamepad: event.data.gamepad };
		// We can add more specific controller setup here if needed later
	});
	renderer.xr.getController(1).addEventListener('disconnected', () => {
		controllers.right = null;
	});

	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	window.addEventListener('resize', onWindowResize);

	const globals = {
		scene,
		camera,
		renderer,
		player,
		controllers,
	};

	// Call the user-provided setup function
	setupScene(globals);

	const clock = new THREE.Clock();
	function animate() {
		const delta = clock.getDelta();
		const time = clock.getElapsedTime();
		
		// Call user-provided frame update function
		onFrame(delta, time, globals);

		// Render the scene
		renderer.render(scene, camera);
	}

	// Start the animation loop
	renderer.setAnimationLoop(animate);

	// Add VR button to the DOM
	document.body.appendChild(VRButton.createButton(renderer));
}
